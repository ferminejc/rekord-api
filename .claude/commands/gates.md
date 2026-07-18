Run the rekord-api phase quality gates and report each as pass/fail:

1. npm run typecheck   → 0 errors
2. npm run lint        → clean (biome)
3. npm test        → all green (PGlite integration + unit)
4. npm run build       → dist/ compiles

Zero-infrastructure mode (CLAUDE.md): never connect to a real database or start a listening server for gates.

If all pass: tick the phase items in PROGRESS.md, then propose and make a Conventional Commit.
If any fail: fix, re-run the full list from the top, then commit. Never commit red.
