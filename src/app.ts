import { Hono } from 'hono';
import { ok } from './lib/envelope.js';

export const app = new Hono();

app.get('/api/v1/health', (c) => c.json(ok({ status: 'ok' })));

export default app;
