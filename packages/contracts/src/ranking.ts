const PRIOR_RATING = 4;
const PRIOR_WEIGHT = 3;
const MAX_STARS = 5;

const PRICE_WEIGHT = 30;
const CERTAINTY_WEIGHT = 25;
const REPUTATION_WEIGHT = 25;
const SPEED_WEIGHT = 10;
const BUDGET_WEIGHT = 10;
const MAX_REASONS = 3;

export function bayesianRating(rating: number | null, reviewCount: number): number {
  const observed = rating === null ? 0 : rating * reviewCount;
  return (PRIOR_RATING * PRIOR_WEIGHT + observed) / (PRIOR_WEIGHT + reviewCount);
}

export interface QuoteValueInput {
  id: string;
  totalCents: number;
  permitsCents: number | null;
  extrasCents: number | null;
  durationWeeks: number;
  rating: number | null;
  reviewCount: number;
}

export interface QuoteValue {
  id: string;
  score: number;
  reasons: string[];
}

export function rankQuotes(quotes: QuoteValueInput[], budgetMaxCents: number): QuoteValue[] {
  if (quotes.length === 0) {
    return [];
  }
  const cheapest = Math.min(...quotes.map((quote) => quote.totalCents));
  const fastest = Math.min(...quotes.map((quote) => quote.durationWeeks));
  return quotes
    .map((quote) => {
      const permitsIncluded = quote.permitsCents !== null;
      const extrasDefined = quote.extrasCents !== null;
      const withinBudget = quote.totalCents <= budgetMaxCents;
      const reputation = bayesianRating(quote.rating, quote.reviewCount) / MAX_STARS;
      const parts: [weight: number, reason: string | null][] = [
        [
          PRICE_WEIGHT * (cheapest / quote.totalCents),
          quote.totalCents === cheapest ? 'Es la más económica' : null,
        ],
        [
          CERTAINTY_WEIGHT * ((Number(permitsIncluded) + Number(extrasDefined)) / 2),
          permitsIncluded && extrasDefined ? 'Incluye permisos y no deja costos sin definir' : null,
        ],
        [
          REPUTATION_WEIGHT * reputation,
          quote.rating !== null && quote.reviewCount >= 3 && quote.rating >= 4.5
            ? `★ ${quote.rating.toFixed(1)} en ${quote.reviewCount} reseñas`
            : null,
        ],
        [
          SPEED_WEIGHT * (fastest / quote.durationWeeks),
          quote.durationWeeks === fastest ? 'Es la más rápida' : null,
        ],
        [BUDGET_WEIGHT * Number(withinBudget), withinBudget ? 'Entra en tu presupuesto' : null],
      ];
      return {
        id: quote.id,
        score: Math.round(parts.reduce((sum, [weight]) => sum + weight, 0)),
        reasons: parts
          .filter((part): part is [number, string] => part[1] !== null)
          .sort((a, b) => b[0] - a[0])
          .slice(0, MAX_REASONS)
          .map(([, reason]) => reason),
      };
    })
    .sort((a, b) => b.score - a.score);
}
