# SS-20261104-football-week8-refresh: Architect spec

- Author / date / spec version / status: Architect sequential pass / 2026-11-04 / v1 / READY FOR BUILD
- Input references and versions: User-uploaded completed Week 8 PFR QB/RB/WR/TE defense tables and advanced rushing YAC/Att screenshots; existing HeatRadar route source.
- Application location / revision: `C:/Users/jonro/stream-starters` / `604772e`
- Output path / next owner / requested action: Football JSON snapshots and refresh script / Coder / refresh and verify without changing the site UI.
- Open issue and decision IDs: None.

## Outcome and boundaries
Advance the football profiles, weekly windows, route metrics, defense matchup data, and RB YAC/Att to completed Week 8. Preserve all existing page structure and controls. Scheduled football workflows remain disabled.

## Requirements
Use nflverse for Week 8 player-week fundamentals, HeatRadar for the Week 8 route increment, the uploaded PFR tables for defense-vs-position, and PFR advanced rushing for YAC/Att. The latest and weekly files must agree, all 32 defenses must be present at all four positions, and YAC/Att must match PFR's one-decimal display.

## Acceptance criteria
| ID | Observable requirement | Verification method |
| --- | --- | --- |
| AC-1 | RB and receiver latest/weekly data extend through Week 8. | Snapshot inspection and page smoke test. |
| AC-2 | Receiver route archive contains a cumulative Week 8 entry. | Archive inspection and route tests. |
| AC-3 | Defense data contains 32 teams matching the uploaded PFR Week 8 tables. | Population and sample-row comparison. |
| AC-4 | RB YAC/Att matches uploaded PFR values at one decimal. | Sample-row comparison and YAC tests. |
| AC-5 | Existing football pages build and load without structural UI changes. | Production build and local smoke test. |

## Assumptions and decisions
The uploaded PFR screenshots are authoritative for defense totals. The existing nflverse PFR advanced feed is authoritative for YAC/Att and was checked against the highlighted screenshot rows. HeatRadar remains the approved route source for Weeks 7 and later.

## Architect handoff
Refresh the player foundation, append the HeatRadar Week 8 increment, rebuild the latest snapshots, replace defense values with the uploaded PFR Week 8 totals, and run the focused football checks. READY FOR BUILD.
