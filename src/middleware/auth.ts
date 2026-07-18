import type { MiddlewareHandler } from 'hono';
import { AppError } from '../lib/app-error.js';
import { verifyAccessToken } from '../lib/jwt.js';
import type { AppVariables } from '../types/hono.js';

const BEARER_PREFIX = 'Bearer ';

/** Verifies the bearer access token and attaches the authenticated user to the context. */
export const requireAuth = (): MiddlewareHandler<{ Variables: AppVariables }> => {
  return async (c, next) => {
    const header = c.req.header('authorization');
    const token = header?.startsWith(BEARER_PREFIX)
      ? header.slice(BEARER_PREFIX.length)
      : undefined;
    if (!token) {
      throw new AppError('UNAUTHORIZED', 'Missing bearer token');
    }

    const payload = await verifyAccessToken(token);
    c.set('user', {
      id: payload.sub,
      role: payload.role,
      runnerId: payload.runnerId,
      organizerId: payload.organizerId,
    });

    await next();
  };
};
