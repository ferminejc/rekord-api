import { afterEach, describe, expect, it } from 'vitest';
import * as schema from '../../src/db/schema/index.js';
import { createTestApp, type TestApp } from '../helpers/createTestApp.js';

describe('database migrations', () => {
  let testApp: TestApp;

  afterEach(async () => {
    await testApp?.close();
  });

  it('creates every table so it can be queried immediately after migrating', async () => {
    testApp = await createTestApp();
    const { db } = testApp;

    const tables = [
      schema.users,
      schema.refreshTokens,
      schema.runners,
      schema.organizers,
      schema.events,
      schema.eventEditions,
      schema.raceResults,
      schema.claims,
      schema.editRequests,
      schema.goals,
      schema.integrations,
      schema.importCandidates,
      schema.apiKeys,
      schema.uploads,
      schema.auditLog,
      schema.phLocations,
    ];

    for (const table of tables) {
      await expect(db.select().from(table)).resolves.toEqual([]);
    }
  });

  it('wires foreign keys and round-trips jsonb across a representative insert chain', async () => {
    testApp = await createTestApp();
    const { db } = testApp;

    const [organizer] = await db
      .insert(schema.organizers)
      .values({ name: 'Milo Marathon' })
      .returning();
    const [event] = await db
      .insert(schema.events)
      .values({
        name: 'Milo Marathon Manila',
        slug: 'milo-marathon-manila',
        city: 'Manila',
        province: 'Metro Manila',
        region: 'NCR',
        distances: ['five_k', 'ten_k', 'marathon'],
        terrain: 'road',
        organizerId: organizer?.id,
      })
      .returning();
    const [runner] = await db
      .insert(schema.runners)
      .values({ firstName: 'Juan', lastName: 'Dela Cruz', displayName: 'Juan Dela Cruz' })
      .returning();
    const [result] = await db
      .insert(schema.raceResults)
      .values({
        runnerId: runner?.id as string,
        eventId: event?.id,
        eventName: event?.name as string,
        editionYear: 2026,
        date: '2026-02-15',
        location: 'Manila',
        distanceCategory: 'marathon',
        distanceMeters: 42195,
        officialTimeMs: 12_600_000,
        terrain: 'road',
        eventType: 'individual',
        source: 'official',
        status: 'verified',
        splits: [{ label: '10K', distanceMeters: 10_000, cumulativeMs: 3_000_000 }],
      })
      .returning();

    expect(result?.eventId).toBe(event?.id);
    expect(result?.splits).toEqual([
      { label: '10K', distanceMeters: 10_000, cumulativeMs: 3_000_000 },
    ]);
  });

  it('enforces the partial unique index: only one pending claim per (user, runner)', async () => {
    testApp = await createTestApp();
    const { db } = testApp;

    const [runner] = await db
      .insert(schema.runners)
      .values({ firstName: 'Ana', lastName: 'Reyes', displayName: 'Ana Reyes' })
      .returning();
    const [user] = await db
      .insert(schema.users)
      .values({ email: 'ana@example.com', displayName: 'Ana Reyes', role: 'runner' })
      .returning();

    await db.insert(schema.claims).values({
      userId: user?.id as string,
      runnerId: runner?.id as string,
      method: 'email_code',
      status: 'pending',
    });

    await expect(
      db.insert(schema.claims).values({
        userId: user?.id as string,
        runnerId: runner?.id as string,
        method: 'email_code',
        status: 'pending',
      }),
    ).rejects.toThrow();

    // A resolved claim for the same pair doesn't collide with the still-pending one.
    await expect(
      db.insert(schema.claims).values({
        userId: user?.id as string,
        runnerId: runner?.id as string,
        method: 'social_match',
        status: 'rejected',
      }),
    ).resolves.toBeDefined();
  });
});
