Continue building rekord-api.

1. Read PROGRESS.md. If the current phase's exit criteria are met and gates passed, advance per SPEC.md §10 (build plan).
2. Re-read the SPEC + APP_SPEC §10 endpoints for this phase.
3. Break the phase into vertical slices (route + service + repo + tests per endpoint group) and list them in PROGRESS.md.
4. Implement the next slice completely, following CLAUDE.md rules.
5. Run typecheck + lint + tests after the slice; fix everything before moving on.
6. Update PROGRESS.md, log assumptions in DECISIONS.md, stop with a short summary.

Work autonomously within a slice; stop and summarize after each completed slice.
