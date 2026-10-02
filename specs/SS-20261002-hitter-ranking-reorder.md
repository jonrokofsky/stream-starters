# SS-20261002-hitter-ranking-reorder: Architect spec

- Author / date / spec version / status: Architect (sequential role pass) / 2026-10-02 / v1 / READY FOR BUILD
- Input references and versions: User report on 2026-10-02; current rankings UI and API at `e16cda1`
- Application location / revision: `C:/Users/jonro/stream-starters` / base `e16cda1`
- Output path / next owner / requested action: `specs/SS-20261002-hitter-ranking-reorder.md` / Coder / stabilize reorder and expose Elo effect
- Open issue and decision IDs: None

## Outcome and boundaries

Make the existing baseball hitter Rankings tab reliably support dragging a hitter to a new rank and make the corresponding Elo adjustment visible before the user saves. Preserve wins, losses, comparison counts, matchup history, ranking filters, and the existing cloud save endpoint. This task does not change the Elo business rule, reset rankings, or alter live ranking data during testing.

## Requirements

- Reordering occurs once when a dragged row is dropped onto a destination row; hovering must not repeatedly reshuffle the list.
- The destination row receives a visible drop cue.
- The Elo column previews the exact values that `Save New Order` will submit.
- Saving continues to update only Elo while retaining records and history.
- Cancel exits reorder mode without persisting changes.
- Pure reorder and Elo projection rules must have focused automated coverage.

## Acceptance criteria

| ID | Observable requirement | Verification method |
| --- | --- | --- |
| AC-1 | Dragging one row onto another produces one stable new order. | Browser drag from rank 1 to rank 3; inspect first three rows after drop. |
| AC-2 | Elo values immediately reflect the new order before save. | Compare visible Elo values before and after the same drag. |
| AC-3 | Save uses the same calculated ratings shown in the preview, while existing API behavior preserves record fields. | Shared pure calculation used by preview/save; inspect API rerank branch and focused tests. |
| AC-4 | Canceling a local test does not persist the reordered list. | Browser drag, then Cancel without invoking Save. |
| AC-5 | The application remains buildable and reorder helpers pass boundary tests. | Focused Node tests, production build, diff check. |

## Assumptions and decisions

The existing linear Elo redistribution is the confirmed implementation baseline and remains unchanged. The reported uncertainty is treated as a usability/correctness defect in drag handling and feedback, not a request for a new rating model. Desktop HTML drag-and-drop is the required interaction for this pass; the existing horizontally scrollable rankings table remains unchanged.

## Architect handoff

Use a pure helper for item movement and Elo projection. Move the list only from `drop`, use `dragover` only to allow the drop and identify its target, and share the Elo projection helper between the preview and save request. READY FOR BUILD.
