import { index, jsonb, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { id, timestamptzNow } from './columns.js';
import { users } from './users.js';

/** Written in the same transaction as every admin mutation. */
export const auditLog = pgTable(
  'audit_log',
  {
    id: id(),
    actorId: uuid()
      .notNull()
      .references(() => users.id),
    action: text().notNull(),
    targetType: text().notNull(),
    targetId: uuid().notNull(),
    details: jsonb().$type<Record<string, unknown>>(),
    createdAt: timestamptzNow(),
  },
  (t) => [
    index('audit_log_actor_id_idx').on(t.actorId),
    index('audit_log_created_at_idx').on(t.createdAt.desc()),
  ],
);
