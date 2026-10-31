import { PG_POOL } from '@cc/platform';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { Pool } from 'pg';
import * as schema from './schema.js';

export const DB = Symbol('DB');
export type Database = NodePgDatabase<typeof schema>;

export const databaseProvider = {
  provide: DB,
  inject: [PG_POOL],
  useFactory: (pool: Pool): Database => drizzle(pool, { schema }),
};
