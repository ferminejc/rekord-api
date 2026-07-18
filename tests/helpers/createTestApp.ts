import { PGlite } from '@electric-sql/pglite';
import { drizzle, type PgliteDatabase } from 'drizzle-orm/pglite';
import { app } from '../../src/app.js';

export interface TestApp {
  app: typeof app;
  db: PgliteDatabase;
  close: () => Promise<void>;
}

export async function createTestApp(): Promise<TestApp> {
  const client = new PGlite();
  const db = drizzle(client);

  return {
    app,
    db,
    close: () => client.close(),
  };
}
