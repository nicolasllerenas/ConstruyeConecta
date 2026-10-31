import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify<string, Buffer, number, object, Buffer>(scrypt);

const COST = 2 ** 16;
const BLOCK_SIZE = 8;
const PARALLELIZATION = 1;
const KEY_LENGTH = 32;
const SALT_LENGTH = 16;
const MAX_MEMORY = 128 * COST * BLOCK_SIZE * 2;

function derive(password: string, salt: Buffer, cost: number, blockSize: number, parallel: number) {
  return scryptAsync(password, salt, KEY_LENGTH, {
    N: cost,
    r: blockSize,
    p: parallel,
    maxmem: MAX_MEMORY,
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);
  const key = await derive(password, salt, COST, BLOCK_SIZE, PARALLELIZATION);
  return [
    'scrypt',
    COST,
    BLOCK_SIZE,
    PARALLELIZATION,
    salt.toString('base64url'),
    key.toString('base64url'),
  ].join('$');
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algorithm, cost, blockSize, parallel, salt, key] = stored.split('$');
  if (algorithm !== 'scrypt' || !cost || !blockSize || !parallel || !salt || !key) {
    return false;
  }
  const expected = Buffer.from(key, 'base64url');
  const actual = await derive(
    password,
    Buffer.from(salt, 'base64url'),
    Number(cost),
    Number(blockSize),
    Number(parallel),
  );
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
