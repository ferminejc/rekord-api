import { afterEach, describe, expect, it } from 'vitest';
import { ErrorEnvelopeSchema } from '../../src/lib/envelope.js';
import { requireAuth } from '../../src/middleware/auth.js';
import { requireRole } from '../../src/middleware/rbac.js';
import { AuthResponseSchema } from '../../src/modules/auth/auth.schemas.js';
import { createTestApp, type TestApp } from '../helpers/createTestApp.js';

async function register(testApp: TestApp, overrides: Partial<Record<string, string>> = {}) {
  return testApp.app.request('/api/v1/auth/register', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email: 'ana.runner@example.com',
      password: 'correct-horse',
      displayName: 'Ana Runner',
      ...overrides,
    }),
  });
}

async function parseAuthResponse(res: Response) {
  return AuthResponseSchema.parse(await res.json());
}

async function parseErrorResponse(res: Response) {
  return ErrorEnvelopeSchema.parse(await res.json());
}

describe('auth module', () => {
  let testApp: TestApp;

  afterEach(async () => {
    await testApp?.close();
  });

  it('registers a new runner account and issues tokens', async () => {
    testApp = await createTestApp();

    const res = await register(testApp);

    expect(res.status).toBe(201);
    expect(res.headers.get('x-request-id')).toBeTruthy();
    const body = await parseAuthResponse(res);
    expect(body.data.accessToken).toEqual(expect.any(String));
    expect(body.data.refreshToken).toEqual(expect.any(String));
    expect(body.data.user).toMatchObject({
      email: 'ana.runner@example.com',
      displayName: 'Ana Runner',
      role: 'runner',
      runnerId: null,
      organizerId: null,
    });
  });

  it('rejects registration with a duplicate email', async () => {
    testApp = await createTestApp();
    await register(testApp);

    const res = await register(testApp, { displayName: 'Someone Else' });

    expect(res.status).toBe(409);
    const body = await parseErrorResponse(res);
    expect(body.code).toBe('CONFLICT');
  });

  it('resolves two concurrent registrations for the same email to one 201 and one 409, never 500', async () => {
    testApp = await createTestApp();

    const [first, second] = await Promise.all([
      register(testApp, { displayName: 'First' }),
      register(testApp, { displayName: 'Second' }),
    ]);

    const statuses = [first.status, second.status].sort();
    expect(statuses).toEqual([201, 409]);
  });

  it('rejects registration with an invalid payload', async () => {
    testApp = await createTestApp();

    const res = await register(testApp, { email: 'not-an-email', password: 'short' });

    expect(res.status).toBe(400);
    const body = await parseErrorResponse(res);
    expect(body.code).toBe('VALIDATION_FAILED');
    expect(body.fieldErrors?.length).toBeGreaterThan(0);
  });

  it('logs in with correct credentials and rejects incorrect ones', async () => {
    testApp = await createTestApp();
    await register(testApp);

    const goodLogin = await testApp.app.request('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'ana.runner@example.com', password: 'correct-horse' }),
    });
    expect(goodLogin.status).toBe(200);
    const goodBody = await parseAuthResponse(goodLogin);
    expect(goodBody.data.user.email).toBe('ana.runner@example.com');

    const wrongPassword = await testApp.app.request('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'ana.runner@example.com', password: 'wrong-password' }),
    });
    expect(wrongPassword.status).toBe(401);

    const unknownEmail = await testApp.app.request('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'nobody@example.com', password: 'correct-horse' }),
    });
    expect(unknownEmail.status).toBe(401);
    expect((await parseErrorResponse(unknownEmail)).code).toBe('UNAUTHORIZED');
  });
});

describe('requireAuth + requireRole middleware', () => {
  let testApp: TestApp;

  afterEach(async () => {
    await testApp?.close();
  });

  it('enforces bearer auth and role checks on a protected route', async () => {
    testApp = await createTestApp();
    testApp.app.use('/api/v1/test/admin-only', requireAuth(), requireRole('admin'));
    testApp.app.get('/api/v1/test/admin-only', (c) => c.json({ ok: true }));

    const noToken = await testApp.app.request('/api/v1/test/admin-only');
    expect(noToken.status).toBe(401);

    const registerRes = await register(testApp);
    const { data } = await parseAuthResponse(registerRes);

    const wrongRole = await testApp.app.request('/api/v1/test/admin-only', {
      headers: { authorization: `Bearer ${data.accessToken}` },
    });
    expect(wrongRole.status).toBe(403);

    const invalidToken = await testApp.app.request('/api/v1/test/admin-only', {
      headers: { authorization: 'Bearer not-a-real-token' },
    });
    expect(invalidToken.status).toBe(401);
  });

  it('allows access when the role matches', async () => {
    testApp = await createTestApp();
    testApp.app.use('/api/v1/test/runner-only', requireAuth(), requireRole('runner'));
    testApp.app.get('/api/v1/test/runner-only', (c) => c.json({ ok: true }));

    const registerRes = await register(testApp);
    const { data } = await parseAuthResponse(registerRes);

    const res = await testApp.app.request('/api/v1/test/runner-only', {
      headers: { authorization: `Bearer ${data.accessToken}` },
    });
    expect(res.status).toBe(200);
  });
});
