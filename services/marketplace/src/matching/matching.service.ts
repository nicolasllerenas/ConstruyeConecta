import type {
  FamilySwipeInput,
  MatchSummary,
  ProjectCard,
  SpecialistCard,
  SpecialistSwipeInput,
  SwipeResult,
} from '@cc/contracts';
import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq, inArray, notExists, or, type SQL, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { calculateAffinity } from '../affinity.js';
import { type Database, DB } from '../database.js';
import { ProjectService, toProjectCard } from '../project/project.service.js';
import { ReputationClient } from '../reputation.client.js';
import {
  matches,
  portfolioItems,
  profiles,
  projects,
  specialistDetails,
  swipes,
} from '../schema.js';

const CANDIDATE_POOL = 60;
const PAGE_SIZE = 20;
const ROUND_DISTANCE = 10;

function distanceExpression(
  latitude: number | SQL,
  longitude: number | SQL,
  otherLatitude: SQL | typeof profiles.latitude,
  otherLongitude: SQL | typeof profiles.longitude,
): SQL<number> {
  return sql<number>`6371 * acos(least(1, cos(radians(${latitude})) * cos(radians(${otherLatitude})) * cos(radians(${otherLongitude}) - radians(${longitude})) + sin(radians(${latitude})) * sin(radians(${otherLatitude}))))`;
}

function isProActive(details: typeof specialistDetails.$inferSelect): boolean {
  return details.plan === 'pro' && (details.planExpiresAt?.getTime() ?? 0) > Date.now();
}

@Injectable()
export class MatchingService {
  constructor(
    @Inject(DB) private readonly db: Database,
    @Inject(ProjectService) private readonly projectService: ProjectService,
    @Inject(ReputationClient) private readonly reputation: ReputationClient,
  ) {}

  async candidates(familyId: string, projectId: string): Promise<SpecialistCard[]> {
    const project = await this.projectService.getOwned(familyId, projectId);
    const distance = distanceExpression(
      project.latitude,
      project.longitude,
      profiles.latitude,
      profiles.longitude,
    );
    const rows = await this.db
      .select({ profile: profiles, details: specialistDetails, distance })
      .from(specialistDetails)
      .innerJoin(profiles, eq(profiles.userId, specialistDetails.userId))
      .where(
        and(
          sql`${distance} <= ${project.radiusKm}`,
          notExists(
            this.db
              .select({ one: sql`1` })
              .from(swipes)
              .where(
                and(
                  eq(swipes.projectId, projectId),
                  eq(swipes.specialistId, specialistDetails.userId),
                  eq(swipes.actor, 'family'),
                ),
              ),
          ),
        ),
      )
      .orderBy(distance)
      .limit(CANDIDATE_POOL);

    const cards = await this.buildCards(rows, {
      kind: project.kind,
      radiusKm: project.radiusKm,
    });
    return cards
      .sort((a, b) => Number(b.pro) - Number(a.pro) || (b.affinity ?? 0) - (a.affinity ?? 0))
      .slice(0, PAGE_SIZE);
  }

  async specialistsByIds(ids: string[]): Promise<SpecialistCard[]> {
    if (ids.length === 0) {
      return [];
    }
    const rows = await this.db
      .select({ profile: profiles, details: specialistDetails })
      .from(specialistDetails)
      .innerJoin(profiles, eq(profiles.userId, specialistDetails.userId))
      .where(inArray(specialistDetails.userId, ids));
    return this.buildCards(rows.map((row) => ({ ...row, distance: null })));
  }

