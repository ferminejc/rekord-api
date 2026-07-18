# rekord-api — Build Progress

Current phase: **Bootstrap** (then 0 — Foundation)
(The agent breaks each phase into vertical slices at phase start and lists them here.)

## Bootstrap (session zero — /bootstrap)
- [x] node 22 + npm verified (no database/Docker needed — zero-infrastructure mode)
- [x] Scaffold: package.json scripts, strict tsconfig, biome, drizzle.config, .env.example, src/ + tests/ skeleton
- [x] PGlite test harness + passing health test
- [x] Gates green (typecheck · lint · test · build)
- [x] Scaffold committed separately from the spec kit

## Phase 0 — Foundation
- [ ] Env validation (Zod) · request-id + pino logging · error handler · envelope/AppError
- [ ] OpenAPI at /docs (Scalar), /openapi.json
- [ ] Gates pass → commit
Exit: health endpoint tested through full middleware stack.

## Phase 1 — Schema & seed
- [ ] (slices added at phase start)
Exit: all tables migrated on PGlite; deterministic seed row counts asserted in a test.

## Phase 2 — Auth
- [ ] (slices added at phase start)
Exit: role accounts authenticate; refresh rotation revokes old tokens (tested).

## Phase 3 — Public reads
- [ ] (slices added at phase start)
Exit: runners search/suggest/get/results/stats/pbs, results get, events + editions, leaderboards (incl. filipinoOnly), compare — all served from seed.

## Phase 4 — Runner writes
- [ ] (slices added at phase start)
Exit: uploads, manual results, profile patch + privacy stripping, goals + progress, export csv/json — ownership enforced in tests.

## Phase 5 — Claims & edit requests
- [ ] (slices added at phase start)
Exit: approve-claim transaction links user↔runner, sets verified, writes audit row.

## Phase 6 — Integrations
- [ ] (slices added at phase start)
Exit: FakeProvider connect→sync→import→disconnect fully tested; tokens encrypted.

## Phase 7 — Organizer
- [ ] (slices added at phase start)
Exit: bad CSV yields exact row errors; good CSV imports official/verified results; api-key auth works.

## Phase 8 — Admin
- [ ] (slices added at phase start)
Exit: moderation, edit-request queue, users, audit-log query — every mutation audited (asserted).

## Phase 9 — Hardening & deploy docs
- [ ] Rate limits + CORS tightening
- [ ] Coverage ≥ 70% services+repos
- [ ] README: env table, deploy guide (Neon + Railway/Fly), Flutter wiring (SPEC §13)
Exit: SPEC §11 Definition of Done fully green.
