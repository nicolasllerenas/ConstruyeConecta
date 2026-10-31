import {
  type CreateQuoteInput,
  FREE_PLAN_MONTHLY_QUOTES,
  type QuoteVersionInput,
  type QuoteVersionView,
  type QuoteView,
  quoteTotalCents,
} from '@cc/contracts';
import { isUniqueViolation, ServiceClient } from '@cc/platform';
import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, count, desc, eq, gte, inArray, ne, sql } from 'drizzle-orm';
import { type Database, DB } from '../database.js';
import { contractStages, contracts, quotes, quoteVersions } from '../schema.js';

interface InternalMatch {
  id: string;
  projectId: string;
  projectTitle: string;
  projectStatus: 'open' | 'contracted' | 'closed';
  familyId: string;
  specialistId: string;
  specialistPro: boolean;
}

function toVersionView(version: typeof quoteVersions.$inferSelect): QuoteVersionView {
  return {
    id: version.id,
    version: version.version,
    materialsCents: version.materialsCents,
    laborCents: version.laborCents,
    permitsCents: version.permitsCents,
    extrasCents: version.extrasCents,
    totalCents: quoteTotalCents(version),
    durationWeeks: version.durationWeeks,
    scope: version.scope,
    changeNote: version.changeNote,
    stages: version.stages.map((stage, index) => ({
      ...stage,
      id: `${version.id}:${index}`,
    })),
    createdAt: version.createdAt.toISOString(),
  };
}

@Injectable()
export class QuotesService {
  constructor(
    @Inject(DB) private readonly db: Database,
    @Inject(ServiceClient) private readonly services: ServiceClient,
  ) {}

