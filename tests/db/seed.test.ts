import argon2 from 'argon2';
import { eq } from 'drizzle-orm';
import { afterEach, describe, expect, it } from 'vitest';
import { createPgliteDb, migratePgliteDb } from '../../src/db/pglite.js';
import * as schema from '../../src/db/schema/index.js';
import { runSeed } from '../../src/db/seed/run-seed.js';

describe('db seed', () => {
  let dbs: Array<{ $client: { close: () => Promise<void> } }> = [];

  afterEach(async () => {
    await Promise.all(dbs.map((db) => db.$client.close()));
    dbs = [];
  });

  it('produces the SPEC §8 deterministic dataset (row counts, role accounts, claims, disputed result)', async () => {
    const db = createPgliteDb();
    dbs.push(db);
    await migratePgliteDb(db);

    const summary = await runSeed(db);

    expect(summary.runners).toBeGreaterThanOrEqual(60);
    expect(summary.events).toBeGreaterThanOrEqual(25);
    expect(summary.eventEditions).toBeGreaterThan(0);
    expect(summary.raceResults).toBeGreaterThanOrEqual(805);
    expect(summary.claims).toBeGreaterThanOrEqual(2);
    expect(summary.integrations).toBeGreaterThanOrEqual(1);
    expect(summary.importCandidates).toBeGreaterThan(0);
    expect(summary.apiKeys).toBe(1);
    expect(summary.organizers).toBe(1);
    expect(summary.phLocations).toBeGreaterThan(0);

    const verifiedResults = await db
      .select()
      .from(schema.raceResults)
      .where(eq(schema.raceResults.status, 'verified'));
    expect(verifiedResults.length).toBeGreaterThanOrEqual(800);

    const splitResults = verifiedResults.filter((result) => result.splits !== null);
    const splitRatio = splitResults.length / verifiedResults.length;
    expect(splitRatio).toBeGreaterThan(0.25);
    expect(splitRatio).toBeLessThan(0.55);

    const disputedResults = await db
      .select()
      .from(schema.raceResults)
      .where(eq(schema.raceResults.status, 'disputed'));
    expect(disputedResults.length).toBeGreaterThanOrEqual(1);

    const pendingClaims = await db
      .select()
      .from(schema.claims)
      .where(eq(schema.claims.status, 'pending'));
    expect(pendingClaims.length).toBeGreaterThanOrEqual(2);

    const roleAccounts = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, 'runner@rekord.ph'));
    const runnerAccount = roleAccounts[0];
    expect(runnerAccount).toBeDefined();
    expect(runnerAccount?.role).toBe('runner');
    expect(runnerAccount?.runnerId).not.toBeNull();
    expect(runnerAccount?.passwordHash).not.toContain('Rekord123!');
    await expect(argon2.verify(runnerAccount?.passwordHash as string, 'Rekord123!')).resolves.toBe(
      true,
    );

    const [organizerAccount] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, 'organizer@rekord.ph'));
    expect(organizerAccount?.role).toBe('organizer');
    expect(organizerAccount?.organizerId).not.toBeNull();

    const [adminAccount] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, 'admin@rekord.ph'));
    expect(adminAccount?.role).toBe('admin');

    const organizerApiKeys = await db.select().from(schema.apiKeys);
    expect(organizerApiKeys).toHaveLength(1);
    expect(organizerApiKeys[0]?.keyHash).toMatch(/^[0-9a-f]{64}$/);

    // The partial unique index must still hold: only one *pending* claim per (user, runner).
    if (organizerAccount && runnerAccount) {
      await expect(
        db.insert(schema.claims).values({
          userId: organizerAccount.id,
          runnerId: runnerAccount.runnerId as string,
          method: 'email_code',
          status: 'pending',
        }),
      ).resolves.toBeDefined();
      await expect(
        db.insert(schema.claims).values({
          userId: organizerAccount.id,
          runnerId: runnerAccount.runnerId as string,
          method: 'email_code',
          status: 'pending',
        }),
      ).rejects.toThrow();
    }
  }, 30000);

  it('is deterministic: two fresh runs produce the same counts and the same runner/event identities', async () => {
    const dbA = createPgliteDb();
    const dbB = createPgliteDb();
    dbs.push(dbA, dbB);
    await Promise.all([migratePgliteDb(dbA), migratePgliteDb(dbB)]);

    const [summaryA, summaryB] = await Promise.all([runSeed(dbA), runSeed(dbB)]);
    expect(summaryA).toEqual(summaryB);

    const [runnersA, runnersB] = await Promise.all([
      dbA.select({ name: schema.runners.displayName }).from(schema.runners),
      dbB.select({ name: schema.runners.displayName }).from(schema.runners),
    ]);
    expect(runnersA.map((r) => r.name).sort()).toEqual(runnersB.map((r) => r.name).sort());

    const [eventsA, eventsB] = await Promise.all([
      dbA.select({ slug: schema.events.slug }).from(schema.events),
      dbB.select({ slug: schema.events.slug }).from(schema.events),
    ]);
    expect(eventsA.map((e) => e.slug).sort()).toEqual(eventsB.map((e) => e.slug).sort());
  }, 30000);
});
