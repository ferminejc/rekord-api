import { boolean, char, index, integer, pgTable, text } from 'drizzle-orm/pg-core';
import { id, timestamptzNow } from './columns.js';
import { genderEnum } from './enums.js';

export const runners = pgTable(
  'runners',
  {
    id: id(),
    firstName: text().notNull(),
    lastName: text().notNull(),
    displayName: text().notNull(),
    photoUrl: text(),
    nationality: char({ length: 2 }).notNull().default('PH'),
    city: text(),
    province: text(),
    region: text(),
    club: text(),
    gender: genderEnum(),
    birthYear: integer(),
    bio: text(),
    isClaimed: boolean().notNull().default(false),
    isVerified: boolean().notNull().default(false),
    hideAge: boolean().notNull().default(false),
    hideClub: boolean().notNull().default(false),
    createdAt: timestamptzNow(),
  },
  (t) => [
    // TODO(rekord-api): switch to a pg_trgm GIN index (similarity + prefix search) once the
    // Phase 3 runners search/suggest endpoints land — see DECISIONS.md.
    index('runners_display_name_idx').on(t.displayName),
  ],
);
