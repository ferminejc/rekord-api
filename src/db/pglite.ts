import { PGlite } from '@electric-sql/pglite';
import { drizzle, type PgliteDatabase } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import * as schema from './schema/index.js';

export type Schema = typeof schema;

export const MIGRATIONS_FOLDER = 'src/db/migrations';

export function createPgliteDb(): PgliteDatabase<Schema> & { $client: PGlite } {
  return drizzle(new PGlite(), { schema, casing: 'snake_case' });
}

export function migratePgliteDb(db: PgliteDatabase<Schema>): Promise<void> {
  return migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
}
