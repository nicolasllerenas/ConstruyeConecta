import { KIND_SPECIALTIES, type ProjectKind } from '@cc/contracts';

const SPECIALTY_WEIGHT = 50;
const DISTANCE_WEIGHT = 30;
const RATING_WEIGHT = 20;
const UNRATED_SCORE = 0.7;
const MAX_STARS = 5;

export interface AffinityInput {
  projectKind: ProjectKind;
  specialties: string[];
  distanceKm: number;
  radiusKm: number;
  rating: number | null;
}

export function calculateAffinity(input: AffinityInput): number {
  const relevant = KIND_SPECIALTIES[input.projectKind];
  const specialtyScore = input.specialties.some((specialty) => relevant.includes(specialty))
    ? 1
    : 0;
  const distanceScore = Math.max(0, 1 - input.distanceKm / Math.max(input.radiusKm, 1));
  const ratingScore = input.rating === null ? UNRATED_SCORE : input.rating / MAX_STARS;
  return Math.round(
    SPECIALTY_WEIGHT * specialtyScore +
      DISTANCE_WEIGHT * distanceScore +
      RATING_WEIGHT * ratingScore,
  );
}
