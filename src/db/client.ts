import { drizzle as drizzleNeonHttp, type NeonHttpDatabase } from 'drizzle-orm/neon-http';
import type { PgliteDatabase } from 'drizzle-orm/pglite';
import { env } from '../config/env.js';
import { createPgliteDb, migratePgliteDb, type Schema } from './pglite.js';
import * as schema from './schema/index.js';

function createDb(): NeonHttpDatabase<Schema> | PgliteDatabase<Schema> {
  if (env.NODE_ENV === 'production') {
    return drizzleNeonHttp(env.DATABASE_URL, { schema, casing: 'snake_case' });
  }

  return createPgliteDb();
}

export const db = createDb();

/**
 * Zero-infrastructure mode: dev/test PGlite is fresh in-memory on every process boot, so
 * migrations are applied here instead of requiring a separate `db:migrate` step. Production
 * (Neon) migrations are a deliberate deploy-time step (SPEC §13) — never automatic.
 */
export async function migrateDb(): Promise<void> {
  if (env.NODE_ENV !== 'production') {
    await migratePgliteDb(db as PgliteDatabase<Schema>);
  }
}
