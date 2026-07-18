# rekord-api — Build Progress

Current phase: **2 — Auth** (0 — Foundation and 1 — Schema & seed complete)
(The agent breaks each phase into vertical slices at phase start and lists them here.)

## Bootstrap (session zero — /bootstrap)
- [x] node 22 + npm verified (no database/Docker needed — zero-infrastructure mode)
- [x] Scaffold: package.json scripts, strict tsconfig, biome, drizzle.config, .env.example, src/ + tests/ skeleton
- [x] PGlite test harness + passing health test
- [x] Gates green (typecheck · lint · test · build)
- [x] Scaffold committed separately from the spec kit

## Phase 0 — Foundation ✅
- [x] Slice 1 — Env validation (Zod: DATABASE_URL/JWT_SECRET/APP_ORIGINS/PROVIDERS), request-id + pino logging middleware, AppError + error-handler (AppError/ZodError/unknown → envelope) + 404 handler, envelope helper; health route wired through the stack — tested (typecheck/lint/test/build green)
- [x] Slice 2 — Converted to `OpenAPIHono`; health route declared via `createRoute`/`app.openapi()` with a shared `envelopeSchema()` helper; `defaultHook` maps route validation failures to the standard error envelope; `/openapi.json` document + Scalar UI at `/docs` — tested (typecheck/lint/test/build green; verified against the compiled server too)
- [x] Gates pass → commit (final phase-level check)
Exit: health endpoint tested through full middleware stack. **Met.**

## Phase 1 — Schema & seed ✅
- [x] Slice 1 — All 16 Drizzle tables (`src/db/schema/*.ts`: enums, users/refresh_tokens, runners, organizers/api_keys, events/event_editions, race_results, claims/edit_requests, goals, integrations/import_candidates, uploads, audit_log, ph_locations), migration generated (`0000_fluffy_swarm.sql`), `db/client.ts` (Neon prod / PGlite dev-test, auto-migrate on PGlite boot), `tests/helpers/createTestApp` now runs real migrations, migration smoke tests (all tables queryable, FK+jsonb round trip, partial unique index on claims) — tested (typecheck/lint/test/build green); `db-diagram.drawio` updated to match
- [x] Slice 2 — Bundled `ph_locations.json` (39 PH cities) + deterministic seeded PRNG (`db/seed/prng.ts`) + fixtures (Filipino/foreign runner names, clubs, 29 events across Luzon/Visayas/Mindanao) + full seed orchestration (`db/seed/run-seed.ts`, CLI entry `db/seed/seed.ts`) producing 65 runners, 29 events, 112 editions, 815 race results (≥800 verified, ~40% w/ splits, 1 disputed), 3 claims (1 approved + 2 pending), 1 integration + 4 import candidates, 1 organizer API key, and the 3 seeded role accounts (argon2id-hashed `Rekord123!`) — tested (row counts, determinism across two fresh runs, role-account login, partial-unique-index still enforced); verified via `npm run db:seed` directly too
Exit: all tables migrated on PGlite; deterministic seed row counts asserted in a test. **Met.**

## Phase 2 — Auth
- [x] Slice 1 — `db` threaded through `createApp(db)`/`index.ts`/test harness (required param, no eager default-db construction on import); `lib/jwt.ts` (jose HS256 15-min access tokens), `lib/crypto.ts` (argon2id password hash/verify, opaque 32-byte refresh tokens, sha256 token hashing); `middleware/auth.ts` (`requireAuth`, bearer → `AppVariables.user`), `middleware/rbac.ts` (`requireRole`); `modules/auth/` (schemas/repo/service/routes) with `POST /auth/register` and `POST /auth/login` issuing access+refresh tokens — tested (typecheck/lint/test/build green; verified against the compiled server, including a real production-boot check for the JWT_SECRET guard). Adversarial review caught and fixed: insecure JWT_SECRET reaching production, a login timing side-channel, an unvalidated JWT role claim, and a register() race condition (concurrent duplicate emails)
- [ ] Slice 2 — `POST /auth/refresh` (rotation: issue new + revoke old), `POST /auth/logout` (revoke), `POST /auth/forgot-password`, `POST /me/delete-request`
- [ ] Slice 3 — `POST /auth/social` (Google/Apple provider ID token verification)
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
