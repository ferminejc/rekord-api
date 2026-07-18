import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import type { Schema } from './pglite.js';

export type { Schema };
export type Db = PgDatabase<PgQueryResultHKT, Schema>;
