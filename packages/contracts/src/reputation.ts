import { z } from 'zod';

export const REVIEW_TAGS = [
  'Puntual',
  'Trabajo limpio',
  'Respetó el presupuesto',
  'Cumplió el plazo',
  'Buena comunicación',
  'Pagos a tiempo',
  'Decisiones claras',
] as const;

export const createReviewSchema = z.object({
  contractId: z.string().uuid(),
  stars: z.number().int().min(0).max(5),
  tags: z.array(z.enum(REVIEW_TAGS)).max(5),
  comment: z.string().trim().max(500).optional(),
});
export type CreateReviewInput = z.infer<typeof createReviewSchema>;

export const REVIEW_BLIND_WINDOW_DAYS = 7;

export interface ReputationSummary {
  userId: string;
  rating: number | null;
  reviewCount: number;
}

export interface PublicReview {
  id: string;
  stars: number;
  tags: string[];
  comment: string | null;
  authorRole: 'family' | 'specialist';
  createdAt: string;
}

export interface ContractReviewState {
  contractId: string;
  mine: PublicReview | null;
  counterpartSubmitted: boolean;
  counterpart: PublicReview | null;
}
