import { date, index, numeric, pgTable, uuid } from 'drizzle-orm/pg-core';
import { id, timestamptzNow } from './columns.js';
import { distanceCategoryEnum, goalTypeEnum } from './enums.js';
import { runners } from './runners.js';

/** No status/progress column — both are computed at read time from race_results (SPEC §6). */
export const goals = pgTable(
  'goals',
  {
    id: id(),
    runnerId: uuid()
      .notNull()
      .references(() => runners.id),
    type: goalTypeEnum().notNull(),
    distanceCategory: distanceCategoryEnum(),
    targetValue: numeric({ mode: 'number' }).notNull(),
    deadline: date(),
    createdAt: timestamptzNow(),
  },
  (t) => [index('goals_runner_id_idx').on(t.runnerId)],
);
