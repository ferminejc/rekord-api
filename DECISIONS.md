# rekord-api — Decisions & Assumptions Log

Every assumption, deviation, or judgment call the agent makes goes here — newest first.

| Date | Phase | Decision | Why | Spec ref |
|---|---|---|---|---|
| 2026-07-18 | Setup | Zero-infrastructure mode: PGlite is the only database until deploy; no servers started during the build | Developer machine has Node + npm only | SPEC §1, §9 |
| 2026-07-18 | Setup | Splits stored as jsonb on race_results | Only ever read with their result; avoids a join for no query benefit | SPEC §6 |
| 2026-07-18 | Setup | FakeProvider is the default integration provider (PROVIDERS=fake) | Strava/Garmin credentials unavailable during build; flow must still be fully testable | SPEC §7 |
| 2026-07-18 | Bootstrap | Developer machine runs Node v26.3.1, newer than the fixed Node 22 LTS target; proceeded without downgrading | All tooling (Hono, Drizzle, Vitest, tsx) installed and ran cleanly; `package.json` still pins `engines.node: >=22` so CI/deploy stay on the intended LTS line | SPEC §2 |
| 2026-07-18 | Bootstrap | `tsconfig.json` includes both `src` and `tests` with `noEmit: true`; a separate `tsconfig.build.json` (extends base, `include: ["src"]`, `noEmit: false`) backs the `build` script | Keeps test code type-checked without emitting test files into `dist/` | SPEC §4 |
| 2026-07-18 | Phase 0 | AppError → HTTP status mapping: UNAUTHORIZED 401, FORBIDDEN 403, NOT_FOUND 404, VALIDATION_FAILED 400, CONFLICT 409, RATE_LIMITED 429, INTERNAL 500 | APP_SPEC §10.1 fixes the error *body* shape (`code`/`message`/`fieldErrors`) but not per-code HTTP statuses; chose the conventional REST mapping | APP_SPEC §10.1 |
| 2026-07-18 | Phase 0 | `env.ts` gives `DATABASE_URL`/`JWT_SECRET`/`APP_ORIGINS`/`PROVIDERS` dev-safe defaults instead of failing when unset | Zero-infrastructure mode: `npm test`/`npm run build` must run with no `.env` file present; real values only matter once Neon/JWT signing/CORS are wired in later phases | SPEC §1, §2 |
| 2026-07-18 | Phase 0 | pino logging folded into `middleware/request-id.ts` (logs on the way out, correlated by the generated/propagated request id) rather than a separate logging middleware file | SPEC §4 folder structure lists only `request-id.ts` among middleware for this concern, not a distinct logging file | SPEC §4 |
