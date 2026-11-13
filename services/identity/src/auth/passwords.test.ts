import assert from 'node:assert/strict';
import { test } from 'node:test';
import { hashPassword, verifyPassword } from './passwords.js';

test('verifies the original password and rejects any other', async () => {
  const stored = await hashPassword('una-clave-larga-segura');
  assert.equal(await verifyPassword('una-clave-larga-segura', stored), true);
  assert.equal(await verifyPassword('otra-clave-larga-segura', stored), false);
});

test('salts each hash independently', async () => {
  const first = await hashPassword('una-clave-larga-segura');
  const second = await hashPassword('una-clave-larga-segura');
  assert.notEqual(first, second);
});

test('rejects malformed stored hashes', async () => {
  assert.equal(await verifyPassword('una-clave-larga-segura', 'not-a-hash'), false);
});
