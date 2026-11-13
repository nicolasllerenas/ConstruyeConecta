import {
  bayesianRating,
  KIND_SPECIALTIES,
  type ProjectKind,
  type SpecialistLevel,
} from '@cc/contracts';

const FIT_WEIGHT = 35;
const PROXIMITY_WEIGHT = 20;
const REPUTATION_WEIGHT = 25;
const TRACK_RECORD_WEIGHT = 10;
const TRUST_WEIGHT = 10;
const PRO_BOOST = 4;
const MAX_SCORE = 100;
const MAX_STARS = 5;
const FULL_FIT_SPECIALTIES = 2;
const SEASONED_JOBS = 100;
const SEASONED_YEARS = 15;
const NEARBY_KM = 5;
const MAX_REASONS = 3;
const NEWCOMER_SLOT = 2;

export interface SpecialistSignals {
  specialties: string[];
  rating: number | null;
  reviewCount: number;
  completedJobs: number;
  yearsExperience: number | null;
  verified: boolean;
  credential: string | null;
  portfolioCount: number;
  pro: boolean;
}

export interface RankingContext {
  projectKind: ProjectKind;
  distanceKm: number;
  radiusKm: number;
}

export interface Ranking {
  score: number;
  reasons: string[];
}

export function specialistLevel(signals: SpecialistSignals): SpecialistLevel {
  const rating = signals.rating ?? 0;
  if (
    signals.verified &&
    signals.completedJobs >= 100 &&
    signals.reviewCount >= 3 &&
    rating >= 4.6
  ) {
    return 'gold';
  }
  if (signals.completedJobs >= 30 && signals.reviewCount >= 2 && rating >= 4.3) {
    return 'silver';
  }
  if (signals.completedJobs >= 5 || signals.reviewCount >= 1) {
    return 'bronze';
  }
  return 'new';
}

export function rankSpecialist(signals: SpecialistSignals, context: RankingContext): Ranking {
  const relevant = signals.specialties.filter((specialty) =>
    KIND_SPECIALTIES[context.projectKind].includes(specialty),
  );
  const fit = Math.min(1, relevant.length / FULL_FIT_SPECIALTIES);
  const proximity = Math.max(0, 1 - context.distanceKm / Math.max(context.radiusKm, 1));
  const reputation = bayesianRating(signals.rating, signals.reviewCount) / MAX_STARS;
  const trackRecord =
    0.7 * Math.min(1, Math.log10(1 + signals.completedJobs) / Math.log10(1 + SEASONED_JOBS)) +
    0.3 * Math.min(1, (signals.yearsExperience ?? 0) / SEASONED_YEARS);
  const trust =
    0.5 * Number(signals.verified) +
    0.3 * Number(signals.credential !== null) +
    0.2 * Number(signals.portfolioCount > 0);

  const parts: [points: number, reason: string | null][] = [
    [FIT_WEIGHT * fit, relevant[0] ? `Hace ${relevant[0].toLowerCase()}` : null],
    [
      PROXIMITY_WEIGHT * proximity,
      context.distanceKm <= NEARBY_KM
        ? `A ${Math.max(1, Math.round(context.distanceKm))} km de tu obra`
        : null,
    ],
    [
      REPUTATION_WEIGHT * reputation,
      signals.rating !== null && signals.reviewCount >= 3 && signals.rating >= 4.5
        ? `★ ${signals.rating.toFixed(1)} en ${signals.reviewCount} reseñas`
        : null,
    ],
    [
      TRACK_RECORD_WEIGHT * trackRecord,
      signals.completedJobs >= 50 ? `${signals.completedJobs} obras realizadas` : null,
    ],
    [TRUST_WEIGHT * trust, signals.credential],
  ];
  const base = parts.reduce((sum, [points]) => sum + points, 0);
  return {
    score: Math.min(MAX_SCORE, Math.round(base + (signals.pro ? PRO_BOOST : 0))),
    reasons: parts
      .filter((part): part is [number, string] => part[1] !== null)
      .sort((a, b) => b[0] - a[0])
      .slice(0, MAX_REASONS)
      .map(([, reason]) => reason),
  };
}

export function withNewcomerSlot<T extends { level: SpecialistLevel }>(ranked: T[]): T[] {
  const index = ranked.findIndex((item) => item.level === 'new');
  if (index <= NEWCOMER_SLOT) {
    return ranked;
  }
  const reordered = [...ranked];
  const [newcomer] = reordered.splice(index, 1);
  reordered.splice(NEWCOMER_SLOT, 0, newcomer as T);
  return reordered;
}
