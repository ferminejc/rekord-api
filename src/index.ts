import { serve } from '@hono/node-server';
import { app } from './app.js';
import { env } from './config/env.js';
import { migrateDb } from './db/client.js';

await migrateDb();

serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  console.log(`rekord-api listening on http://localhost:${info.port}`);
});
