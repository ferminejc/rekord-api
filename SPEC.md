# Rekord API — Backend Build Specification (Full Scope)

> **Prompt for an AI coding agent (e.g., Claude Code).** Build the complete REST backend for Rekord described below. This is **NOT an MVP** — implement every endpoint of the contract. The contract lives in `APP_SPEC.md` §10 (included in this repo, read-only reference); §6 (roles), §7 (behavior), and §9 (entities) of that file define the semantics. Where this file and APP_SPEC.md §10 disagree on a URL or field, **APP_SPEC.md wins** — the Flutter app is already being built against it.

---

## 1. Mission

Build **rekord-api**, the production-quality REST backend for Rekord — the Philippines-only running records platform. It serves the Flutter app (iOS/Android/Web) and must implement the full `/api/v1` contract: search, profiles, results, events, leaderboards, compare, auth, claims, edit requests, goals, export, wearable integrations, the organizer bulk-upload pipeline, and the admin panel — for all four roles (guest, runner, organizer, admin).

**Zero-infrastructure build:** the entire backend is developed and verified without a running database or server — tests run against in-memory Postgres (PGlite). A real Neon database is only needed at deploy time.

---

## 2. Fixed technical decisions

Do not substitute alternatives without logging the reason in `DECISIONS.md`.

| Concern | Decision |
|---|---|
| Runtime | Node.js 22 LTS, TypeScript strict (`"strict": true`, no `any`) |
| Package manager | npm (bundled with Node — nothing extra to install) |
| Framework | **Hono** + `@hono/zod-openapi` — every route declared with Zod request/response schemas; OpenAPI generated from them |
| API docs | Scalar UI served at `/docs`, spec JSON at `/openapi.json` |
| Database | PostgreSQL — **Neon** (serverless driver) in production, **PGlite** (in-memory Postgres) for all tests and local verification |
| ORM / migrations | **Drizzle ORM** + `drizzle-kit` migrations; `casing: 'snake_case'` so TS properties are camelCase and columns are snake_case automatically |
| Validation | Zod at every boundary (env, params, query, body, responses) |
| Auth | JWT via `jose` — 15 min access + 30 day rotating refresh tokens (hashed, revocable); passwords with **argon2id**; Google/Apple sign-in by verifying provider ID tokens server-side |
| Logging | `pino` with request-id correlation |
| Rate limiting | `hono-rate-limiter` (in-memory; interface allows a Redis store later) |
| Lint / format | **Biome** (replaces ESLint + Prettier) |
| Tests | **Vitest**; integration tests hit `app.request()` against a fresh migrated PGlite per suite |
| Dev / build | `tsx watch` for dev · `tsc` → `dist/` for build |
| CSV | `csv-parse` for the organizer bulk pipeline |
| Deploy target (Phase 9 docs) | Railway or Fly.io + Neon; nothing in the code may assume a specific host |

**API identity:** base path `/api/v1` · JSON only · envelope `{ "data": …, "meta"? }` · errors `{ "code", "message", "fieldErrors"? }` · JSON fields camelCase · CORS restricted to configured app origins.

---

## 3. Architecture

Feature-first modules with three layers inside each:

```
routes (Hono + zod-openapi)  →  service (business logic)  →  repo (Drizzle queries)
        HTTP only                   pure TS, no Hono            SQL only, no rules
```

Rules:

