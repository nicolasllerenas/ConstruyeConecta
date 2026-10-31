import { z } from 'zod';
import { mediaUrlSchema } from './media.js';

export const PROJECT_KINDS = ['build', 'expand', 'remodel', 'repair'] as const;
export const projectKindSchema = z.enum(PROJECT_KINDS);
export type ProjectKind = z.infer<typeof projectKindSchema>;

export const PROJECT_TIMINGS = ['asap', 'within_3_months', 'just_quoting'] as const;
export const projectTimingSchema = z.enum(PROJECT_TIMINGS);
export type ProjectTiming = z.infer<typeof projectTimingSchema>;

export const SPECIALIST_KINDS = ['engineer', 'architect', 'master_builder', 'technician'] as const;
export const specialistKindSchema = z.enum(SPECIALIST_KINDS);
export type SpecialistKind = z.infer<typeof specialistKindSchema>;

export const SPECIALTIES = [
  'Ampliaciones',
  'Construcción nueva',
  'Remodelaciones',
  'Estructuras',
  'Acabados',
  'Gasfitería',
  'Electricidad',
  'Pintura',
  'Carpintería',
  'Drywall',
  'Techos',
  'Planos y permisos',
] as const;

export const KIND_SPECIALTIES: Record<ProjectKind, readonly string[]> = {
  build: ['Construcción nueva', 'Estructuras', 'Planos y permisos'],
  expand: ['Ampliaciones', 'Estructuras', 'Planos y permisos'],
  remodel: ['Remodelaciones', 'Acabados', 'Pintura', 'Drywall', 'Carpintería'],
  repair: ['Gasfitería', 'Electricidad', 'Techos', 'Pintura', 'Carpintería'],
};

const phoneSchema = z
  .string()
  .trim()
  .regex(/^(\+?51)?9\d{8}$/, 'Ingresa un celular peruano de 9 dígitos');

export const locationSchema = z.object({
  address: z.string().trim().min(5).max(200),
  reference: z.string().trim().max(200).optional(),
  district: z.string().trim().min(2).max(80),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  radiusKm: z.number().int().min(1).max(50),
});

export const familyProfileSchema = locationSchema.extend({
  displayName: z.string().trim().min(2).max(120),
  phone: phoneSchema,
});
export type FamilyProfileInput = z.infer<typeof familyProfileSchema>;

export const specialistProfileSchema = familyProfileSchema.extend({
  kind: specialistKindSchema,
  bio: z.string().trim().min(20).max(600),
  specialties: z.array(z.enum(SPECIALTIES)).min(1).max(6),
  visitFeeCents: z.number().int().min(0).max(100_000),
  availability: z.string().trim().min(3).max(80),
  avatarUrl: mediaUrlSchema.optional(),
});
export type SpecialistProfileInput = z.infer<typeof specialistProfileSchema>;

export const portfolioItemSchema = z.object({
  url: mediaUrlSchema,
  caption: z.string().trim().min(2).max(80),
});
export type PortfolioItemInput = z.infer<typeof portfolioItemSchema>;

export const createProjectSchema = z
  .object({
    kind: projectKindSchema,
    title: z.string().trim().min(4).max(80),
    description: z.string().trim().max(600).optional(),
    photoUrls: z.array(mediaUrlSchema).max(6),
    voiceNoteUrl: mediaUrlSchema.optional(),
    budgetMinCents: z.number().int().positive().max(100_000_000),
    budgetMaxCents: z.number().int().positive().max(100_000_000),
    timing: projectTimingSchema,
    highlight: z.boolean().default(false),
  })
  .refine((value) => value.budgetMaxCents >= value.budgetMinCents, {
    message: 'El presupuesto máximo debe ser mayor o igual al mínimo',
    path: ['budgetMaxCents'],
  })
  .refine(
    (value) => value.photoUrls.length > 0 || value.voiceNoteUrl || value.description?.length,
    {
      message: 'Cuéntanos tu obra con una foto, un audio o una descripción',
      path: ['description'],
    },
  );
export type CreateProjectInput = z.infer<typeof createProjectSchema>;

export const SWIPE_DECISIONS = ['like', 'pass'] as const;

export const familySwipeSchema = z.object({
  projectId: z.string().uuid(),
  specialistId: z.string().uuid(),
  decision: z.enum(SWIPE_DECISIONS),
});
export type FamilySwipeInput = z.infer<typeof familySwipeSchema>;

export const specialistSwipeSchema = z.object({
  projectId: z.string().uuid(),
  decision: z.enum(SWIPE_DECISIONS),
});
export type SpecialistSwipeInput = z.infer<typeof specialistSwipeSchema>;

export const activatePlanSchema = z.object({ plan: z.literal('pro') });

export interface SpecialistCard {
  id: string;
  displayName: string;
  kind: SpecialistKind;
  bio: string;
  specialties: string[];
  district: string;
  distanceKm: number | null;
  visitFeeCents: number;
  availability: string;
  avatarUrl: string | null;
  verified: boolean;
  pro: boolean;
  demo: boolean;
  affinity: number | null;
  rating: number | null;
  reviewCount: number;
  completedJobs: number;
  portfolio: { id: string; url: string; caption: string }[];
}

export interface ProjectCard {
  id: string;
  familyId: string;
  familyName: string;
  kind: ProjectKind;
  title: string;
  description: string | null;
  photoUrls: string[];
  voiceNoteUrl: string | null;
  budgetMinCents: number;
  budgetMaxCents: number;
  timing: ProjectTiming;
  district: string;
  distanceKm: number | null;
  highlighted: boolean;
  invited: boolean;
  status: 'open' | 'contracted' | 'closed';
  demo: boolean;
  familyRating: number | null;
  familyReviewCount: number;
  createdAt: string;
}

export interface SwipeResult {
  matched: boolean;
  matchId: string | null;
}

export interface MatchSummary {
  id: string;
  projectId: string;
  projectTitle: string;
  budgetMinCents: number;
  budgetMaxCents: number;
  specialistId: string;
  specialistName: string;
  familyId: string;
  familyName: string;
  counterpartPhone: string;
  address: string;
  reference: string | null;
  district: string;
  createdAt: string;
}

export interface MyProfile {
  role: 'family' | 'specialist';
  displayName: string;
  phone: string;
  address: string;
  reference: string | null;
  district: string;
  latitude: number;
  longitude: number;
  radiusKm: number;
  specialist: {
    kind: SpecialistKind;
    bio: string;
    specialties: string[];
    visitFeeCents: number;
    availability: string;
    avatarUrl: string | null;
    verified: boolean;
    plan: 'free' | 'pro';
    planExpiresAt: string | null;
    portfolio: { id: string; url: string; caption: string }[];
  } | null;
}
