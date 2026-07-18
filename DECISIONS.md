# rekord-api — Decisions & Assumptions Log

Every assumption, deviation, or judgment call the agent makes goes here — newest first.

| Date | Phase | Decision | Why | Spec ref |
|---|---|---|---|---|
| 2026-07-18 | Setup | Zero-infrastructure mode: PGlite is the only database until deploy; no servers started during the build | Developer machine has Node + npm only | SPEC §1, §9 |
| 2026-07-18 | Setup | Splits stored as jsonb on race_results | Only ever read with their result; avoids a join for no query benefit | SPEC §6 |
| 2026-07-18 | Setup | FakeProvider is the default integration provider (PROVIDERS=fake) | Strava/Garmin credentials unavailable during build; flow must still be fully testable | SPEC §7 |
