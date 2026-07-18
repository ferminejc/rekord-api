import { index, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { id, timestamptzNow } from './columns.js';
import { userRoleEnum } from './enums.js';
import { organizers } from './organizer.js';
import { runners } from './runners.js';

export interface UserProviders {
  google?: string;
  apple?: string;
}

export const users = pgTable('users', {
  id: id(),
  email: text().notNull().unique(),
  /** Nullable — social-only accounts have no password. */
  passwordHash: text(),
  displayName: text().notNull(),
  role: userRoleEnum().notNull(),
  runnerId: uuid().references(() => runners.id),
  organizerId: uuid().references(() => organizers.id),
  providers: jsonb().$type<UserProviders>(),
  deletionRequestedAt: timestamp({ withTimezone: true }),
  createdAt: timestamptzNow(),
});

export const refreshTokens = pgTable(
  'refresh_tokens',
  {
    id: id(),
    userId: uuid()
      .notNull()
      .references(() => users.id),
    tokenHash: text().notNull().unique(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    revokedAt: timestamp({ withTimezone: true }),
  },
  (t) => [index('refresh_tokens_user_id_idx').on(t.userId)],
);
