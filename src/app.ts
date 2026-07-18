import { Hono } from 'hono';
import { ok } from './lib/envelope.js';
import { errorHandler } from './middleware/error-handler.js';
import { requestId } from './middleware/request-id.js';
import type { AppVariables } from './types/hono.js';

export function createApp() {
  const app = new Hono<{ Variables: AppVariables }>();

  app.use('*', requestId());
  app.onError(errorHandler);
  app.notFound((c) => c.json({ code: 'NOT_FOUND', message: 'Not found' }, 404));

  app.get('/api/v1/health', (c) => c.json(ok({ status: 'ok' })));

  return app;
}

export const app = createApp();
export default app;
