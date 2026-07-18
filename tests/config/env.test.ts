import { describe, expect, it } from 'vitest';
import { EnvSchema } from '../../src/config/env.js';

describe('env', () => {
  it('rejects the insecure default JWT_SECRET in production', () => {
    expect(() =>
      EnvSchema.parse({ NODE_ENV: 'production', DATABASE_URL: 'postgres://user:pass@host/db' }),
    ).toThrow(/JWT_SECRET/);
  });

  it('accepts an explicit JWT_SECRET in production', () => {
    expect(() =>
      EnvSchema.parse({
        NODE_ENV: 'production',
        DATABASE_URL: 'postgres://user:pass@host/db',
        JWT_SECRET: 'a-real-production-secret',
      }),
    ).not.toThrow();
  });

  it('allows the insecure dev default outside production', () => {
    expect(() => EnvSchema.parse({ NODE_ENV: 'development' })).not.toThrow();
    expect(() => EnvSchema.parse({ NODE_ENV: 'test' })).not.toThrow();
  });
});
