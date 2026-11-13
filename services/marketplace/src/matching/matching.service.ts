import {
  distanceKm,
  type FamilySwipeInput,
  KIND_SPECIALTIES,
  type MatchSummary,
  PROJECT_KINDS,
  type ProjectCard,
  type SpecialistCard,
  type SpecialistSwipeInput,
  type SwipeResult,
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
import { type Database, DB } from '../database.js';
import { ProjectService, toProjectCard } from '../project/project.service.js';
import { rankSpecialist, specialistLevel, withNewcomerSlot } from '../ranking.js';
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

type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];

function familyInvited(projectId: SQL | string, specialistId: SQL | string): SQL<boolean> {
  return sql<boolean>`exists (
    select 1 from ${swipes}
    where ${swipes.projectId} = ${projectId}
      and ${swipes.specialistId} = ${specialistId}
      and ${swipes.actor} = 'family'
      and ${swipes.decision} = 'like'
  )`;
}

function coveredKinds(specialties: string[]): (typeof PROJECT_KINDS)[number][] {
  return PROJECT_KINDS.filter((kind) =>
    KIND_SPECIALTIES[kind].some((specialty) => specialties.includes(specialty)),
  );
}

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
    return withNewcomerSlot(cards.sort((a, b) => (b.affinity ?? 0) - (a.affinity ?? 0))).slice(
      0,
      PAGE_SIZE,
    );
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
    const [me] = await this.db
      .select({ profile: profiles, specialties: specialistDetails.specialties })
      .from(profiles)
      .innerJoin(specialistDetails, eq(specialistDetails.userId, profiles.userId))
      .where(eq(profiles.userId, specialistId));
    if (!me) {
      throw new ConflictException('Completa tu perfil para ver obras cerca de ti');
    }
    const kinds = coveredKinds(me.specialties);
    const distance = distanceExpression(
      me.profile.latitude,
      me.profile.longitude,
      sql`${projects.latitude}`,
      sql`${projects.longitude}`,
    );
    const invited = familyInvited(sql`${projects.id}`, specialistId);
    const matchesSpecialty =
      kinds.length > 0 ? sql<boolean>`(${inArray(projects.kind, kinds)})` : sql<boolean>`false`;
    const highlighted = sql<boolean>`coalesce(${projects.highlightedUntil} > now(), false)`;
    const rows = await this.db
      .select({
        project: projects,
        familyName: profiles.displayName,
        distance,
        invited,
        matchesSpecialty,
      })
      .from(projects)
      .innerJoin(profiles, eq(profiles.userId, projects.familyId))
      .where(
        and(
          eq(projects.status, 'open'),
          or(sql`${distance} <= ${me.profile.radiusKm}`, invited),
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
      .orderBy(
        desc(invited),
        desc(matchesSpecialty),
        desc(highlighted),
        distance,
        desc(projects.createdAt),
      )
      .limit(PAGE_SIZE);
    const reputations = await this.reputation.summaries(rows.map((row) => row.project.familyId));
    return rows.map((row) => {
      const reputation = reputations.get(row.project.familyId);
      return toProjectCard(row.project, row.familyName, {
        distanceKm: Math.round(row.distance * ROUND_DISTANCE) / ROUND_DISTANCE,
        invited: row.invited,
        matchesSpecialty: row.matchesSpecialty,
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
      if (input.decision === 'like') {
        await this.assertWithinReach(tx, project, specialistId);
      }
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
      .select({
        match: matches,
        project: projects,
        family,
        specialist,
        invited: familyInvited(sql`${matches.projectId}`, sql`${matches.specialistId}`),
      })
      .from(matches)
      .innerJoin(projects, eq(projects.id, matches.projectId))
      .innerJoin(family, eq(family.userId, matches.familyId))
      .innerJoin(specialist, eq(specialist.userId, matches.specialistId))
      .where(condition)
      .orderBy(desc(matches.createdAt));
    return rows.map((row) => {
      const viewerIsFamily = viewerId === row.match.familyId;
      const contactShared = viewerIsFamily || row.invited;
      return {
        id: row.match.id,
        projectId: row.project.id,
        projectTitle: row.project.title,
        budgetMinCents: row.project.budgetMinCents,
        budgetMaxCents: row.project.budgetMaxCents,
        specialistId: row.match.specialistId,
        specialistName: row.specialist.displayName,
        familyId: row.match.familyId,
        familyName: row.family.displayName,
        contactShared,
        counterpartPhone: viewerIsFamily
          ? row.specialist.phone
          : contactShared
            ? row.family.phone
            : null,
        address: contactShared ? row.family.address : null,
        reference: contactShared ? row.family.reference : null,
        district: row.family.district,
        createdAt: row.match.createdAt.toISOString(),
      };
    });
  }

  private async assertWithinReach(
    tx: Transaction,
    project: typeof projects.$inferSelect,
    specialistId: string,
  ): Promise<void> {
    const [me] = await tx.select().from(profiles).where(eq(profiles.userId, specialistId));
    if (!me) {
      throw new ConflictException('Completa tu perfil para cotizar');
    }
    if (distanceKm(me, project) <= me.radiusKm) {
      return;
    }
    const [invitation] = await tx
      .select({ one: sql`1` })
      .from(swipes)
      .where(familyInvited(project.id, specialistId));
    if (!invitation) {
      throw new ForbiddenException('Esta obra está fuera de tu zona de trabajo');
    }
  }

  private async lockOpenProject(
    tx: Transaction,
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
    tx: Transaction,
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
    if (actor === 'specialist') {
      await tx
        .insert(matches)
        .values({ projectId: project.id, specialistId, familyId: project.familyId })
        .onConflictDoNothing();
    }
    const [match] = await tx
      .select({ id: matches.id })
      .from(matches)
      .where(and(eq(matches.projectId, project.id), eq(matches.specialistId, specialistId)));
    return { matched: Boolean(match), matchId: match?.id ?? null };
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
      const items = portfolio.filter((item) => item.specialistId === details.userId);
      const signals = {
        specialties: details.specialties,
        rating,
        reviewCount: reputation?.reviewCount ?? 0,
        completedJobs: details.completedJobs,
        yearsExperience: details.yearsExperience,
        verified: details.verified,
        credential: details.credential,
        portfolioCount: items.length,
        pro: isProActive(details),
      };
      const ranking =
        project && distance !== null
          ? rankSpecialist(signals, {
              projectKind: project.kind,
              distanceKm: distance,
              radiusKm: project.radiusKm,
            })
          : null;
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
        credential: details.credential,
        yearsExperience: details.yearsExperience,
        verified: details.verified,
        pro: isProActive(details),
        demo: details.demo,
        level: specialistLevel(signals),
        affinity: ranking?.score ?? null,
        reasons: ranking?.reasons ?? [],
        rating,
        reviewCount: signals.reviewCount,
        completedJobs: details.completedJobs,
        portfolio: items.map((item) => ({ id: item.id, url: item.url, caption: item.caption })),
      };
    });
  }
}
