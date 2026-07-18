export interface Envelope<T> {
  data: T;
  meta?: Record<string, unknown>;
}

export function ok<T>(data: T, meta?: Record<string, unknown>): Envelope<T> {
  return meta ? { data, meta } : { data };
}
