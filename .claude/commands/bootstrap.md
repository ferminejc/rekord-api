Bootstrap the rekord-api project in this folder. Run once, only when package.json does not exist.

1. Verify tooling: `node --version` (22.x) and `npm --version`. That is the entire requirement — no database, no Docker.
2. Scaffold per SPEC.md §2/§4: package.json (scripts: dev, build, typecheck, lint, test, db:generate, db:seed), tsconfig (strict), biome.json, drizzle.config.ts, .env.example, .gitignore (node), and the src/ + tests/ skeleton with a health route.
3. Install deps with npm (commit package-lock.json); create the PGlite test harness (tests/helpers/createTestApp) and one passing health integration test.
4. Verify: `npm run typecheck` → `npm run lint` → `npm test` → `npm run build` — all green.
5. Git: if not a repo yet, `git init`. Commit the scaffold as its own commit:
   `chore: scaffold rekord-api (hono + drizzle + vitest)`
   (The spec kit should already be commit #1 — keep them separate.)
6. Tick the Bootstrap section in PROGRESS.md and report versions + gate results.

Then stop. Phase 0 continues on my go (/next-phase).
