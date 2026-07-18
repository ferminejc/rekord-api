import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { createApp } from '../../src/app.js';
import { AppError } from '../../src/lib/app-error.js';

function buildTestApp() {
  const app = createApp();

  app.get('/test/app-error', () => {
    throw new AppError('CONFLICT', 'already exists');
  });
  app.get('/test/zod', (c) => {
    z.object({ name: z.string() }).parse({});
    return c.json({ unreachable: true });
  });
  app.get('/test/unknown', () => {
    throw new Error('kaboom');
  });

  return app;
}

describe('error handling middleware', () => {
  it('maps AppError to its code, status, and message', async () => {
    const res = await buildTestApp().request('/test/app-error');

    expect(res.status).toBe(409);
    await expect(res.json()).resolves.toEqual({ code: 'CONFLICT', message: 'already exists' });
  });

  it('maps ZodError to a VALIDATION_FAILED envelope with fieldErrors', async () => {
    const res = await buildTestApp().request('/test/zod');

    expect(res.status).toBe(400);
    const body = (await res.json()) as {
      code: string;
      fieldErrors: Array<{ field: string; message: string }>;
    };
    expect(body.code).toBe('VALIDATION_FAILED');
    expect(body.fieldErrors).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'name' })]),
    );
  });

  it('maps unknown errors to INTERNAL without leaking details', async () => {
    const res = await buildTestApp().request('/test/unknown');

    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toEqual({
      code: 'INTERNAL',
      message: 'Internal server error',
    });
  });

  it('returns a NOT_FOUND envelope for unmatched routes', async () => {
    const res = await buildTestApp().request('/nope');

    expect(res.status).toBe(404);
    await expect(res.json()).resolves.toEqual({ code: 'NOT_FOUND', message: 'Not found' });
  });
});
