import { createRoute, OpenAPIHono } from '@hono/zod-openapi';
import type { Db } from '../../db/types.js';
import { ErrorEnvelopeSchema, ok } from '../../lib/envelope.js';
import type { AppVariables } from '../../types/hono.js';
import { AuthResponseSchema, LoginSchema, RegisterSchema } from './auth.schemas.js';
import * as authService from './auth.service.js';

const registerRoute = createRoute({
  method: 'post',
  path: '/api/v1/auth/register',
  tags: ['Auth'],
  summary: 'Register a new runner account',
  request: {
    body: { content: { 'application/json': { schema: RegisterSchema } } },
  },
  responses: {
    201: {
      description: 'Account created',
      content: { 'application/json': { schema: AuthResponseSchema } },
    },
    409: {
      description: 'An account with this email already exists',
      content: { 'application/json': { schema: ErrorEnvelopeSchema } },
    },
  },
});

const loginRoute = createRoute({
  method: 'post',
  path: '/api/v1/auth/login',
  tags: ['Auth'],
  summary: 'Log in with email and password',
  request: {
    body: { content: { 'application/json': { schema: LoginSchema } } },
  },
  responses: {
    200: {
      description: 'Authenticated',
      content: { 'application/json': { schema: AuthResponseSchema } },
    },
    401: {
      description: 'Invalid email or password',
      content: { 'application/json': { schema: ErrorEnvelopeSchema } },
    },
  },
});

export function createAuthRoutes(db: Db) {
  const app = new OpenAPIHono<{ Variables: AppVariables }>();

  app.openapi(registerRoute, async (c) => {
    const body = c.req.valid('json');
    const tokens = await authService.register(db, body);
    return c.json(ok(tokens), 201);
  });

  app.openapi(loginRoute, async (c) => {
    const body = c.req.valid('json');
    const tokens = await authService.login(db, body);
    return c.json(ok(tokens), 200);
  });

  return app;
}