1. **Routes** parse/validate with Zod, call one service method, shape the envelope. No business logic, no SQL.
2. **Services** are pure TypeScript — no Hono types, no `Context`. They receive typed inputs and return typed outputs or throw `AppError`.
3. **Repos** contain all Drizzle/SQL. No validation, no permissions.
4. Errors: one `AppError(code, message, status, fieldErrors?)` class; a global error-handler middleware maps it (and ZodErrors) to the error envelope. Codes: `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `VALIDATION_FAILED`, `CONFLICT`, `RATE_LIMITED`, `INTERNAL`.
5. Cross-module calls go service→service, never route→foreign repo.
6. Every admin mutation writes an `audit_log` row in the same transaction.
7. Config: `src/config/env.ts` parses `process.env` with Zod once at boot; nothing else reads `process.env`.
8. All list endpoints paginate: `?page=1&pageSize=20` (max 100) → `meta: { page, pageSize, total }`.

---

## 4. Folder structure

```
rekord-api/
├── src/
│   ├── index.ts                    # boot: env, db, server listen
│   ├── app.ts                      # Hono app assembly: middleware + module routes + /docs
│   ├── config/
│   │   └── env.ts                  # Zod-validated env (DATABASE_URL, JWT_SECRET, APP_ORIGINS, PROVIDERS…)
│   ├── db/
│   │   ├── client.ts               # Neon or PGlite driver, selected by env
│   │   ├── schema/                 # one file per domain, barrel index.ts
│   │   │   ├── users.ts            # users, refresh_tokens
│   │   │   ├── runners.ts
│   │   │   ├── events.ts           # events, event_editions
│   │   │   ├── results.ts          # race_results
│   │   │   ├── claims.ts           # claims, edit_requests
│   │   │   ├── goals.ts
│   │   │   ├── integrations.ts     # integrations, import_candidates
│   │   │   ├── organizer.ts        # organizers, api_keys
│   │   │   ├── admin.ts            # audit_log
│   │   │   ├── locations.ts        # ph_locations
│   │   │   └── index.ts
│   │   ├── migrations/             # generated by drizzle-kit
│   │   └── seed/
│   │       ├── seed.ts             # deterministic seeding (see §8)
│   │       └── data/               # ph_locations.json, age_grading_factors.json, fixtures
│   ├── modules/
│   │   ├── auth/                   # auth.routes.ts · auth.service.ts · auth.repo.ts · auth.schemas.ts
│   │   ├── runners/
│   │   ├── results/
│   │   ├── events/
│   │   ├── leaderboards/
│   │   ├── claims/
│   │   ├── goals/
│   │   ├── data-export/
│   │   ├── uploads/
│   │   ├── integrations/
│   │   ├── organizer/
│   │   └── admin/
│   ├── middleware/
│   │   ├── auth.ts                 # bearer → user on context
│   │   ├── rbac.ts                 # requireRole('admin' | 'organizer'), requireOwner
│   │   ├── api-key.ts              # organizer server-to-server auth
│   │   ├── error-handler.ts
│   │   ├── rate-limit.ts
│   │   └── request-id.ts
│   ├── lib/
│   │   ├── app-error.ts
│   │   ├── envelope.ts             # ok(data, meta) helper
│   │   ├── pagination.ts
│   │   ├── pace.ts                 # time↔pace math (ms ints)
│   │   ├── age-grading.ts          # WMA factors from bundled JSON
│   │   ├── csv/
│   │   │   ├── parse.ts
│   │   │   └── validate-results.ts # per-row Zod validation → report
│   │   ├── storage.ts              # StorageService: local-disk (dev/tests), S3-compatible for deploy
│   │   └── crypto.ts               # argon2, token hashing
│   └── types/                      # shared cross-module types only
├── tests/
│   ├── helpers/                    # createTestApp(): fresh PGlite + migrations + seed subset
│   └── modules/                    # one integration file per module: auth.test.ts …
├── drizzle.config.ts
├── biome.json
├── tsconfig.json
├── package.json
├── .env.example
├── APP_SPEC.md                     # the Flutter/product spec — CONTRACT reference (read-only)
├── PROGRESS.md
├── DECISIONS.md
└── README.md
```

---

## 5. Naming conventions

| Item | Convention | Example |
|---|---|---|
| Files & folders | kebab-case | `edit-requests.service.ts` |
| Module files | `<module>.routes.ts` / `.service.ts` / `.repo.ts` / `.schemas.ts` | `runners.repo.ts` |
| Types & interfaces | PascalCase, no `I` prefix | `RaceResult`, `CreateResultInput` |
| Variables / functions | camelCase; services use verb phrases | `searchRunners()`, `approveClaim()` |
| Zod schemas | PascalCase + `Schema`; response variants `XResponseSchema` | `CreateResultSchema` |
| DB tables | snake_case, plural | `race_results` |
| DB columns | snake_case (Drizzle casing maps to camelCase in TS) | `official_time_ms` → `officialTimeMs` |
| PG enums | snake_case name, lowercase values | `result_status: 'verified' \| 'pending' \| 'disputed'` |
| Route paths | plural kebab-case, params camelCase | `/api/v1/edit-requests/:editRequestId`… follow APP_SPEC §10 exactly |
| Env vars | SCREAMING_SNAKE_CASE | `JWT_SECRET` |
| Tests | mirror module name, `.test.ts` | `tests/modules/claims.test.ts` |
| Commits | Conventional Commits | `feat(organizer): csv validation report` |

---

## 6. Database schema

Store times as **integer milliseconds** (`official_time_ms`, `elapsed_ms`); race dates as **`date`** (PH-local, no timezone math anywhere); audit/system timestamps as `timestamptz`. Soft-delete results via `deleted_at`. A draw.io ERD of this schema ships in the repo as `db-diagram.drawio` — keep it in sync when tables change.

| Table | Key columns | Notes |
|---|---|---|
| `users` | id uuid pk, email unique, password_hash?, display_name, role enum(runner/organizer/admin), runner_id?, organizer_id?, providers jsonb, deletion_requested_at?, created_at | password nullable for social-only accounts |
| `refresh_tokens` | id, user_id fk, token_hash, expires_at, revoked_at? | rotation: issue new + revoke old on every refresh |
| `runners` | id, first_name, last_name, display_name, photo_url?, nationality char(2) default 'PH', city?, province?, region?, club?, gender?, birth_year?, bio?, is_claimed, is_verified, hide_age, hide_club, created_at | pg_trgm GIN index on display_name for search + suggest |
| `organizers` | id, name, website?, verified | |
| `events` | id, name, slug unique, city, province, region, website?, description?, distances jsonb, terrain enum, organizer_id?, logo_url? | trgm index on name; location values must exist in `ph_locations` |
| `event_editions` | id, event_id fk, year, date, results_count | unique(event_id, year) |
| `race_results` | id, runner_id fk, event_id?, edition_id?, event_name, edition_year, date, location, distance_category enum, distance_meters, official_time_ms, overall_rank?, gender_rank?, age_group_rank?, age_group?, field_size?, bib?, splits jsonb, terrain enum, event_type enum, source enum(official/manual/import), status enum(verified/pending/disputed), weather?, notes?, evidence_url?, deleted_at? | splits as jsonb `[{label,distanceMeters,cumulativeMs}]` — only ever read with the result. Indexes: (runner_id, date desc); (edition_id, distance_category, official_time_ms) for leaderboards |
| `claims` | id, user_id, runner_id, method enum(email_code/social_match/id_document), evidence_url?, status enum, submitted_at, reviewed_by?, review_note? | partial unique index: one *pending* claim per (user_id, runner_id) |
| `edit_requests` | id, result_id, requested_by, proposed_changes jsonb, reason, status enum, created_at, resolved_by? | |
| `goals` | id, runner_id, type enum(target_time/yearly_distance/yearly_race_count), distance_category?, target_value numeric, deadline?, created_at | progress computed at read time from results |
| `integrations` | id, user_id, provider enum(strava/garmin), access_token_enc, refresh_token_enc, status, connected_at, last_sync_at?, auto_import bool | unique(user_id, provider); tokens encrypted at rest (AES-GCM, key from env) |
| `import_candidates` | id, integration_id, external_id, name, date, distance_meters, elapsed_ms, status enum(pending/imported/dismissed) | unique(integration_id, external_id) |
| `api_keys` | id, organizer_id, label, key_hash, created_at, last_used_at?, revoked_at? | plaintext shown once at creation only |
| `uploads` | id, owner_user_id, purpose enum(avatar/claim_evidence/result_evidence), mime, size_bytes, storage_key, url, created_at | via `StorageService`: local-disk adapter for dev/tests, S3-compatible adapter documented for deploy; allowlist jpeg/png/webp/pdf, ≤ 5 MB |
| `audit_log` | id, actor_id, action, target_type, target_id, details jsonb, created_at | written in-transaction by every admin mutation |
| `ph_locations` | region, province, city | seeded from PSGC-based JSON; validates all event/runner locations |

Derived (queries, not tables): personal bests = min(official_time_ms) per (runner, distance_category); lifetime stats; leaderboards = best time per runner per distance with gender/age-group/region/`filipinoOnly` filters over `status='verified'` results. If leaderboard queries get slow, a materialized view is a Phase 9 option — log it, don't pre-optimize.

---

## 7. Contract implementation

Implement **every endpoint in APP_SPEC.md §10.2** — no additions, no renames. Module ownership:

| Module | Owns (from §10.2) |
|---|---|
| auth | register, login, social, refresh, logout, forgot-password, delete-request (flags user + revokes tokens) |
| runners | list/search, suggest, get, results, stats, pbs, patch (owner), compare |
| results | get, create (manual → `source=manual, status=pending`), patch/delete (admin, soft), edit-requests create + `GET /me/edit-requests` |
| events | list/search, get, edition results |
| leaderboards | leaderboards query incl. `filipinoOnly` |
| claims | create, my claims, admin list, admin review |
| goals | CRUD under /me/goals |
| data-export | /me/export?format=csv\|json (streams the runner's verified+pending results) |
| uploads | `POST /uploads` (multipart, purpose-scoped) via StorageService — powers avatars, claim evidence, result evidence |
| integrations | list, connect (returns provider OAuth URL), callback, sync, import selected, auto-import toggle (PATCH), disconnect |
| organizer | events CRUD, editions, **bulk CSV pipeline**, api-keys |
| admin | results moderation, edit-requests queue, users, audit-log |

Behavioral requirements beyond CRUD:

- **Search & suggest**: pg_trgm similarity + prefix match on `display_name`; suggest returns ≤8 rows with avatar, city/province, event count; both support `region`, `province`, `club` filters.
- **Events default order**: most recent edition date first — this is what powers the app's Featured Events module on Home.
- **Stats endpoint** returns lifetime totals, races-by-category, PBs, and year summaries in one payload (the app's Stats tab renders from it directly).
- **Age grading** computed server-side via `lib/age-grading.ts` when birth_year + gender exist; included on result payloads as `ageGradePercent?`.
- **Compare** accepts 2–4 ids → per-runner stats + PBs + shared-edition head-to-head rows.
- **Manual result** validation: date not in future, time 0 < t < 48h, distance from category or custom meters, event autocomplete by name (link `event_id` when matched).
- **Privacy**: when `hide_age`/`hide_club` are set, strip those fields from all public payloads (owner and admin still see them).
- **Claims flow**: `email_code` method issues a 6-digit code (dev: logged; prod: mail adapter interface), verify before status `pending`; approval flips runner `is_claimed=true, is_verified=true` and links `users.runner_id` — in one transaction + audit row.
- **CSV pipeline** (organizer): multipart upload → parse → column-mapping payload → per-row Zod validation → validation report `{ validCount, errors: [{row, field, message}] }` → confirmed import runs in a transaction: match runner by exact (display_name + birth_year) else create unclaimed runner; rows become `official/verified`; update `results_count`. Duplicate bib within the upload = row error.
- **Bulk endpoint auth**: accepts an organizer JWT **or** a valid `X-Api-Key` header (hashed lookup, updates `last_used_at`) — the API-key path is the "organizer platform automated import" from the product spec.
- **Integrations**: a `Provider` adapter interface (`getAuthUrl`, `exchangeCode`, `fetchActivities`) with `StravaProvider`, `GarminProvider`, and a **`FakeProvider`** returning deterministic sample activities. `PROVIDERS=fake` (default) selects it — the full connect→sync→import flow must work and be tested without real credentials.
- **Rate limits**: 10/min on auth endpoints, 60/min general per IP; organizer bulk 5/hour per key.

---

## 8. Seed data (deterministic)

`npm run db:seed` must produce the same dataset every run (fixed RNG seed) and mirror the Flutter fake data so the app can switch to the real API without visual surprises:

- ≥ 60 runners — predominantly Filipino names + PH clubs across Luzon/Visayas/Mindanao, a few foreign participants; mix of claimed/unclaimed/verified.
- ≥ 25 PH events (Metro Manila/BGC, Cebu, Davao, Baguio trail, Iloilo, Clark/Pampanga, Subic/Zambales, Camarines Sur, Bataan), 3–5 editions each; ≥ 800 verified results, ~40% with splits; realistic times/ranks/field sizes.
- Role accounts: `runner@rekord.ph`, `organizer@rekord.ph`, `admin@rekord.ph` — password `Rekord123!`.
- Pending claims, ≥1 disputed result, organizer with events + an API key, fake-provider import candidates.
- `ph_locations` from the bundled PSGC JSON.

---

## 9. Testing & quality gates

- **Integration-first**: each module gets a Vitest file driving real HTTP via `app.request()` against a fresh PGlite with migrations + minimal seed (`tests/helpers/createTestApp`). Cover: happy path, validation failure, authz failure (wrong role / not owner), and pagination for every list.
- **Unit**: pace math, age-grading, CSV row validator, token rotation.
- **Contract checks**: response payloads are parsed with the module's `ResponseSchema` inside tests — schema drift fails the build.
- **Gates (end of every phase)**: `npm run typecheck` (tsc --noEmit) · `npm run lint` (biome check) · `npm test` · `npm run build`. All green before commit.
- Coverage target ≥ 70% for services + repos.

---

## 10. Build plan — execute in order

| Phase | Scope | Exit criteria |
|---|---|---|
| 0 — Foundation | Scaffold, tsconfig/biome, env validation, Hono app + request-id/logging/error middleware, envelope + AppError, health route, OpenAPI at /docs, PGlite test harness | `GET /api/v1/health` test green; gates pass |
| 1 — Schema & seed | All Drizzle schemas, migrations, deterministic seed, ph_locations | seed runs on PGlite; row counts asserted in a test |
| 2 — Auth | register/login/social/refresh(rotation)/logout/forgot; auth + rbac middleware | role accounts authenticate in tests; rotation revokes old token |
| 3 — Public reads | runners search/suggest/get/results/stats/pbs, results get, events + editions, leaderboards, compare | app-facing guest surface fully served from seed |
| 4 — Runner writes | uploads module (StorageService: avatar/evidence), manual results, profile patch + privacy, goals CRUD + progress, export csv/json | owner-only enforcement proven in tests |
| 5 — Claims & edit requests | claim wizard endpoints, email-code verify, admin review transaction | approving a claim links user↔runner + audit row |
| 6 — Integrations | provider adapters + FakeProvider, connect/callback/sync/import/disconnect, token encryption | full fake flow covered by tests |
| 7 — Organizer | events/editions CRUD, CSV pipeline (map→validate→report→import), api-keys + key auth | seeded bad CSV yields exact row errors; good CSV imports |
| 8 — Admin | moderation, edit-request queue, users, audit-log query | every admin mutation audited (asserted in tests) |
| 9 — Hardening & deploy | rate limits, CORS tightening, README + deploy guide (Neon + Railway/Fly), coverage to target, optional leaderboard matview | §11 checklist fully green |

After each phase: gates → Conventional Commit → tick PROGRESS.md → log assumptions in DECISIONS.md.

---

## 11. Definition of done

- [ ] Every APP_SPEC §10.2 endpoint implemented with Zod request + response schemas; OpenAPI at /docs reflects all of them.
- [ ] All four roles enforced exactly per APP_SPEC §6 (route + ownership checks), proven by authz tests.
- [ ] Envelope + error format identical everywhere; JSON camelCase; pagination on every list.
- [ ] Deterministic seed produces the §8 dataset; role accounts work.
- [ ] Philippines-only invariants: locations validated against ph_locations, dates are PH-local `date`s, `filipinoOnly` leaderboard filter works.
- [ ] Gates green: typecheck, lint, tests, build; coverage ≥ 70% services+repos.
- [ ] No `any`, no `process.env` outside config, secrets only via env, tokens hashed/encrypted at rest.
- [ ] README: setup, scripts, env table, deploy guide, and how to point the Flutter app at this API.

---

## 12. Working agreements for the agent

1. Read APP_SPEC.md §6/§9/§10 and this file fully before coding. Don't ask questions — decide sensibly and log in DECISIONS.md.
2. The contract is frozen: never rename paths or fields. If §10 is ambiguous, choose the interpretation the Flutter spec's screens need and log it.
3. Vertical slices: route + service + repo + tests together, per endpoint group.
4. Never leave migrations out of sync with schema files; regenerate and commit them together.
5. Anything stubbed gets `// TODO(rekord-api):` plus a PROGRESS.md line. Never descope silently.

---

## 13. Wiring the Flutter app (for the developer, post-deploy)

Run the app with `--dart-define=USE_FAKE_API=false --dart-define=API_BASE_URL=https://<host>/api/v1`, and add the app's web origin to `APP_ORIGINS` for CORS. Seeded role accounts match the app's fake ones, so every screen lights up identically.
