import { serve } from '@hono/node-server';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { db, migrateDb } from './db/client.js';

await migrateDb();

const app = createApp(db);

serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  console.log(`rekord-api listening on http://localhost:${info.port}`);
});
