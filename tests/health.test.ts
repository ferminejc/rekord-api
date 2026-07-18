import { afterEach, describe, expect, it } from 'vitest';
import { createTestApp, type TestApp } from './helpers/createTestApp.js';

describe('GET /api/v1/health', () => {
  let testApp: TestApp;

  afterEach(async () => {
    await testApp?.close();
  });

  it('returns ok status in the standard envelope', async () => {
    testApp = await createTestApp();

    const res = await testApp.app.request('/api/v1/health');

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ data: { status: 'ok' } });
  });
});
