# SS-20261002-hitter-ranking-reorder: Manager review

- Author / date / status: Manager / 2026-10-02 / SHIP
- Spec / build / QA / issue ledger / decisions and versions: spec v1; build handoff; QA round 1; issue ledger; no decisions
- Application location / reviewed revision: `C:/Users/jonro/stream-starters` / `55a2439`
- Output path / next owner: User / requested action: use the corrected ranking reorder interaction
- Open issue and decision IDs: None

## Recommendation: SHIP

The drag behavior was genuinely unstable: changing order on every `dragover` event could move a row back and forth while hovering. Revision `55a2439` moves only on drop, highlights the destination, and previews the exact Elo values that will be saved. Wins, losses, comparisons, and matchup history remain untouched.

## Review

All five acceptance criteria pass. Four focused tests and the full 18-route production build pass. A Chromium walkthrough changed the first three rows and reassigned their Elo preview correctly, then canceled without changing cloud data. No blocker is open. The large existing page has unrelated lint debt documented in QA; this change adds no new reported lint issue.

The review was performed as labeled sequential role passes rather than independent-agent review.

## User decision

No additional product decision is required. The requested correction is ready to publish under the session’s existing authorization for Stream Starters site updates.

## Acceptance and execution record

Pending hosted deployment verification.


## Hosted execution record

Published in application revision `55a2439` with review records at `7853ed8`. Production Chromium verification repeated the rank 1 to rank 3 drag: the row order and Elo preview changed once, then Cancel exited without calling Save. The deployment passed on attempt 3 after Vercel completed the build. Latest automated football snapshot commits `86e9349` and `253b7c7` were retained during rebase.
