# SS-20260924-rb-refresh-resilience: Architect spec

- Author / date / spec version / status: Architect sequential pass / 2026-09-24 / v1 / READY FOR BUILD
- Input references and versions: user request; GitHub Actions run 35754172711; `scripts/refresh-rb.mjs`; `.github/workflows/rb-refresh.yml`
- Application location / revision: Stream Starters / parent `fb4b1d8`
- Output path / next owner / requested action: this file / Coder / restore current Fantasy Points updates without depending on PFR
- Open issue and decision IDs: none

## Outcome and boundaries

Keep the 2026 RB snapshot current from Fantasy Points Basic Rushing even when PFR blocks YAC/Att collection. Correct the scheduled workflow behavior that reports success while skipping refresh steps. Preserve the last valid PFR YAC snapshot when a new capture is unavailable. No scoring formula or UI change is in scope.

## Acceptance criteria

| ID | Observable requirement | Verification method |
| --- | --- | --- |
| AC-1 | In-season Monday, Tuesday, and Friday runs execute at 8 AM Eastern even if GitHub starts the runner late. | Inspect timezone-aware schedule and gate; run hosted workflow. |
| AC-2 | Fantasy Points is captured, validated, and saved before PFR is attempted. | Code review and live importer run. |
| AC-3 | A PFR timeout preserves prior YAC and still produces a valid current RB snapshot. | Run importer with observed PFR timeout; inspect output and snapshot. |
| AC-4 | Existing RB scoring behavior and production build remain valid. | Focused tests, lint, and build. |

## Architect handoff

Use GitHub's timezone-aware schedule and gate only on the season, since scheduled events may start late. Split Fantasy Points and PFR into separate pages and make the PFR phase bounded and optional. READY FOR BUILD.
