# SS-20261006-football-data-refresh: Build handoff

- Author / date / status: Coder (sequential role pass) / 2026-10-06 / READY FOR QA
- Spec path and version / other inputs: `specs/SS-20261006-football-data-refresh.md` v1 and user attachments
- Application location / revision or file manifest: `C:/Users/jonro/stream-starters` / uncommitted snapshot changes based on `ee5c274`
- Output paths / next owner / requested action: five football JSON snapshots plus this handoff / Tester / verify AC-1 through AC-5
- Open issue and decision IDs: None

## Engineering plan

Sync current `main`, run the established RB and receiver browser importers, apply the YAC TSV through the existing validator, convert the four supplied defense tables through the existing transform/merge functions, then run focused tests, build, and browser checks. Preserve unrelated files and all older weekly snapshots.

## Implementation

- Fantasy Points RB refreshed to 95 RBs and 325 aggregate player-games; Week 4 archive entry updated.
- Fantasy Points receiving captured 269 source rows; SumerSports captured 157 WR and 114 TE rows; final population is 172 WR and 97 TE.
- Imported 95 RB YAC/Att rows through Week 4; profiles, matchup data, and latest weekly scores recalculated. Derrick Henry now has 2.3 YAC/Att and Rush Score 75.
- Converted the supplied Week 4 PFR QB/RB/WR/TE tables into one validated 32-team defense snapshot. Direct PFR capture timed out, so no unsupported network result was used.
- Snapshot provenance and capture times were updated. No formula, component, page, or schedule code changed.

## Checks actually performed

| Check | Environment | Result |
| --- | --- | --- |
| Automatic import guards | Local Playwright/Node | PASS: RB and receiver refreshes completed without regression guard failures. |
| Manual YAC importer | User TSV / Node | PASS: 95 unique RB rows, Week 4, scores updated. |
| Defense transform/merge | User screenshots / existing transform | PASS: 32 teams in each position and 32 merged teams. |
| Focused tests | Node | PASS: 42 passed, 0 failed. |
| Production build | Next.js 16.3.1 | PASS: compile, TypeScript, and 18 routes. |
| Browser walkthrough | Chromium at port 3010 | PASS: RB, receiver, and matchup routes load without data errors; RB shows 95-player/Week 4/YAC evidence. |
| Diff check | Working tree | PASS. |

## Issue responses

None.
