import assert from 'node:assert/strict';
import { test } from 'node:test';
import { calculateAffinity } from './affinity.js';

const base = {
  projectKind: 'expand' as const,
  specialties: ['Ampliaciones'],
  distanceKm: 0,
  radiusKm: 10,
  rating: 5,
};

test('a nearby top rated specialist in the right specialty scores 100', () => {
  assert.equal(calculateAffinity(base), 100);
});

test('a specialist outside the project specialty loses the specialty weight', () => {
  assert.equal(calculateAffinity({ ...base, specialties: ['Pintura'] }), 50);
});

test('distance beyond the radius does not produce negative scores', () => {
  assert.equal(calculateAffinity({ ...base, distanceKm: 50 }), 70);
});

test('an unrated specialist gets a neutral rating score', () => {
  assert.equal(calculateAffinity({ ...base, rating: null }), 94);
});
