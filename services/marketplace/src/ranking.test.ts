import assert from 'node:assert/strict';
import { test } from 'node:test';
import { rankSpecialist, specialistLevel, withNewcomerSlot } from './ranking.js';

const seasoned = {
  specialties: ['Ampliaciones', 'Estructuras'],
  rating: 4.8,
  reviewCount: 40,
  completedJobs: 214,
  yearsExperience: 12,
  verified: true,
  credential: 'Ingeniero civil colegiado (CIP)',
  portfolioCount: 3,
  pro: false,
};

const context = { projectKind: 'expand' as const, distanceKm: 2, radiusKm: 15 };

test('a seasoned nearby specialist in the right specialty ranks high and explains why', () => {
  const ranking = rankSpecialist(seasoned, context);
  assert.ok(ranking.score >= 90);
  assert.equal(ranking.reasons.length, 3);
  assert.ok(ranking.reasons.includes('Hace ampliaciones'));
});

test('a specialist outside the project specialty loses the fit points', () => {
  const painter = rankSpecialist({ ...seasoned, specialties: ['Pintura'] }, context);
  assert.ok(painter.score <= rankSpecialist(seasoned, context).score - 35);
});

test('paying for Pro helps but does not beat clearly better quality', () => {
  const average = { ...seasoned, rating: 3.9, reviewCount: 12, completedJobs: 8, pro: true };
  assert.ok(rankSpecialist(seasoned, context).score > rankSpecialist(average, context).score);
});

test('one perfect review does not outrank a long track record', () => {
  const lucky = { ...seasoned, rating: 5, reviewCount: 1 };
  assert.ok(rankSpecialist(seasoned, context).score > rankSpecialist(lucky, context).score);
});

test('levels follow completed jobs and reputation', () => {
  assert.equal(specialistLevel(seasoned), 'gold');
  assert.equal(specialistLevel({ ...seasoned, completedJobs: 40, verified: false }), 'silver');
  assert.equal(
    specialistLevel({ ...seasoned, completedJobs: 6, reviewCount: 0, rating: null }),
    'bronze',
  );
  assert.equal(
    specialistLevel({ ...seasoned, completedJobs: 0, reviewCount: 0, rating: null }),
    'new',
  );
});

test('the best newcomer gets a slot among the first results', () => {
  const ranked = ['gold', 'gold', 'silver', 'silver', 'new'].map((level, id) => ({ id, level }));
  const reordered = withNewcomerSlot(ranked as { id: number; level: 'new' }[]);
  assert.deepEqual(
    reordered.map((item) => item.id),
    [0, 1, 4, 2, 3],
  );
});
