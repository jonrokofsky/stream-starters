# SS-20261113-football-week9-refresh: Architect spec

- Author / date / spec version / status: Architect sequential pass / 2026-11-13 / v1 / READY FOR BUILD
- Input references and versions: User request for Week 9; existing `b5adc59` Week 9 PFR defense/YAC commit; HeatRadar route source; nflverse player-week foundation.
- Application location / revision: `C:/Users/jonro/stream-starters` / `b5adc59`
- Output path / next owner / requested action: Football JSON snapshots / Coder / complete all Week 9 profile and matchup datasets.
- Open issue and decision IDs: None.

## Outcome and boundaries
Finish the Week 9 update across RB and receiver profiles, timeline windows, route metrics, YAC/Att, and matchup data. Preserve the existing UI and previously uploaded Week 9 PFR defense/YAC snapshots.

## Requirements
Both profile archives must include a true Week 9 endpoint. Latest player data must reflect completed Week 9, HeatRadar routes must cover Week 9, and the uploaded PFR defense/YAC data must remain authoritative. Scheduled football runs remain disabled.

## Acceptance criteria
| ID | Observable requirement | Verification method |
| --- | --- | --- |
| AC-1 | RB latest data and weekly archive cover Week 9. | Snapshot inspection and tests. |
| AC-2 | Receiver latest data and weekly archive cover Week 9 with Week 9 routes. | Snapshot inspection and route tests. |
| AC-3 | Uploaded Week 9 PFR defense and YAC remain applied. | Metadata and sample-row inspection. |
| AC-4 | Existing football pages compile without UI changes. | Production build. |

## Assumptions and decisions
The existing Week 9 PFR uploads are retained. The nflverse refresh uses completed Week 9 even though the live upstream already contains the opening Week 10 game.

## Architect handoff
Preserve PFR snapshots, refresh HeatRadar and nflverse, rebuild both timeline archives through Week 9, reapply PFR YAC to RB scoring, and verify all data. READY FOR BUILD.
