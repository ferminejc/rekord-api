import { PGlite } from '@electric-sql/pglite';
import { drizzle, type PgliteDatabase } from 'drizzle-orm/pglite';
import { createApp } from '../../src/app.js';

export interface TestApp {
  app: ReturnType<typeof createApp>;
  db: PgliteDatabase;
  close: () => Promise<void>;
}

export async function createTestApp(): Promise<TestApp> {
  const client = new PGlite();
  const db = drizzle(client);

  return {
    app: createApp(),
    db,
    close: () => client.close(),
  };
}
