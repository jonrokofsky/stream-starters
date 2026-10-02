# SS-20261002-hitter-ranking-reorder: Build handoff

- Author / date / status: Coder (sequential role pass) / 2026-10-02 / READY FOR QA
- Spec path and version / other inputs: `specs/SS-20261002-hitter-ranking-reorder.md` v1
- Application location / revision or file manifest: `C:/Users/jonro/stream-starters` / uncommitted work based on `e16cda1`
- Output paths / next owner / requested action: implementation plus `reviews/SS-20261002-hitter-ranking-reorder-build.md` / Tester / verify AC-1 through AC-5
- Open issue and decision IDs: None

## Engineering plan

Extract immutable row movement and Elo redistribution into a pure module. Stop mutating order during repeated `dragover` events; record a highlighted destination and move once on `drop`. Calculate a player-to-Elo preview from the current draft order and use the same function to construct the save payload. Add focused tests for down/up movement, invalid drops, descending Elo, and equal-Elo spacing.

## Implementation

- Added `lib/hitterRankings/reorder.ts` with `moveRankingItem` and `buildRerankedRatings`.
- The rankings table now highlights the current drop target and applies the move once on drop.
- The Elo column updates immediately as the draft order changes.
- `saveReorder` submits the same helper output shown in the preview.
- Updated the reorder instruction so the preview/save behavior is explicit.
- Added `tests/hitter-rankings-reorder.test.ts`.

No live rankings were saved or reset during implementation.

## Checks actually performed

| Check / command or steps | Environment / revision | Actual result / evidence |
| --- | --- | --- |
| Focused Node test | Windows / uncommitted | PASS: 4 tests, 0 failures. |
| Production build | Next.js 16.3.1 / uncommitted | PASS: compile, TypeScript, and all 18 routes. |
| Chromium drag walkthrough | Local port 3010, 1440×1000 / uncommitted | PASS: rank 1 dropped on rank 3 once; order and Elo preview both changed; Cancel used, Save not invoked. |
| Focused ESLint | Current page plus new helper/test / uncommitted | Existing page reports 5 pre-existing React rule errors and 1 hook warning outside this change. New helper and test add no reported findings. |
| `git diff --check` | Uncommitted | PASS. |

## Issue responses (append each round)

None.
