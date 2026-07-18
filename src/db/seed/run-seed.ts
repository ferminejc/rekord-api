import { createHash } from 'node:crypto';
import argon2 from 'argon2';
import { eq } from 'drizzle-orm';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import * as schema from '../schema/index.js';
import type { Split } from '../schema/results.js';
import {
  DISTANCE_METERS,
  type DistanceCategory,
  EVENT_FIXTURES,
  FILIPINO_FIRST_NAMES,
  FILIPINO_LAST_NAMES,
  FOREIGN_RUNNERS,
  RUNNING_CLUBS,
} from './data/fixtures.js';
import phLocationsData from './data/ph_locations.json' with { type: 'json' };
import { chance, createSeededRandom, pick, type Random, randomInt, shuffle } from './prng.js';

/** Fixed seed — the dataset's structure, counts, and relationships must reproduce every run. */
const SEED = 20260718;
const SEED_ACCOUNT_PASSWORD = 'Rekord123!';
const EDITION_YEARS = [2021, 2022, 2023, 2024, 2025];

export interface SeedResult {
  phLocations: number;
  organizers: number;
  events: number;
  eventEditions: number;
  runners: number;
  users: number;
  raceResults: number;
  claims: number;
  integrations: number;
  importCandidates: number;
  apiKeys: number;
}

const PACE_RANGE_SEC_PER_KM: Record<DistanceCategory, [number, number]> = {
  five_k: [240, 420],
  ten_k: [255, 435],
  half_marathon: [270, 450],
  marathon: [285, 480],
  ultra: [360, 600],
  custom: [270, 450],
};

const AGE_GROUP_FLOORS = [18, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70];

function firstOrThrow<T>(rows: T[], message: string): T {
  const row = rows[0];
  if (!row) throw new Error(message);
  return row;
}

