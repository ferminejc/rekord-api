import { date, index, integer, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { id } from './columns.js';
import {
  distanceCategoryEnum,
  eventTypeEnum,
  resultSourceEnum,
  resultStatusEnum,
  terrainEnum,
} from './enums.js';
import { eventEditions, events } from './events.js';
import { runners } from './runners.js';

export interface Split {
  label: string;
  distanceMeters: number;
  cumulativeMs: number;
}

export const raceResults = pgTable(
  'race_results',
  {
    id: id(),
    runnerId: uuid()
      .notNull()
      .references(() => runners.id),
    eventId: uuid().references(() => events.id),
    editionId: uuid().references(() => eventEditions.id),
    eventName: text().notNull(),
    editionYear: integer().notNull(),
    date: date().notNull(),
    location: text().notNull(),
    distanceCategory: distanceCategoryEnum().notNull(),
    distanceMeters: integer().notNull(),
    officialTimeMs: integer().notNull(),
    overallRank: integer(),
    genderRank: integer(),
    ageGroupRank: integer(),
    ageGroup: text(),
    fieldSize: integer(),
    bib: text(),
    /** Only ever read alongside their result — never queried independently. */
    splits: jsonb().$type<Split[]>(),
    terrain: terrainEnum().notNull(),
    eventType: eventTypeEnum().notNull(),
    source: resultSourceEnum().notNull(),
    status: resultStatusEnum().notNull(),
    weather: text(),
    notes: text(),
    evidenceUrl: text(),
    deletedAt: timestamp({ withTimezone: true }),
  },
  (t) => [
    index('race_results_runner_id_date_idx').on(t.runnerId, t.date.desc()),
    index('race_results_edition_distance_time_idx').on(
      t.editionId,
      t.distanceCategory,
      t.officialTimeMs,
    ),
  ],
);
