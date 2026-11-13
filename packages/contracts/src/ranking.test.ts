import assert from 'node:assert/strict';
import { test } from 'node:test';
import { bayesianRating, rankQuotes } from './ranking.js';

const BUDGET = 6_000_000;

const complete = {
  id: 'complete',
  totalCents: 5_840_000,
  permitsCents: 570_000,
  extrasCents: 120_000,
  durationWeeks: 10,
  rating: 4.75,
  reviewCount: 4,
};

const cheapButOpen = {
  id: 'cheap',
  totalCents: 5_100_000,
  permitsCents: null,
  extrasCents: null,
  durationWeeks: 12,
  rating: 4.5,
  reviewCount: 4,
};

const premium = {
  id: 'premium',
  totalCents: 6_390_000,
  permitsCents: 920_000,
  extrasCents: 0,
  durationWeeks: 8,
  rating: 4.67,
  reviewCount: 3,
};

test('many good reviews outweigh a single perfect one', () => {
  assert.ok(bayesianRating(4.8, 40) > bayesianRating(5, 1));
});

test('a specialist without reviews starts at the neutral prior', () => {
  assert.equal(bayesianRating(null, 0), 4);
});

test('the cheapest quote does not win when it leaves permits and extras undefined', () => {
  const [best] = rankQuotes([cheapButOpen, complete, premium], BUDGET);
  assert.equal(best?.id, 'complete');
  assert.ok(best?.reasons.includes('Incluye permisos y no deja costos sin definir'));
});

test('a quote above the budget loses the budget points', () => {
  const ranked = rankQuotes([complete, premium], BUDGET);
  const premiumValue = ranked.find((item) => item.id === 'premium');
  assert.equal(premiumValue?.reasons.includes('Entra en tu presupuesto'), false);
});

test('no quotes produce no ranking', () => {
  assert.deepEqual(rankQuotes([], BUDGET), []);
});