function randomDateString(random: Random, year: number): string {
  const month = String(randomInt(random, 1, 12)).padStart(2, '0');
  const day = String(randomInt(random, 1, 28)).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function ageGroupFor(age: number): string {
  if (age < 18) return 'U18';
  for (let i = AGE_GROUP_FLOORS.length - 1; i >= 0; i--) {
    const floor = AGE_GROUP_FLOORS[i] as number;
    if (age >= floor) {
      return floor === 70 ? '70+' : `${floor}-${(AGE_GROUP_FLOORS[i + 1] as number) - 1}`;
    }
  }
  return 'U18';
}

function randomHex(random: Random, byteLength: number): string {
  let hex = '';
  for (let i = 0; i < byteLength; i++) {
    hex += randomInt(random, 0, 255).toString(16).padStart(2, '0');
  }
  return hex;
}

function generateOfficialTimeMs(
  random: Random,
  distanceCategory: DistanceCategory,
  distanceMeters: number,
): number {
  const [min, max] = PACE_RANGE_SEC_PER_KM[distanceCategory];
  const paceSecPerKm = randomInt(random, min, max);
  return Math.round(paceSecPerKm * (distanceMeters / 1000) * 1000);
}

/** 1K splits for 5K-or-shorter races, 5K splits otherwise — never an empty array on its own. */
function generateSplits(random: Random, distanceMeters: number, officialTimeMs: number): Split[] {
  const step = distanceMeters <= 5000 ? 1000 : 5000;
  const splits: Split[] = [];
  for (
    let cumulativeDistance = step;
    cumulativeDistance < distanceMeters;
    cumulativeDistance += step
  ) {
    const fraction = cumulativeDistance / distanceMeters;
    const jitter = randomInt(random, -20, 20) / 1000;
    const cumulativeMs = Math.max(1, Math.round(officialTimeMs * (fraction + jitter)));
    splits.push({
      label: `${cumulativeDistance / 1000}K`,
      distanceMeters: cumulativeDistance,
      cumulativeMs,
    });
  }
  return splits;
}

interface RunnerSeed {
  firstName: string;
  lastName: string;
  displayName: string;
  nationality: string;
  city: string | null;
  province: string | null;
  region: string | null;
  club: string | null;
  gender: 'male' | 'female';
  birthYear: number;
  bio: string | null;
  isClaimed: boolean;
  isVerified: boolean;
  hideAge: boolean;
  hideClub: boolean;
}

function buildRunners(
  random: Random,
  locations: readonly { city: string; province: string; region: string }[],
): RunnerSeed[] {
  const runners: RunnerSeed[] = [];

  for (let i = 0; i < 58; i++) {
    const firstName = pick(random, FILIPINO_FIRST_NAMES);
    const lastName = pick(random, FILIPINO_LAST_NAMES);
    const location = pick(random, locations);
    const hasClub = chance(random, 0.65);

    runners.push({
      firstName,
      lastName,
      displayName: `${firstName} ${lastName}`,
      nationality: 'PH',
      city: location.city,
      province: location.province,
      region: location.region,
      club: hasClub ? pick(random, RUNNING_CLUBS) : null,
      gender: chance(random, 0.5) ? 'male' : 'female',
      birthYear: randomInt(random, 1965, 2008),
      bio: chance(random, 0.2) ? 'Weekend warrior chasing a new PB every season.' : null,
      isClaimed: false,
      isVerified: false,
      hideAge: chance(random, 0.1),
      hideClub: chance(random, 0.1),
    });
  }

  for (const foreign of FOREIGN_RUNNERS) {
    runners.push({
      firstName: foreign.firstName,
      lastName: foreign.lastName,
      displayName: `${foreign.firstName} ${foreign.lastName}`,
      nationality: foreign.nationality,
      city: null,
      province: null,
      region: null,
      club: null,
      gender: chance(random, 0.5) ? 'male' : 'female',
      birthYear: randomInt(random, 1970, 2005),
      bio: null,
      isClaimed: false,
      isVerified: false,
      hideAge: false,
      hideClub: false,
    });
  }

  // Showcase runner #0 gets claimed+verified (backs runner@rekord.ph); #1 and #2 stay
  // unclaimed here but are linked via pending claims once users are inserted below.
  const showcaseRunner = runners[0];
  if (!showcaseRunner) throw new Error('seed: expected at least one runner to showcase');
  showcaseRunner.isClaimed = true;
  showcaseRunner.isVerified = true;

  return runners;
}

export async function runSeed<TDb extends PgDatabase<PgQueryResultHKT, typeof schema>>(
  db: TDb,
): Promise<SeedResult> {
  const random = createSeededRandom(SEED);

  const insertedLocations = await db.insert(schema.phLocations).values(phLocationsData).returning();

  const organizer = firstOrThrow(
    await db
      .insert(schema.organizers)
      .values({
        name: 'Rekord Race Organizers',
        website: 'https://rekord.ph/organizers',
        verified: true,
      })
      .returning(),
    'seed: organizer insert returned no row',
  );

  const insertedEvents: Array<
    typeof schema.events.$inferSelect & { distances: DistanceCategory[] }
  > = [];
  for (const fixture of EVENT_FIXTURES) {
    const event = firstOrThrow(
      await db
        .insert(schema.events)
        .values({
          name: fixture.name,
          slug: fixture.slug,
          city: fixture.city,
          province: fixture.province,
          region: fixture.region,
          distances: fixture.distances,
          terrain: fixture.terrain,
          organizerId: organizer.id,
        })
        .returning(),
      `seed: event insert returned no row for ${fixture.slug}`,
    );
    insertedEvents.push({ ...event, distances: fixture.distances });
  }

  const insertedEditions: Array<
    typeof schema.eventEditions.$inferSelect & { event: (typeof insertedEvents)[number] }
  > = [];
  for (const event of insertedEvents) {
    const numEditions = randomInt(random, 3, 5);
    const years = shuffle(random, EDITION_YEARS)
      .slice(0, numEditions)
      .sort((a, b) => a - b);
    for (const year of years) {
      const edition = firstOrThrow(
        await db
          .insert(schema.eventEditions)
          .values({
            eventId: event.id,
            year,
            date: randomDateString(random, year),
            resultsCount: 0,
          })
          .returning(),
        `seed: edition insert returned no row for ${event.slug} ${year}`,
      );
      insertedEditions.push({ ...edition, event });
    }
  }

  const runnerSeeds = buildRunners(random, insertedLocations);
  const insertedRunners: (typeof schema.runners.$inferSelect)[] = [];
  for (const runnerSeed of runnerSeeds) {
    const runner = firstOrThrow(
      await db.insert(schema.runners).values(runnerSeed).returning(),
      'seed: runner insert returned no row',
    );
    insertedRunners.push(runner);
  }
  const [claimedRunner0, claimedRunner1, claimedRunner2] = insertedRunners;
  if (!claimedRunner0 || !claimedRunner1 || !claimedRunner2) {
    throw new Error('seed: expected at least three inserted runners to showcase');
  }

  const passwordHash = await argon2.hash(SEED_ACCOUNT_PASSWORD);

  const insertedUsers = await db
    .insert(schema.users)
    .values([
      {
        email: 'runner@rekord.ph',
        passwordHash,
        displayName: claimedRunner0.displayName,
        role: 'runner',
        runnerId: claimedRunner0.id,
      },
      {
        email: 'organizer@rekord.ph',
        passwordHash,
        displayName: 'Rekord Race Organizers',
        role: 'organizer',
        organizerId: organizer.id,
      },
      { email: 'admin@rekord.ph', passwordHash, displayName: 'Rekord Admin', role: 'admin' },
      {
        email: 'ana.reyes@example.com',
        passwordHash,
        displayName: claimedRunner1.displayName,
        role: 'runner',
      },
      {
        email: 'miguel.santos@example.com',
        passwordHash,
        displayName: claimedRunner2.displayName,
        role: 'runner',
      },
    ])
    .returning();
  const usersByEmail = new Map(insertedUsers.map((user) => [user.email, user]));
  const runnerUser = usersByEmail.get('runner@rekord.ph');
  const organizerUser = usersByEmail.get('organizer@rekord.ph');
  const adminUser = usersByEmail.get('admin@rekord.ph');
  const pendingClaimUserA = usersByEmail.get('ana.reyes@example.com');
  const pendingClaimUserB = usersByEmail.get('miguel.santos@example.com');
  if (!runnerUser || !organizerUser || !adminUser || !pendingClaimUserA || !pendingClaimUserB) {
    throw new Error('seed: a role/showcase user insert returned no row');
  }

  const insertedClaims = await db
    .insert(schema.claims)
    .values([
      {
        userId: runnerUser.id,
        runnerId: claimedRunner0.id,
        method: 'email_code',
        status: 'approved',
        reviewedBy: adminUser.id,
        reviewNote: 'Verified via email code prior to launch.',
      },
      {
        userId: pendingClaimUserA.id,
        runnerId: claimedRunner1.id,
        method: 'social_match',
        status: 'pending',
      },
      {
        userId: pendingClaimUserB.id,
        runnerId: claimedRunner2.id,
        method: 'id_document',
        evidenceUrl: 'https://example.com/evidence/id-front.jpg',
        status: 'pending',
      },
    ])
    .returning();

  const integration = firstOrThrow(
    await db
      .insert(schema.integrations)
      .values({
        userId: runnerUser.id,
        provider: 'strava',
        // TODO(rekord-api): real AES-GCM encryption lands with lib/crypto.ts in Phase 6.
        accessTokenEnc: `placeholder-access-${randomHex(random, 8)}`,
        refreshTokenEnc: `placeholder-refresh-${randomHex(random, 8)}`,
        status: 'connected',
        autoImport: true,
      })
      .returning(),
    'seed: integration insert returned no row',
  );

  const importCandidateSeeds = [
    {
      name: 'Morning Easy Run',
      distanceMeters: 8000,
      elapsedMs: 2_700_000,
      status: 'pending' as const,
    },
    {
      name: 'Tempo Intervals',
      distanceMeters: 10000,
      elapsedMs: 2_650_000,
      status: 'pending' as const,
    },
    {
      name: 'Sunday Long Run',
      distanceMeters: 21000,
      elapsedMs: 6_800_000,
      status: 'pending' as const,
    },
    {
      name: 'Recovery Jog',
      distanceMeters: 5000,
      elapsedMs: 1_800_000,
      status: 'dismissed' as const,
    },
  ];
  const insertedImportCandidates = await db
    .insert(schema.importCandidates)
    .values(
      importCandidateSeeds.map((candidate, index) => ({
        integrationId: integration.id,
        externalId: `strava-${1000 + index}`,
        name: candidate.name,
        date: randomDateString(random, 2025),
        distanceMeters: candidate.distanceMeters,
        elapsedMs: candidate.elapsedMs,
        status: candidate.status,
      })),
    )
    .returning();

  const apiKeySecret = randomHex(random, 24);
  firstOrThrow(
    await db
      .insert(schema.apiKeys)
      .values({
        organizerId: organizer.id,
        label: 'Production bulk-import key',
        keyHash: createHash('sha256').update(apiKeySecret).digest('hex'),
      })
      .returning(),
    'seed: api key insert returned no row',
  );

  interface RawResult {
    runnerId: string;
    gender: 'male' | 'female';
    birthYear: number;
    eventId: string;
    editionId: string;
    eventName: string;
    editionYear: number;
    date: string;
    location: string;
    distanceCategory: DistanceCategory;
    distanceMeters: number;
    officialTimeMs: number;
    bib: string;
    splits: Split[] | null;
    terrain: 'road' | 'trail' | 'track' | 'mixed';
    eventType: 'individual' | 'relay' | 'virtual';
    source: 'official' | 'manual' | 'import';
    status: 'verified' | 'pending' | 'disputed';
  }

  const RESULT_PLAN: Array<{
    count: number;
    source: RawResult['source'];
    status: RawResult['status'];
  }> = [
    { count: 805, source: 'official', status: 'verified' },
    { count: 1, source: 'official', status: 'disputed' },
    { count: 5, source: 'manual', status: 'pending' },
    { count: 4, source: 'import', status: 'pending' },
  ];

  const usedCombos = new Set<string>();
  const rawResults: RawResult[] = [];
  for (const plan of RESULT_PLAN) {
    for (let i = 0; i < plan.count; i++) {
      // A runner shouldn't appear twice in the same edition+distance — retry on collision.
      // The combo space (runners x editions x distances) vastly exceeds the draw count, so
      // this resolves within a handful of attempts almost always, and stays deterministic.
      let runner: (typeof insertedRunners)[number];
      let edition: (typeof insertedEditions)[number];
      let distanceCategory: DistanceCategory;
      let comboKey: string;
      let attempts = 0;
      do {
        runner = pick(random, insertedRunners);
        edition = pick(random, insertedEditions);
        distanceCategory = pick(random, edition.event.distances);
        comboKey = `${runner.id}:${edition.id}:${distanceCategory}`;
        attempts++;
      } while (usedCombos.has(comboKey) && attempts < 10);
      usedCombos.add(comboKey);

      const distanceMeters = DISTANCE_METERS[distanceCategory];
      const officialTimeMs = generateOfficialTimeMs(random, distanceCategory, distanceMeters);
      const hasSplits = chance(random, 0.4);
      const generatedSplits = hasSplits
        ? generateSplits(random, distanceMeters, officialTimeMs)
        : [];

      rawResults.push({
        runnerId: runner.id,
        gender: runner.gender as 'male' | 'female',
        birthYear: runner.birthYear as number,
        eventId: edition.event.id,
        editionId: edition.id,
        eventName: edition.event.name,
        editionYear: edition.year,
        date: edition.date,
        location: `${edition.event.city}, ${edition.event.province}`,
        distanceCategory,
        distanceMeters,
        officialTimeMs,
        bib: String(randomInt(random, 100, 9999)),
        splits: generatedSplits.length > 0 ? generatedSplits : null,
        terrain: edition.event.terrain,
        eventType: 'individual',
        source: plan.source,
        status: plan.status,
      });
    }
  }

  interface RankInfo {
    overallRank: number;
    genderRank: number | null;
    ageGroup: string;
    ageGroupRank: number | null;
    fieldSize: number;
  }

  const ranks = new Map<RawResult, RankInfo>();
  const groups = new Map<string, RawResult[]>();
  for (const result of rawResults) {
    const key = `${result.editionId}:${result.distanceCategory}`;
    const group = groups.get(key) ?? [];
    group.push(result);
    groups.set(key, group);
  }
  for (const group of groups.values()) {
    const sorted = [...group].sort((a, b) => a.officialTimeMs - b.officialTimeMs);
    const fieldSize = sorted.length + randomInt(random, 5, 80);
    sorted.forEach((result, index) => {
      ranks.set(result, {
        overallRank: index + 1,
        genderRank: null,
        ageGroup: ageGroupFor(result.editionYear - result.birthYear),
        ageGroupRank: null,
        fieldSize,
      });
    });
    for (const gender of ['male', 'female'] as const) {
      const subset = sorted.filter((result) => result.gender === gender);
      subset.forEach((result, index) => {
        (ranks.get(result) as RankInfo).genderRank = index + 1;
      });
    }
    const ageGroupsInGroup = new Set(
      sorted.map((result) => (ranks.get(result) as RankInfo).ageGroup),
    );
    for (const ageGroup of ageGroupsInGroup) {
      const subset = sorted.filter(
        (result) => (ranks.get(result) as RankInfo).ageGroup === ageGroup,
      );
      subset.forEach((result, index) => {
        (ranks.get(result) as RankInfo).ageGroupRank = index + 1;
      });
    }
  }

  const resultRows = rawResults.map((result) => {
    const rank = ranks.get(result) as RankInfo;
    return {
      runnerId: result.runnerId,
      eventId: result.eventId,
      editionId: result.editionId,
      eventName: result.eventName,
      editionYear: result.editionYear,
      date: result.date,
      location: result.location,
      distanceCategory: result.distanceCategory,
      distanceMeters: result.distanceMeters,
      officialTimeMs: result.officialTimeMs,
      overallRank: rank.overallRank,
      genderRank: rank.genderRank,
      ageGroupRank: rank.ageGroupRank,
      ageGroup: rank.ageGroup,
      fieldSize: rank.fieldSize,
      bib: result.bib,
      splits: result.splits,
      terrain: result.terrain,
      eventType: result.eventType,
      source: result.source,
      status: result.status,
    };
  });

  const insertedResults = await db
    .insert(schema.raceResults)
    .values(resultRows)
    .returning({ id: schema.raceResults.id });

  const resultsCountByEdition = new Map<string, number>();
  for (const result of rawResults) {
    resultsCountByEdition.set(
      result.editionId,
      (resultsCountByEdition.get(result.editionId) ?? 0) + 1,
    );
  }
  for (const edition of insertedEditions) {
    const count = resultsCountByEdition.get(edition.id) ?? 0;
    if (count > 0) {
      await db
        .update(schema.eventEditions)
        .set({ resultsCount: count })
        .where(eq(schema.eventEditions.id, edition.id));
    }
  }

  return {
    phLocations: insertedLocations.length,
    organizers: 1,
    events: insertedEvents.length,
    eventEditions: insertedEditions.length,
    runners: insertedRunners.length,
    users: insertedUsers.length,
    raceResults: insertedResults.length,
    claims: insertedClaims.length,
    integrations: 1,
    importCandidates: insertedImportCandidates.length,
    apiKeys: 1,
  };
}
