import { z } from 'zod';
import { mediaUrlSchema } from './media.js';

const centsSchema = z.number().int().min(0).max(100_000_000);

export const quoteStageSchema = z.object({
  name: z.string().trim().min(2).max(80),
  weekFrom: z.number().int().min(1).max(260),
  weekTo: z.number().int().min(1).max(260),
  amountCents: centsSchema,
});
export type QuoteStageInput = z.infer<typeof quoteStageSchema>;

export const quoteVersionSchema = z
  .object({
    materialsCents: centsSchema,
    laborCents: centsSchema,
    permitsCents: centsSchema.nullable(),
    extrasCents: centsSchema.nullable(),
    durationWeeks: z.number().int().min(1).max(260),
    scope: z.string().trim().min(10).max(1000),
    changeNote: z.string().trim().max(300).optional(),
    stages: z.array(quoteStageSchema).min(1).max(8),
  })
  .superRefine((value, context) => {
    const total = quoteTotalCents(value);
    const staged = value.stages.reduce((sum, stage) => sum + stage.amountCents, 0);
    if (staged !== total) {
      context.addIssue({
        code: 'custom',
        path: ['stages'],
        message: 'La suma de las etapas debe ser igual al total de la cotización',
      });
    }
    value.stages.forEach((stage, index) => {
      if (stage.weekTo < stage.weekFrom || stage.weekTo > value.durationWeeks) {
        context.addIssue({
          code: 'custom',
          path: ['stages', index, 'weekTo'],
          message: 'Las semanas de la etapa no calzan con el plazo',
        });
      }
    });
  });
export type QuoteVersionInput = z.infer<typeof quoteVersionSchema>;

export const createQuoteSchema = z.object({
  matchId: z.string().uuid(),
  version: quoteVersionSchema,
});
export type CreateQuoteInput = z.infer<typeof createQuoteSchema>;

export const requestAdjustmentSchema = z.object({
  message: z.string().trim().min(5).max(300),
});

export const progressUpdateSchema = z.object({
  message: z.string().trim().min(3).max(500),
  photoUrls: z.array(mediaUrlSchema).max(12),
});
export type ProgressUpdateInput = z.infer<typeof progressUpdateSchema>;

export const submitStageSchema = progressUpdateSchema;
export const rejectStageSchema = z.object({ message: z.string().trim().min(5).max(300) });

export function quoteTotalCents(version: {
  materialsCents: number;
  laborCents: number;
  permitsCents: number | null;
  extrasCents: number | null;
}): number {
  return (
    version.materialsCents +
    version.laborCents +
    (version.permitsCents ?? 0) +
    (version.extrasCents ?? 0)
  );
}

export const FREE_PLAN_MONTHLY_QUOTES = 3;

export type QuoteStatus = 'submitted' | 'adjustment_requested' | 'selected' | 'rejected';
export type StageStatus = 'pending' | 'in_progress' | 'submitted' | 'approved';
export type ContractStatus = 'active' | 'completed';

export interface QuoteVersionView {
  id: string;
  version: number;
  materialsCents: number;
  laborCents: number;
  permitsCents: number | null;
  extrasCents: number | null;
  totalCents: number;
  durationWeeks: number;
  scope: string;
  changeNote: string | null;
  stages: (QuoteStageInput & { id: string })[];
  createdAt: string;
}

export interface QuoteView {
  id: string;
  matchId: string;
  projectId: string;
  projectTitle: string;
  familyId: string;
  specialistId: string;
  status: QuoteStatus;
  adjustmentMessage: string | null;
  current: QuoteVersionView;
  previousTotalCents: number | null;
  contractId: string | null;
}

export interface ContractStageView {
  id: string;
  position: number;
  name: string;
  weekFrom: number;
  weekTo: number;
  amountCents: number;
  status: StageStatus;
  rejectionMessage: string | null;
  approvedAt: string | null;
}

export interface ProgressUpdateView {
  id: string;
  stageId: string;
  authorId: string;
  message: string;
  photoUrls: string[];
  createdAt: string;
}

export interface ContractView {
  id: string;
  quoteId: string;
  projectId: string;
  projectTitle: string;
  familyId: string;
  specialistId: string;
  status: ContractStatus;
  totalCents: number;
  durationWeeks: number;
  startedAt: string;
  completedAt: string | null;
  releasedCents: number;
  heldCents: number;
  pendingCents: number;
  stages: ContractStageView[];
  updates: ProgressUpdateView[];
}
