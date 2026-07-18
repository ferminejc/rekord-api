# Rekord API — Claude Code Project Memory

Node 22 + TypeScript + Hono + Drizzle + Postgres backend for the Rekord Flutter app.
**SPEC.md defines this backend. APP_SPEC.md §10 is the frozen HTTP contract** (§6 roles, §9 entities give semantics). If SPEC.md and APP_SPEC.md §10 disagree on a URL/field, APP_SPEC.md wins.

## Zero-infrastructure mode (current)
No database, no Docker, no running server is available or needed.
- All verification runs on **PGlite** (in-memory Postgres) inside Vitest.
- Do NOT attempt to connect to Neon, start long-running servers, or open ports. `app.request()` in tests is the runtime proof.
- Deploy (Neon + host) happens in Phase 9 as documentation, executed by the developer.

## Session zero
If `package.json` does not exist, run `/bootstrap` before anything else.

## Session start — every session
1. Read `PROGRESS.md` → current phase + next unchecked item.
2. Skim SPEC.md for that phase and the matching APP_SPEC §10 endpoints.
3. State a 3–5 bullet plan before writing code.

## Commands
- Install: `npm install`
- Migrations: `npm run db:generate` (from schema) — never hand-edit migrations
- Seed check: exercised via tests (PGlite), not a live DB
- Typecheck: `npm run typecheck` · Lint: `npm run lint` · Test: `npm test` · Build: `npm run build`

## Hard rules
- Contract fidelity: implement APP_SPEC §10 paths/fields exactly — no renames, no extras.
- Layering (SPEC §3): routes → service → repo. Services never import Hono types; repos never contain rules.
- Zod at every boundary; responses parsed by their ResponseSchema inside tests.
- Envelope `{data, meta?}` and error `{code, message, fieldErrors?}` everywhere; JSON camelCase; every list paginated.
- `strict: true`, no `any`, no `process.env` outside `src/config/env.ts`.
- Every admin mutation writes `audit_log` in the same transaction.
- Any schema change updates migrations AND `db-diagram.drawio` (draw.io XML) in the same commit.
- Times = integer ms; race dates = `date` (PH-local, never timezone-shifted); locations validated against `ph_locations`.
- Secrets: passwords argon2id, refresh tokens hashed, provider tokens encrypted (AES-GCM).
- Vertical slices per endpoint group: route + service + repo + tests together.
- Stubs get `// TODO(rekord-api):` + PROGRESS.md line; assumptions go in DECISIONS.md.

## Definition of done — every work item
typecheck clean → lint clean → tests green → build passes → PROGRESS.md ticked → Conventional Commit.

## Phase gates
Run `/gates` at the end of every phase. Never start the next phase red.
