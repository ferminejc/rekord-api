# rekord-api

Production-quality REST backend for **Rekord** — the Philippines-only running records platform. Serves the Flutter app (iOS/Android/Web): search, profiles, results, events, leaderboards, compare, auth, claims, edit requests, goals, export, wearable integrations, the organizer bulk-upload pipeline, and the admin panel.

> **Status:** spec kit only — no code has been scaffolded yet. See [`PROGRESS.md`](PROGRESS.md) for the current phase.

## Stack

Node.js 22 (TypeScript, strict) · Hono + `@hono/zod-openapi` · Drizzle ORM · PostgreSQL (Neon in prod, PGlite for tests) · Zod · JWT (`jose`) · Vitest · Biome

## Zero-infrastructure build

This backend is built and verified entirely without a running database or server — all tests run against **PGlite** (in-memory Postgres). A real Neon database is only needed at deploy time (Phase 9).

## Getting started

1. Install Node.js 22 LTS (npm comes bundled — nothing else to install).
2. Open this folder in [Claude Code](https://claude.com/claude-code) and run `/bootstrap` (one-time — scaffolds `package.json`, tsconfig, Biome, Drizzle config, and the test harness).
3. Every session after that: `/session-start` → approve the plan → `/gates` at phase end → `/clear`.

Once bootstrapped, the usual commands will be:

| Command | Purpose |
|---|---|
| `npm install` | Install dependencies |
| `npm run dev` | Run the dev server (`tsx watch`) |
| `npm run typecheck` | TypeScript strict check |
| `npm run lint` | Biome lint |
| `npm test` | Vitest against PGlite |
| `npm run build` | Compile to `dist/` |
| `npm run db:generate` | Generate Drizzle migrations from schema |

## Documentation map

| File | Contents |
|---|---|
| [`START_HERE.md`](START_HERE.md) | One-time setup steps |
| [`SPEC.md`](SPEC.md) | Full backend build specification (architecture, phases, fixed technical decisions) |
| [`APP_SPEC.md`](APP_SPEC.md) | Frozen HTTP contract (§10) plus roles (§6) and entities (§9) — wins over SPEC.md on conflicts |
| [`PROGRESS.md`](PROGRESS.md) | Phase-by-phase build checklist |
| [`DECISIONS.md`](DECISIONS.md) | Log of assumptions and deviations made during the build |
| [`db-diagram.drawio`](db-diagram.drawio) | Full schema ERD (open at [app.diagrams.net](https://app.diagrams.net)) |
| [`CLAUDE.md`](CLAUDE.md) | Project instructions for Claude Code |

## Deploy

Deploy (Neon + Railway/Fly.io) is documented and executed in Phase 9, once all prior phases are green. Keep this repo separate from the Flutter app repo; wiring instructions live in `SPEC.md` §13.
