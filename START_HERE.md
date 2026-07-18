# Start here — rekord-api (one-time setup)

1. Install Node.js 22 LTS — npm comes bundled with it. That's everything — **no database, no Docker**; tests run on in-memory Postgres.
2. Create an empty folder and put this kit's contents inside — including the hidden `.claude/` folder:
   `mkdir rekord-api && cd rekord-api`
3. Commit the kit before Claude touches anything:
   `git init && git add -A && git commit -m "docs: rekord-api spec kit"`
4. Run `claude` and send: `/bootstrap`
5. After the scaffold commit, send: `/next-phase`

## Every later session
`/session-start` → approve the plan → let it build → `/gates` at phase end → `/clear`.

Deploy day (after Phase 9): create a free Neon database, set DATABASE_URL, run migrations + seed, deploy to Railway/Fly, then point the Flutter app at it (SPEC.md §13). Keep this repo separate from the Flutter repo.

## Database diagram
`db-diagram.drawio` — the full schema ERD (16 tables, color-coded by domain). Open at https://app.diagrams.net via File → Open From → Device, or with the draw.io desktop app / VS Code extension.
