import {
  boolean,
  date,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { id, timestamptzNow } from './columns.js';
import {
  importCandidateStatusEnum,
  integrationProviderEnum,
  integrationStatusEnum,
} from './enums.js';
import { users } from './users.js';

export const integrations = pgTable(
  'integrations',
  {
    id: id(),
    userId: uuid()
      .notNull()
      .references(() => users.id),
    provider: integrationProviderEnum().notNull(),
    /** AES-GCM encrypted at rest; key from env. */
    accessTokenEnc: text().notNull(),
    refreshTokenEnc: text().notNull(),
    status: integrationStatusEnum().notNull().default('connected'),
    connectedAt: timestamptzNow(),
    lastSyncAt: timestamp({ withTimezone: true }),
    autoImport: boolean().notNull().default(false),
  },
  (t) => [uniqueIndex('integrations_user_id_provider_idx').on(t.userId, t.provider)],
);

export const importCandidates = pgTable(
  'import_candidates',
  {
    id: id(),
    integrationId: uuid()
      .notNull()
      .references(() => integrations.id),
    externalId: text().notNull(),
    name: text().notNull(),
    date: date().notNull(),
    distanceMeters: integer().notNull(),
    elapsedMs: integer().notNull(),
    status: importCandidateStatusEnum().notNull().default('pending'),
  },
  (t) => [
    uniqueIndex('import_candidates_integration_id_external_id_idx').on(
      t.integrationId,
      t.externalId,
    ),
  ],
);
