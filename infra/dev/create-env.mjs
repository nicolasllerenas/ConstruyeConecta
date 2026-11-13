import { generateKeyPairSync, randomBytes } from 'node:crypto';
import { existsSync, writeFileSync } from 'node:fs';

if (existsSync('.env')) {
  process.stdout.write('.env already exists\n');
  process.exit(0);
}

const secret = () => randomBytes(32).toString('base64url');
const { privateKey, publicKey } = generateKeyPairSync('ec', {
  namedCurve: 'P-256',
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  publicKeyEncoding: { type: 'spki', format: 'pem' },
});
const base64 = (value) => Buffer.from(value).toString('base64');

const values = {
  DATABASE_OWNER_URL: 'postgres://owner:owner@localhost:54329/construyeconecta',
  DB_PASSWORD_IDENTITY: secret(),
  DB_PASSWORD_MARKETPLACE: secret(),
  DB_PASSWORD_CONTRACTS: secret(),
  DB_PASSWORD_REPUTATION: secret(),
  JWT_PRIVATE_KEY: base64(privateKey),
  JWT_PUBLIC_KEY: base64(publicKey),
  INTERNAL_SERVICE_SECRET: secret(),
  DEFAULT_USERS_PASSWORD: secret(),
};

writeFileSync(
  '.env',
  `${Object.entries(values)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n')}\n`,
  { mode: 0o600 },
);
process.stdout.write('.env created\n');
