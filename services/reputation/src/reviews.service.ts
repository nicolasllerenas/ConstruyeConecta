import {
  type ContractReviewState,
  type CreateReviewInput,
  type PublicReview,
  REVIEW_BLIND_WINDOW_DAYS,
  type ReputationSummary,
} from '@cc/contracts';
import { isUniqueViolation, ServiceClient, type UserClaims } from '@cc/platform';
import { ConflictException, ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { and, avg, count, desc, eq, inArray, type SQL, sql } from 'drizzle-orm';
import { type Database, DB } from './database.js';
import { reviews } from './schema.js';

interface ContractParticipants {
  familyId: string;
  specialistId: string;
  status: 'active' | 'completed';
}

function toPublicReview(review: typeof reviews.$inferSelect): PublicReview {
  return {
    id: review.id,
    stars: review.stars,
    tags: review.tags,
    comment: review.comment,
    authorRole: review.authorRole,
    createdAt: review.createdAt.toISOString(),
  };
}

function publishedCondition(): SQL {
  return sql`(
    ${reviews.createdAt} < now() - make_interval(days => ${REVIEW_BLIND_WINDOW_DAYS})
    or exists (
      select 1 from ${reviews} as counterpart
      where counterpart.contract_id = ${reviews.contractId}
        and counterpart.author_id <> ${reviews.authorId}
    )
  )`;
}

@Injectable()
export class ReviewsService {
  constructor(
    @Inject(DB) private readonly db: Database,
    @Inject(ServiceClient) private readonly services: ServiceClient,
  ) {}

  async create(author: UserClaims, input: CreateReviewInput): Promise<PublicReview> {
    const contract = await this.participantContract(author.id, input.contractId);
    if (contract.status !== 'completed') {
      throw new ConflictException('Podrás calificar cuando la obra esté entregada');
    }
    const subjectId = author.id === contract.familyId ? contract.specialistId : contract.familyId;
    try {
      const [review] = await this.db
        .insert(reviews)
        .values({
          contractId: input.contractId,
          authorId: author.id,
          subjectId,
          authorRole: author.role,
          stars: input.stars,
          tags: input.tags,
          comment: input.comment ?? null,
        })
        .returning();
      return toPublicReview(review as typeof reviews.$inferSelect);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException('Ya calificaste esta obra');
      }
      throw error;
    }
  }

  async contractState(userId: string, contractId: string): Promise<ContractReviewState> {
    await this.participantContract(userId, contractId);
    const rows = await this.db.select().from(reviews).where(eq(reviews.contractId, contractId));
    const mine = rows.find((row) => row.authorId === userId) ?? null;
    const other = rows.find((row) => row.authorId !== userId) ?? null;
    const published =
      other !== null &&
      (mine !== null ||
        other.createdAt.getTime() < Date.now() - REVIEW_BLIND_WINDOW_DAYS * 86_400_000);
    return {
      contractId,
      mine: mine && toPublicReview(mine),
      counterpartSubmitted: other !== null,
      counterpart: published ? toPublicReview(other) : null,
    };
  }

  async listForUser(subjectId: string): Promise<PublicReview[]> {
    const rows = await this.db
      .select()
      .from(reviews)
      .where(and(eq(reviews.subjectId, subjectId), publishedCondition()))
      .orderBy(desc(reviews.createdAt))
      .limit(50);
    return rows.map(toPublicReview);
  }

  async summaries(userIds: string[]): Promise<ReputationSummary[]> {
    if (userIds.length === 0) {
      return [];
    }
    const rows = await this.db
      .select({
        userId: reviews.subjectId,
        rating: avg(reviews.stars),
        reviewCount: count(),
      })
      .from(reviews)
      .where(and(inArray(reviews.subjectId, userIds), publishedCondition()))
      .groupBy(reviews.subjectId);
    const byUser = new Map(rows.map((row) => [row.userId, row]));
    return [...new Set(userIds)].map((userId) => {
      const row = byUser.get(userId);
      return {
        userId,
        rating: row?.rating ? Math.round(Number(row.rating) * 10) / 10 : null,
        reviewCount: row?.reviewCount ?? 0,
      };
    });
  }

  private async participantContract(
    userId: string,
    contractId: string,
  ): Promise<ContractParticipants> {
    const contract = await this.services.get<ContractParticipants>(
      'contracts',
      `/internal/contracts/${contractId}`,
    );
    if (userId !== contract.familyId && userId !== contract.specialistId) {
      throw new ForbiddenException();
    }
    return contract;
  }
}