  async feed(specialistId: string): Promise<ProjectCard[]> {
    const [me] = await this.db.select().from(profiles).where(eq(profiles.userId, specialistId));
    if (!me) {
      throw new ConflictException('Completa tu perfil para ver obras cerca de ti');
    }
    const distance = distanceExpression(
      me.latitude,
      me.longitude,
      sql`${projects.latitude}`,
      sql`${projects.longitude}`,
    );
    const invited = sql<boolean>`exists (
      select 1 from ${swipes}
      where ${swipes.projectId} = ${projects.id}
        and ${swipes.specialistId} = ${specialistId}
        and ${swipes.actor} = 'family'
        and ${swipes.decision} = 'like'
    )`;
    const highlighted = sql<boolean>`coalesce(${projects.highlightedUntil} > now(), false)`;
    const rows = await this.db
      .select({ project: projects, familyName: profiles.displayName, distance, invited })
      .from(projects)
      .innerJoin(profiles, eq(profiles.userId, projects.familyId))
      .where(
        and(
          eq(projects.status, 'open'),
          or(sql`${distance} <= ${me.radiusKm}`, invited),
          notExists(
            this.db
              .select({ one: sql`1` })
              .from(swipes)
              .where(
                and(
                  eq(swipes.projectId, projects.id),
                  eq(swipes.specialistId, specialistId),
                  eq(swipes.actor, 'specialist'),
                ),
              ),
          ),
        ),
      )
      .orderBy(desc(invited), desc(highlighted), distance, desc(projects.createdAt))
      .limit(PAGE_SIZE);
    const reputations = await this.reputation.summaries(rows.map((row) => row.project.familyId));
    return rows.map((row) => {
      const reputation = reputations.get(row.project.familyId);
      return toProjectCard(row.project, row.familyName, {
        distanceKm: Math.round(row.distance * ROUND_DISTANCE) / ROUND_DISTANCE,
        invited: row.invited,
        familyRating: reputation?.rating ?? null,
        familyReviewCount: reputation?.reviewCount ?? 0,
      });
    });
  }

  async swipeAsFamily(familyId: string, input: FamilySwipeInput): Promise<SwipeResult> {
    return this.db.transaction(async (tx) => {
      const project = await this.lockOpenProject(tx, input.projectId);
      if (project.familyId !== familyId) {
        throw new ForbiddenException();
      }
      const [specialist] = await tx
        .select({ id: specialistDetails.userId })
        .from(specialistDetails)
        .where(eq(specialistDetails.userId, input.specialistId));
      if (!specialist) {
        throw new NotFoundException('Especialista no encontrado');
      }
      return this.recordSwipe(tx, project, input.specialistId, 'family', input.decision);
    });
  }

  async swipeAsSpecialist(specialistId: string, input: SpecialistSwipeInput): Promise<SwipeResult> {
    return this.db.transaction(async (tx) => {
      const project = await this.lockOpenProject(tx, input.projectId);
      return this.recordSwipe(tx, project, specialistId, 'specialist', input.decision);
    });
  }

  async listMatches(userId: string): Promise<MatchSummary[]> {
    return this.queryMatches(
      or(eq(matches.familyId, userId), eq(matches.specialistId, userId)),
      userId,
    );
  }

  async getMatch(userId: string, matchId: string): Promise<MatchSummary> {
    const [match] = await this.queryMatches(
      and(
        eq(matches.id, matchId),
        or(eq(matches.familyId, userId), eq(matches.specialistId, userId)),
      ),
      userId,
    );
    if (!match) {
      throw new NotFoundException('Match no encontrado');
    }
    return match;
  }

  private async queryMatches(
    condition: SQL | undefined,
    viewerId: string,
  ): Promise<MatchSummary[]> {
    const family = alias(profiles, 'family');
    const specialist = alias(profiles, 'specialist');
    const rows = await this.db
      .select({ match: matches, project: projects, family, specialist })
      .from(matches)
      .innerJoin(projects, eq(projects.id, matches.projectId))
      .innerJoin(family, eq(family.userId, matches.familyId))
      .innerJoin(specialist, eq(specialist.userId, matches.specialistId))
      .where(condition)
      .orderBy(desc(matches.createdAt));
    return rows.map((row) => ({
      id: row.match.id,
      projectId: row.project.id,
      projectTitle: row.project.title,
      budgetMinCents: row.project.budgetMinCents,
      budgetMaxCents: row.project.budgetMaxCents,
      specialistId: row.match.specialistId,
      specialistName: row.specialist.displayName,
      familyId: row.match.familyId,
      familyName: row.family.displayName,
      counterpartPhone: viewerId === row.match.familyId ? row.specialist.phone : row.family.phone,
      address: row.family.address,
      reference: row.family.reference,
      district: row.family.district,
      createdAt: row.match.createdAt.toISOString(),
    }));
  }

