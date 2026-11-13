import type { ContractView, ProgressUpdateInput } from '@cc/contracts';
import { ServiceClient } from '@cc/platform';
import { ConflictException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { and, asc, desc, eq, or } from 'drizzle-orm';
import { type Database, DB } from '../database.js';
import { contractStages, contracts, progressUpdates } from '../schema.js';
import { summarizeLedger } from './ledger.js';

@Injectable()
export class ContractsService {
  private readonly logger = new Logger(ContractsService.name);

  constructor(
    @Inject(DB) private readonly db: Database,
    @Inject(ServiceClient) private readonly services: ServiceClient,
  ) {}

  async listForUser(userId: string): Promise<ContractView[]> {
    const rows = await this.db
      .select()
      .from(contracts)
      .where(or(eq(contracts.familyId, userId), eq(contracts.specialistId, userId)))
      .orderBy(desc(contracts.startedAt));
    return Promise.all(rows.map((row) => this.toView(row)));
  }

  async getForUser(userId: string, contractId: string): Promise<ContractView> {
    return this.toView(await this.findForUser(userId, contractId));
  }

  async participants(contractId: string) {
    const [contract] = await this.db.select().from(contracts).where(eq(contracts.id, contractId));
    if (!contract) {
      throw new NotFoundException('Obra no encontrada');
    }
    return {
      familyId: contract.familyId,
      specialistId: contract.specialistId,
      status: contract.status,
    };
  }

  async addUpdate(
    specialistId: string,
    contractId: string,
    input: ProgressUpdateInput,
  ): Promise<ContractView> {
    const contract = await this.findForSpecialist(specialistId, contractId);
    const [stage] = await this.db
      .select()
      .from(contractStages)
      .where(
        and(
          eq(contractStages.contractId, contractId),
          or(eq(contractStages.status, 'in_progress'), eq(contractStages.status, 'submitted')),
        ),
      );
    if (!stage) {
      throw new ConflictException('La obra no tiene una etapa activa');
    }
    await this.db.insert(progressUpdates).values({
      contractId: contract.id,
      stageId: stage.id,
      authorId: specialistId,
      message: input.message,
      photoUrls: input.photoUrls,
    });
    return this.getForUser(specialistId, contractId);
  }

  async submitStage(
    specialistId: string,
    contractId: string,
    stageId: string,
    input: ProgressUpdateInput,
  ): Promise<ContractView> {
    await this.findForSpecialist(specialistId, contractId);
    await this.db.transaction(async (tx) => {
      const [stage] = await tx
        .update(contractStages)
        .set({ status: 'submitted', rejectionMessage: null })
        .where(
          and(
            eq(contractStages.id, stageId),
            eq(contractStages.contractId, contractId),
            eq(contractStages.status, 'in_progress'),
          ),
        )
        .returning({ id: contractStages.id });
      if (!stage) {
        throw new ConflictException('Esta etapa no está en curso');
      }
      await tx.insert(progressUpdates).values({
        contractId,
        stageId,
        authorId: specialistId,
        message: input.message,
        photoUrls: input.photoUrls,
      });
    });
    return this.getForUser(specialistId, contractId);
  }

  async approveStage(familyId: string, contractId: string, stageId: string): Promise<ContractView> {
    const contract = await this.findForFamily(familyId, contractId);
    const completed = await this.db.transaction(async (tx) => {
      const [stage] = await tx
        .update(contractStages)
        .set({ status: 'approved', approvedAt: new Date() })
        .where(
          and(
            eq(contractStages.id, stageId),
            eq(contractStages.contractId, contractId),
            eq(contractStages.status, 'submitted'),
          ),
        )
        .returning({ position: contractStages.position });
      if (!stage) {
        throw new ConflictException('Esta etapa todavía no está lista para aprobar');
      }
      const [next] = await tx
        .update(contractStages)
        .set({ status: 'in_progress' })
        .where(
          and(
            eq(contractStages.contractId, contractId),
            eq(contractStages.position, stage.position + 1),
          ),
        )
        .returning({ id: contractStages.id });
      if (next) {
        return false;
      }
      await tx
        .update(contracts)
        .set({ status: 'completed', completedAt: new Date() })
        .where(eq(contracts.id, contractId));
      return true;
    });
    if (completed) {
      await this.recordCompletedJob(contract.specialistId);
    }
    return this.getForUser(familyId, contractId);
  }

  async rejectStage(
    familyId: string,
    contractId: string,
    stageId: string,
    message: string,
  ): Promise<ContractView> {
    await this.findForFamily(familyId, contractId);
    const [stage] = await this.db
      .update(contractStages)
      .set({ status: 'in_progress', rejectionMessage: message })
      .where(
        and(
          eq(contractStages.id, stageId),
          eq(contractStages.contractId, contractId),
          eq(contractStages.status, 'submitted'),
        ),
      )
      .returning({ id: contractStages.id });
    if (!stage) {
      throw new ConflictException('Esta etapa no está en revisión');
    }
    return this.getForUser(familyId, contractId);
  }

  private async recordCompletedJob(specialistId: string): Promise<void> {
    try {
      await this.services.post(
        'marketplace',
        `/internal/specialists/${specialistId}/completed-job`,
        {},
      );
    } catch (error) {
      this.logger.error(`Completed job not recorded: ${(error as Error).message}`);
    }
  }

  private async findForUser(userId: string, contractId: string) {
    const [contract] = await this.db
      .select()
      .from(contracts)
      .where(
        and(
          eq(contracts.id, contractId),
          or(eq(contracts.familyId, userId), eq(contracts.specialistId, userId)),
        ),
      );
    if (!contract) {
      throw new NotFoundException('Obra no encontrada');
    }
    return contract;
  }

  private async findForFamily(familyId: string, contractId: string) {
    const contract = await this.findForUser(familyId, contractId);
    if (contract.familyId !== familyId) {
      throw new NotFoundException('Obra no encontrada');
    }
    return contract;
  }

  private async findForSpecialist(specialistId: string, contractId: string) {
    const contract = await this.findForUser(specialistId, contractId);
    if (contract.specialistId !== specialistId) {
      throw new NotFoundException('Obra no encontrada');
    }
    return contract;
  }

  private async toView(contract: typeof contracts.$inferSelect): Promise<ContractView> {
    const [stages, updates] = await Promise.all([
      this.db
        .select()
        .from(contractStages)
        .where(eq(contractStages.contractId, contract.id))
        .orderBy(asc(contractStages.position)),
      this.db
        .select()
        .from(progressUpdates)
        .where(eq(progressUpdates.contractId, contract.id))
        .orderBy(desc(progressUpdates.createdAt)),
    ]);
    return {
      id: contract.id,
      quoteId: contract.quoteId,
      projectId: contract.projectId,
      projectTitle: contract.projectTitle,
      familyId: contract.familyId,
      specialistId: contract.specialistId,
      status: contract.status,
      totalCents: contract.totalCents,
      durationWeeks: contract.durationWeeks,
      startedAt: contract.startedAt.toISOString(),
      completedAt: contract.completedAt?.toISOString() ?? null,
      ...summarizeLedger(stages),
      stages: stages.map((stage) => ({
        id: stage.id,
        position: stage.position,
        name: stage.name,
        weekFrom: stage.weekFrom,
        weekTo: stage.weekTo,
        amountCents: stage.amountCents,
        status: stage.status,
        rejectionMessage: stage.rejectionMessage,
        approvedAt: stage.approvedAt?.toISOString() ?? null,
      })),
      updates: updates.map((update) => ({
        id: update.id,
        stageId: update.stageId,
        authorId: update.authorId,
        message: update.message,
        photoUrls: update.photoUrls,
        createdAt: update.createdAt.toISOString(),
      })),
    };
  }
}
