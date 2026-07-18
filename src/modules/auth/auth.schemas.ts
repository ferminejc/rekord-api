import { z } from '@hono/zod-openapi';
import { envelopeSchema } from '../../lib/envelope.js';

export const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  displayName: z.string().min(1),
});

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const AuthUserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  displayName: z.string(),
  role: z.enum(['runner', 'organizer', 'admin']),
  runnerId: z.string().uuid().nullable(),
  organizerId: z.string().uuid().nullable(),
});

export const AuthTokensSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  user: AuthUserSchema,
});

export const AuthResponseSchema = envelopeSchema(AuthTokensSchema);
