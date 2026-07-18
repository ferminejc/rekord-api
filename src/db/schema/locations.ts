import { pgTable, text, uniqueIndex } from 'drizzle-orm/pg-core';
import { id } from './columns.js';

/** Seeded from a bundled PSGC-based JSON file; validates event/runner locations at the service layer. */
export const phLocations = pgTable(
  'ph_locations',
  {
    id: id(),
    region: text().notNull(),
    province: text().notNull(),
    city: text().notNull(),
  },
  (t) => [uniqueIndex('ph_locations_region_province_city_idx').on(t.region, t.province, t.city)],
);
