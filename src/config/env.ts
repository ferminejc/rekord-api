import { z } from 'zod';

function csvList(fallback: string) {
  return z
    .string()
    .default(fallback)
    .transform((value) =>
      value
        .split(',')
        .map((item) => item.trim())
        .filter((item) => item.length > 0),
    );
}

const DEV_JWT_SECRET = 'dev-insecure-secret-change-me';

export const EnvSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(3000),
    DATABASE_URL: z.string().default('postgres://user:password@localhost:5432/rekord'),
    JWT_SECRET: z.string().min(1).default(DEV_JWT_SECRET),
    APP_ORIGINS: csvList('http://localhost:3000'),
    PROVIDERS: csvList('fake'),
  })
  .superRefine((value, ctx) => {
    if (value.NODE_ENV === 'production' && value.JWT_SECRET === DEV_JWT_SECRET) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['JWT_SECRET'],
        message:
          'JWT_SECRET must be set to a real secret in production — refusing the insecure dev default.',
      });
    }
  });

export type Env = z.infer<typeof EnvSchema>;

export const env: Env = EnvSchema.parse(process.env);
