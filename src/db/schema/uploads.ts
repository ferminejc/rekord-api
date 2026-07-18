import { index, integer, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { id, timestamptzNow } from './columns.js';
import { uploadPurposeEnum } from './enums.js';
import { users } from './users.js';

export const uploads = pgTable(
  'uploads',
  {
    id: id(),
    ownerUserId: uuid()
      .notNull()
      .references(() => users.id),
    purpose: uploadPurposeEnum().notNull(),
    mime: text().notNull(),
    sizeBytes: integer().notNull(),
    storageKey: text().notNull(),
    url: text().notNull(),
    createdAt: timestamptzNow(),
  },
  (t) => [index('uploads_owner_user_id_idx').on(t.ownerUserId)],
);
