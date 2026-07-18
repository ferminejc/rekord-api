import type { MiddlewareHandler } from 'hono';
import { AppError } from '../lib/app-error.js';
import type { AppVariables, AuthUser } from '../types/hono.js';

/** Must run after requireAuth() — restricts a route to one or more roles. */
export const requireRole = (
  ...roles: AuthUser['role'][]
): MiddlewareHandler<{ Variables: AppVariables }> => {
  return async (c, next) => {
    const user = c.get('user');
    if (!user) {
      throw new AppError('UNAUTHORIZED', 'Authentication required');
    }
    if (!roles.includes(user.role)) {
      throw new AppError('FORBIDDEN', 'Insufficient role for this action');
    }

    await next();
  };
};