  async create(specialistId: string, input: CreateQuoteInput): Promise<QuoteView> {
    const match = await this.services.get<InternalMatch>(
      'marketplace',
      `/internal/matches/${input.matchId}`,
    );
    if (match.specialistId !== specialistId) {
      throw new ForbiddenException();
    }
    if (match.projectStatus !== 'open') {
      throw new ConflictException('Esta obra ya no recibe cotizaciones');
    }
    if (!match.specialistPro) {
      await this.assertFreePlanAllowance(specialistId);
    }
    try {
      const quoteId = await this.db.transaction(async (tx) => {
        const [quote] = await tx
          .insert(quotes)
          .values({
            matchId: match.id,
            projectId: match.projectId,
            projectTitle: match.projectTitle,
            familyId: match.familyId,
            specialistId,
          })
          .returning({ id: quotes.id });
        const id = (quote as { id: string }).id;
        await tx.insert(quoteVersions).values({ quoteId: id, version: 1, ...input.version });
        return id;
      });
      return this.getForUser(specialistId, quoteId);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException('Ya enviaste una cotización para esta obra');
      }
      throw error;
    }
  }

  async revise(
    specialistId: string,
    quoteId: string,
    input: QuoteVersionInput,
  ): Promise<QuoteView> {
    await this.db.transaction(async (tx) => {
      const [quote] = await tx.select().from(quotes).where(eq(quotes.id, quoteId)).for('update');
      if (!quote || quote.specialistId !== specialistId) {
        throw new NotFoundException('Cotización no encontrada');
      }
      if (quote.status === 'selected' || quote.status === 'rejected') {
        throw new ConflictException('Esta cotización ya no se puede modificar');
      }
      const version = quote.currentVersion + 1;
      await tx.insert(quoteVersions).values({ quoteId, version, ...input });
      await tx
        .update(quotes)
        .set({ currentVersion: version, status: 'submitted', adjustmentMessage: null })
        .where(eq(quotes.id, quoteId));
    });
    return this.getForUser(specialistId, quoteId);
  }

  async requestAdjustment(familyId: string, quoteId: string, message: string): Promise<QuoteView> {
    const [updated] = await this.db
      .update(quotes)
      .set({ status: 'adjustment_requested', adjustmentMessage: message })
      .where(
        and(eq(quotes.id, quoteId), eq(quotes.familyId, familyId), eq(quotes.status, 'submitted')),
      )
      .returning({ id: quotes.id });
    if (!updated) {
      throw new ConflictException('No se puede pedir un ajuste a esta cotización');
    }
    return this.getForUser(familyId, quoteId);
  }

  async select(familyId: string, quoteId: string): Promise<{ contractId: string }> {
    try {
      const contractId = await this.db.transaction(async (tx) => {
        const [quote] = await tx.select().from(quotes).where(eq(quotes.id, quoteId)).for('update');
        if (!quote || quote.familyId !== familyId) {
          throw new NotFoundException('Cotización no encontrada');
        }
        if (quote.status !== 'submitted') {
          throw new ConflictException('Esta cotización no se puede elegir en su estado actual');
        }
        const [version] = await tx
          .select()
          .from(quoteVersions)
          .where(
            and(
              eq(quoteVersions.quoteId, quoteId),
              eq(quoteVersions.version, quote.currentVersion),
            ),
          );
        if (!version) {
          throw new NotFoundException('Cotización no encontrada');
        }
        const [contract] = await tx
          .insert(contracts)
          .values({
            quoteId,
            projectId: quote.projectId,
            projectTitle: quote.projectTitle,
            familyId: quote.familyId,
            specialistId: quote.specialistId,
            totalCents: quoteTotalCents(version),
            durationWeeks: version.durationWeeks,
          })
          .returning({ id: contracts.id });
        const id = (contract as { id: string }).id;
        await tx.insert(contractStages).values(
          version.stages.map((stage, index) => ({
            contractId: id,
            position: index,
            name: stage.name,
            weekFrom: stage.weekFrom,
            weekTo: stage.weekTo,
            amountCents: stage.amountCents,
            status: index === 0 ? ('in_progress' as const) : ('pending' as const),
          })),
        );
        await tx.update(quotes).set({ status: 'selected' }).where(eq(quotes.id, quoteId));
        await tx
          .update(quotes)
          .set({ status: 'rejected' })
          .where(and(eq(quotes.projectId, quote.projectId), ne(quotes.id, quoteId)));
        await this.services.post(
          'marketplace',
          `/internal/projects/${quote.projectId}/contracted`,
          {},
        );
        return id;
      });
      return { contractId };
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException('Esta obra ya tiene una cotización elegida');
      }
      throw error;
    }
  }

  async listForProject(familyId: string, projectId: string): Promise<QuoteView[]> {
    const rows = await this.db
      .select()
      .from(quotes)
      .where(and(eq(quotes.projectId, projectId), eq(quotes.familyId, familyId)))
      .orderBy(desc(quotes.createdAt));
    return this.toViews(rows);
  }

  async listForSpecialist(specialistId: string): Promise<QuoteView[]> {
    const rows = await this.db
      .select()
      .from(quotes)
      .where(eq(quotes.specialistId, specialistId))
      .orderBy(desc(quotes.createdAt));
    return this.toViews(rows);
  }

  async getForUser(userId: string, quoteId: string): Promise<QuoteView> {
    const [quote] = await this.db.select().from(quotes).where(eq(quotes.id, quoteId));
    if (!quote || (quote.familyId !== userId && quote.specialistId !== userId)) {
      throw new NotFoundException('Cotización no encontrada');
    }
    const [view] = await this.toViews([quote]);
    return view as QuoteView;
  }

  private async assertFreePlanAllowance(specialistId: string): Promise<void> {
    const [usage] = await this.db
      .select({ total: count() })
      .from(quotes)
      .where(
        and(
          eq(quotes.specialistId, specialistId),
          gte(quotes.createdAt, sql`date_trunc('month', now())`),
        ),
      );
    if ((usage?.total ?? 0) >= FREE_PLAN_MONTHLY_QUOTES) {
      throw new ForbiddenException(
        `El plan Básico incluye ${FREE_PLAN_MONTHLY_QUOTES} cotizaciones al mes. Activa Pro para enviar más.`,
      );
    }
  }

  private async toViews(rows: (typeof quotes.$inferSelect)[]): Promise<QuoteView[]> {
    if (rows.length === 0) {
      return [];
    }
    const ids = rows.map((row) => row.id);
    const [versions, linked] = await Promise.all([
      this.db.select().from(quoteVersions).where(inArray(quoteVersions.quoteId, ids)),
      this.db
        .select({ id: contracts.id, quoteId: contracts.quoteId })
        .from(contracts)
        .where(inArray(contracts.quoteId, ids)),
    ]);
    return rows.map((row) => {
      const own = versions.filter((version) => version.quoteId === row.id);
      const current = own.find((version) => version.version === row.currentVersion);
      const previous = own.find((version) => version.version === row.currentVersion - 1);
      return {
        id: row.id,
        matchId: row.matchId,
        projectId: row.projectId,
        projectTitle: row.projectTitle,
        familyId: row.familyId,
        specialistId: row.specialistId,
        status: row.status,
        adjustmentMessage: row.adjustmentMessage,
        current: toVersionView(current as typeof quoteVersions.$inferSelect),
        previousTotalCents: previous ? quoteTotalCents(previous) : null,
        contractId: linked.find((contract) => contract.quoteId === row.id)?.id ?? null,
      };
    });
  }
}
