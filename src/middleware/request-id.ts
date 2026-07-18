import { randomUUID } from 'node:crypto';
import type { MiddlewareHandler } from 'hono';
import { logger } from '../lib/logger.js';
import type { AppVariables } from '../types/hono.js';

export const requestId = (): MiddlewareHandler<{ Variables: AppVariables }> => async (c, next) => {
  const incoming = c.req.header('x-request-id');
  const id = incoming && incoming.length > 0 ? incoming : randomUUID();
  c.set('requestId', id);
  c.header('x-request-id', id);

  const start = Date.now();
  await next();

  logger.info(
    {
      requestId: id,
      method: c.req.method,
      path: c.req.path,
      status: c.res.status,
      durationMs: Date.now() - start,
    },
    'request completed',
  );
};
