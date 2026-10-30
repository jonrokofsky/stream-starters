# SS-20261030-football-data-refresh

- Task ID: SS-20261030-football-data-refresh
- Author/role: Architect (sequential pass)
- Date: 2026-10-30
- Status: READY FOR BUILD
- Inputs: user Week 7/8 PFR YAC TSV; user Week 8 PFR defense screenshots; existing nflverse weekly refresh
- Application: C:/Users/jonro/stream-starters
- Revision: HEAD a7cbd20 plus uncommitted task changes
- Next owner/action: Coder; refresh backend data without changing the profile or matchup UI.

## Outcome
Update current football data and correct the automatic backend so the live profile and matchup files stay synchronized with weekly archives.

## Requirements
- AC-1: RB and receiver current snapshots match the latest completed-week archive.
- AC-2: User-supplied YAC/Att values update RB profiles, sheets, scores, and matchup inputs.
- AC-3: Defense data includes games already played in the live week and its FantPt field uses standard scoring like PFR.
- AC-4: Existing UI and score formulas remain unchanged.
- AC-5: Preserve exact Fantasy Points route totals through Week 6 and append user-authorized HeatRadar weekly totals from Week 7 without rewriting history.
- AC-6: Data tests and production build pass.

## Boundaries
No deployment or push is authorized in this task. Preserve unrelated public/1.png. HeatRadar route weeks are imported manually when supplied by the user; the unattended football schedule does not fetch HeatRadar.

