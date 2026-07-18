import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { Scalar } from '@scalar/hono-api-reference';
import type { Db } from './db/types.js';
import { validationErrorBody } from './lib/app-error.js';
import { envelopeSchema, ok } from './lib/envelope.js';
import { errorHandler } from './middleware/error-handler.js';
import { requestId } from './middleware/request-id.js';
import { createAuthRoutes } from './modules/auth/auth.routes.js';
import type { AppVariables } from './types/hono.js';

const healthRoute = createRoute({
  method: 'get',
  path: '/api/v1/health',
  tags: ['System'],
  summary: 'Health check',
  responses: {
    200: {
      description: 'The service is healthy.',
      content: {
        'application/json': { schema: envelopeSchema(z.object({ status: z.literal('ok') })) },
      },
    },
  },
});

/**
 * `db` is required (no default) so that merely importing this module never constructs a real
 * database connection — the caller (index.ts for real, the test harness for tests) always
 * passes an explicit instance.
 */
export function createApp(db: Db) {
  const app = new OpenAPIHono<{ Variables: AppVariables }>({
    defaultHook: (result, c) => {
      if (!result.success) {
        return c.json(validationErrorBody(result.error), 400);
      }
      return undefined;
    },
  });

  app.use('*', requestId());
  app.onError(errorHandler);
  app.notFound((c) => c.json({ code: 'NOT_FOUND', message: 'Not found' }, 404));

  app.openapi(healthRoute, (c) => c.json(ok({ status: 'ok' as const }), 200));
  app.route('/', createAuthRoutes(db));

  app.doc('/openapi.json', {
    openapi: '3.0.0',
    info: {
      title: 'rekord-api',
      version: '0.1.0',
      description: 'Rekord — Philippines-only running records platform API.',
    },
    servers: [{ url: '/', description: 'Route paths already include the /api/v1 prefix' }],
  });

  app.get('/docs', Scalar({ url: '/openapi.json' }));

  return app;
}
