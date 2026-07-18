import type { PgliteDatabase } from 'drizzle-orm/pglite';
import { createApp } from '../../src/app.js';
import { createPgliteDb, migratePgliteDb, type Schema } from '../../src/db/pglite.js';

export interface TestApp {
  app: ReturnType<typeof createApp>;
  db: PgliteDatabase<Schema>;
  close: () => Promise<void>;
}

export async function createTestApp(): Promise<TestApp> {
  const db = createPgliteDb();
  await migratePgliteDb(db);

  return {
    app: createApp(),
    db,
    close: () => db.$client.close(),
  };
}
