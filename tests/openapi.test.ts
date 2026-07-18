import { createRoute, z } from '@hono/zod-openapi';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { envelopeSchema } from '../src/lib/envelope.js';

describe('OpenAPI infrastructure', () => {
  it('serves the generated OpenAPI document with the health route registered', async () => {
    const app = createApp();

    const res = await app.request('/openapi.json');

    expect(res.status).toBe(200);
    const doc = (await res.json()) as {
      openapi: string;
      info: { title: string };
      paths: Record<string, unknown>;
    };
    expect(doc.openapi).toBe('3.0.0');
    expect(doc.info.title).toBe('rekord-api');
    expect(doc.paths).toHaveProperty('/api/v1/health');
  });

  it('resolves servers.url + a documented path to a real, working route', async () => {
    const app = createApp();

    const res = await app.request('/openapi.json');
    const doc = (await res.json()) as {
      servers: Array<{ url: string }>;
      paths: Record<string, unknown>;
    };

    const serverUrl = doc.servers[0]?.url ?? '';
    const [path] = Object.keys(doc.paths);
    const resolvedUrl = `${serverUrl.replace(/\/$/, '')}${path}`;

    const resolvedRes = await app.request(resolvedUrl);
    expect(resolvedRes.status).toBe(200);
  });

  it('serves the Scalar API reference UI at /docs', async () => {
    const app = createApp();

    const res = await app.request('/docs');

    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/html');
  });

  it('maps route validation failures to the standard error envelope via defaultHook', async () => {
    const app = createApp();
    const testRoute = createRoute({
      method: 'get',
      path: '/test/openapi-validation',
      request: { query: z.object({ q: z.string() }) },
      responses: {
        200: {
          description: 'ok',
          content: { 'application/json': { schema: envelopeSchema(z.object({ q: z.string() })) } },
        },
      },
    });
    app.openapi(testRoute, (c) => c.json({ data: { q: c.req.valid('query').q } }, 200));

    const res = await app.request('/test/openapi-validation');

    expect(res.status).toBe(400);
    const body = (await res.json()) as {
      code: string;
      fieldErrors: Array<{ field: string; message: string }>;
    };
    expect(body.code).toBe('VALIDATION_FAILED');
    expect(body.fieldErrors).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'q' })]),
    );
  });
});
