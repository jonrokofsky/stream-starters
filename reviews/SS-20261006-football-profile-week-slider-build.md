# SS-20261006-football-profile-week-slider: Build handoff

- Author / date / status: Coder (sequential role pass) / 2026-10-06 / READY FOR QA
- Spec path and version / other inputs: `specs/SS-20261006-football-profile-week-slider.md` v1
- Application location / revision: `C:/Users/jonro/stream-starters` / working tree based on `13374d1`
- Output paths / next owner: football profile pages, weekly receiver data/refresher, shared slider / Tester
- Open issue and decision IDs: None

## Implementation

- Added a shared cumulative-week slider.
- RB profiles now use the selected Week 2–4 snapshot for player search, scores, percentiles, and components.
- WR/TE profiles now use a real Week 3–4 archive for both the profile and sortable sheet.
- Receiver refreshes append or replace the detected week and the scheduled workflow commits both latest and weekly files.
- Profile graphics display the selected week.

## Checks actually performed

| Check | Result |
| --- | --- |
| Focused archive tests | PASS: append, replace, and unchanged receiver cases. |
| Full test set | PASS: 44/44. |
| Production build | PASS: TypeScript and all 18 routes. |
| Local browser | PASS: RB W4→W2 and receiver W4→W3 rerender. |
| Mobile width | PASS: 390px viewport, 385px document width. |
| Diff check | PASS. |

## v2 build appendix

The profile slider is now one two-ended timeline. Season Start preserves cumulative behavior, while moving the left handle produces a start-to-end interval. RBs reuse the existing period calculator; receivers now subtract cumulative counts, rebuild rate stats, and recalculate efficiency and opportunity grades by position.
