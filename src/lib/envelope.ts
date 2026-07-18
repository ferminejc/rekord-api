import { z } from '@hono/zod-openapi';

export interface Envelope<T> {
  data: T;
  meta?: Record<string, unknown>;
}

export function ok<T>(data: T, meta?: Record<string, unknown>): Envelope<T> {
  return meta ? { data, meta } : { data };
}

export function envelopeSchema<T extends z.ZodTypeAny>(dataSchema: T) {
  return z.object({
    data: dataSchema,
    meta: z.record(z.string(), z.unknown()).optional(),
  });
}

export const ErrorEnvelopeSchema = z.object({
  code: z.string(),
  message: z.string(),
  fieldErrors: z.array(z.object({ field: z.string(), message: z.string() })).optional(),
});
