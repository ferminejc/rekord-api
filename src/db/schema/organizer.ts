import { boolean, index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { id, timestamptzNow } from './columns.js';

export const organizers = pgTable('organizers', {
  id: id(),
  name: text().notNull(),
  website: text(),
  verified: boolean().notNull().default(false),
});

export const apiKeys = pgTable(
  'api_keys',
  {
    id: id(),
    organizerId: uuid()
      .notNull()
      .references(() => organizers.id),
    label: text().notNull(),
    /** Plaintext key is shown once at creation; only the hash is persisted. */
    keyHash: text().notNull().unique(),
    createdAt: timestamptzNow(),
    lastUsedAt: timestamp({ withTimezone: true }),
    revokedAt: timestamp({ withTimezone: true }),
  },
  (t) => [index('api_keys_organizer_id_idx').on(t.organizerId)],
);