  private async lockOpenProject(
    tx: Parameters<Parameters<Database['transaction']>[0]>[0],
    projectId: string,
  ): Promise<typeof projects.$inferSelect> {
    const [project] = await tx
      .select()
      .from(projects)
      .where(eq(projects.id, projectId))
      .for('update');
    if (!project) {
      throw new NotFoundException('Obra no encontrada');
    }
    if (project.status !== 'open') {
      throw new ConflictException('Esta obra ya no recibe propuestas');
    }
    return project;
  }

  private async recordSwipe(
    tx: Parameters<Parameters<Database['transaction']>[0]>[0],
    project: typeof projects.$inferSelect,
    specialistId: string,
    actor: 'family' | 'specialist',
    decision: 'like' | 'pass',
  ): Promise<SwipeResult> {
    await tx
      .insert(swipes)
      .values({ projectId: project.id, specialistId, actor, decision })
      .onConflictDoUpdate({
        target: [swipes.projectId, swipes.specialistId, swipes.actor],
        set: { decision },
      });
    if (decision === 'pass') {
      return { matched: false, matchId: null };
    }
    const counterpart = actor === 'family' ? 'specialist' : 'family';
    const [reciprocal] = await tx
      .select({ decision: swipes.decision })
      .from(swipes)
      .where(
        and(
          eq(swipes.projectId, project.id),
          eq(swipes.specialistId, specialistId),
          eq(swipes.actor, counterpart),
          eq(swipes.decision, 'like'),
        ),
      );
    if (!reciprocal) {
      return { matched: false, matchId: null };
    }
    await tx
      .insert(matches)
      .values({ projectId: project.id, specialistId, familyId: project.familyId })
      .onConflictDoNothing();
    const [match] = await tx
      .select({ id: matches.id })
      .from(matches)
      .where(and(eq(matches.projectId, project.id), eq(matches.specialistId, specialistId)));
    return { matched: true, matchId: match?.id ?? null };
  }

  private async buildCards(
    rows: {
      profile: typeof profiles.$inferSelect;
      details: typeof specialistDetails.$inferSelect;
      distance: number | null;
    }[],
    project?: { kind: (typeof projects.$inferSelect)['kind']; radiusKm: number },
  ): Promise<SpecialistCard[]> {
    const ids = rows.map((row) => row.details.userId);
    const [reputations, portfolio] = await Promise.all([
      this.reputation.summaries(ids),
      ids.length === 0
        ? Promise.resolve([])
        : this.db
            .select()
            .from(portfolioItems)
            .where(inArray(portfolioItems.specialistId, ids))
            .orderBy(desc(portfolioItems.createdAt)),
    ]);
    return rows.map(({ profile, details, distance }) => {
      const reputation = reputations.get(details.userId);
      const rating = reputation?.rating ?? null;
      return {
        id: details.userId,
        displayName: profile.displayName,
        kind: details.kind,
        bio: details.bio,
        specialties: details.specialties,
        district: profile.district,
        distanceKm:
          distance === null ? null : Math.round(distance * ROUND_DISTANCE) / ROUND_DISTANCE,
        visitFeeCents: details.visitFeeCents,
        availability: details.availability,
        avatarUrl: details.avatarUrl,
        verified: details.verified,
        pro: isProActive(details),
        demo: details.demo,
        affinity:
          project && distance !== null
            ? calculateAffinity({
                projectKind: project.kind,
                specialties: details.specialties,
                distanceKm: distance,
                radiusKm: project.radiusKm,
                rating,
              })
            : null,
        rating,
        reviewCount: reputation?.reviewCount ?? 0,
        completedJobs: details.completedJobs,
        portfolio: portfolio
          .filter((item) => item.specialistId === details.userId)
          .map((item) => ({ id: item.id, url: item.url, caption: item.caption })),
      };
    });
  }
}
