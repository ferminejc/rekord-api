import type { ErrorHandler } from 'hono';
import { ZodError } from 'zod';
import { AppError } from '../lib/app-error.js';
import { logger } from '../lib/logger.js';
import type { AppVariables } from '../types/hono.js';

export const errorHandler: ErrorHandler<{ Variables: AppVariables }> = (err, c) => {
  const requestId = c.get('requestId');

  if (err instanceof AppError) {
    if (err.code === 'INTERNAL') {
      logger.error({ requestId, err }, err.message);
    }
    return c.json(err.toBody(), err.status);
  }

  if (err instanceof ZodError) {
    const fieldErrors = err.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));
    return c.json(
      { code: 'VALIDATION_FAILED' as const, message: 'Validation failed', fieldErrors },
      400,
    );
  }

  logger.error({ requestId, err }, 'unhandled error');
  return c.json({ code: 'INTERNAL' as const, message: 'Internal server error' }, 500);
};
