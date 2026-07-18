import { date, index, integer, jsonb, pgTable, text, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { id } from './columns.js';
import { terrainEnum } from './enums.js';
import { organizers } from './organizer.js';

export const events = pgTable(
  'events',
  {
    id: id(),
    name: text().notNull(),
    slug: text().notNull().unique(),
    city: text().notNull(),
    province: text().notNull(),
    region: text().notNull(),
    website: text(),
    description: text(),
    distances: jsonb().$type<string[]>().notNull(),
    terrain: terrainEnum().notNull(),
    organizerId: uuid().references(() => organizers.id),
    logoUrl: text(),
  },
  (t) => [
    // TODO(rekord-api): switch to a pg_trgm GIN index once the Phase 3 events search lands.
    index('events_name_idx').on(t.name),
  ],
);

export const eventEditions = pgTable(
  'event_editions',
  {
    id: id(),
    eventId: uuid()
      .notNull()
      .references(() => events.id),
    year: integer().notNull(),
    date: date().notNull(),
    resultsCount: integer().notNull().default(0),
  },
  (t) => [uniqueIndex('event_editions_event_id_year_idx').on(t.eventId, t.year)],
);
