import { sql } from 'drizzle-orm';
import { jsonb, pgTable, text, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { id, timestamptzNow } from './columns.js';
import { claimMethodEnum, reviewStatusEnum } from './enums.js';
import { raceResults } from './results.js';
import { runners } from './runners.js';
import { users } from './users.js';

export const claims = pgTable(
  'claims',
  {
    id: id(),
    userId: uuid()
      .notNull()
      .references(() => users.id),
    runnerId: uuid()
      .notNull()
      .references(() => runners.id),
    method: claimMethodEnum().notNull(),
    evidenceUrl: text(),
    status: reviewStatusEnum().notNull().default('pending'),
    submittedAt: timestamptzNow(),
    reviewedBy: uuid().references(() => users.id),
    reviewNote: text(),
  },
  (t) => [
    // Only one *pending* claim per (user, runner) — approved/rejected claims don't block a retry.
    uniqueIndex('claims_pending_user_runner_idx')
      .on(t.userId, t.runnerId)
      .where(sql`${t.status} = 'pending'`),
  ],
);

export const editRequests = pgTable('edit_requests', {
  id: id(),
  resultId: uuid()
    .notNull()
    .references(() => raceResults.id),
  requestedBy: uuid()
    .notNull()
    .references(() => users.id),
  proposedChanges: jsonb().$type<Record<string, unknown>>().notNull(),
  reason: text().notNull(),
  status: reviewStatusEnum().notNull().default('pending'),
  createdAt: timestamptzNow(),
  resolvedBy: uuid().references(() => users.id),
});
