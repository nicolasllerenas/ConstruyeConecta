import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';

const SERVICES = ['identity', 'marketplace', 'contracts', 'reputation'];

function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable ${name}`);
  }
  return value;
}

async function ensureRole(client, role, password) {
  const { rowCount } = await client.query('SELECT 1 FROM pg_roles WHERE rolname = $1', [role]);
  const statement = rowCount === 0 ? 'CREATE ROLE' : 'ALTER ROLE';
  const literal = client.escapeLiteral(password);
  await client.query(`${statement} ${client.escapeIdentifier(role)} LOGIN PASSWORD ${literal}`);
}

async function grantSchema(client, schema, role) {
  const quotedSchema = client.escapeIdentifier(schema);
  const quotedRole = client.escapeIdentifier(role);
  await client.query(`GRANT USAGE ON SCHEMA ${quotedSchema} TO ${quotedRole}`);
  await client.query(
    `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA ${quotedSchema} TO ${quotedRole}`,
  );
  await client.query(
    `ALTER DEFAULT PRIVILEGES IN SCHEMA ${quotedSchema} GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ${quotedRole}`,
  );
  await client.query(`ALTER ROLE ${quotedRole} SET search_path TO ${quotedSchema}`);
}

const client = new pg.Client({ connectionString: required('DATABASE_OWNER_URL') });
await client.connect();
const db = drizzle(client);

for (const service of SERVICES) {
  const folder = resolve('services', service, 'drizzle');
  if (!existsSync(folder)) {
    continue;
  }
  const role = `${service}_service`;
  await ensureRole(client, role, required(`DB_PASSWORD_${service.toUpperCase()}`));
  await migrate(db, {
    migrationsFolder: folder,
    migrationsSchema: 'migrations',
    migrationsTable: service,
  });
  await grantSchema(client, service, role);
  process.stdout.write(`${service}: migrated\n`);
}

await client.end();
