import assert from 'node:assert/strict';
import { test } from 'node:test';
import { summarizeLedger } from './ledger.js';

test('splits amounts by stage status and preserves the total', () => {
  const ledger = summarizeLedger([
    { amountCents: 2_000_000, status: 'approved' },
    { amountCents: 2_200_000, status: 'submitted' },
    { amountCents: 1_640_000, status: 'pending' },
  ]);
  assert.deepEqual(ledger, {
    releasedCents: 2_000_000,
    heldCents: 2_200_000,
    pendingCents: 1_640_000,
  });
});

test('counts an in progress stage as held', () => {
  const ledger = summarizeLedger([{ amountCents: 100, status: 'in_progress' }]);
  assert.equal(ledger.heldCents, 100);
});
