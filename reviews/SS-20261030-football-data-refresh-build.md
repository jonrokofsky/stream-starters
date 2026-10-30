# SS-20261030-football-data-refresh — Build handoff

- Author/role: Coder (sequential pass)
- Date: 2026-10-30
- Status: READY FOR QA
- Revision: HEAD a7cbd20f9109b91dbe9e1de712ad3562a5bf1cf3 plus uncommitted files recorded below
- Inputs: specs/SS-20261030-football-data-refresh.md
- Outputs: scripts/refresh-nflverse-football.mjs and seven public football JSON files
- Next owner/action: Tester; validate criteria and regression risk.

## Implementation
- Added standard fantasy points to normalized nflverse rows; defense FantPt now uses standard rather than PPR scoring.
- Defense aggregation includes games already played in the live week.
- The automatic job now writes both latest profile snapshots and weekly archives, removing the stale-file split.
- Refreshed 7,513 player-week rows: completed Week 7, live source Week 8.
- Imported 100 user-provided RB YAC/Att rows; latest RB and weekly snapshots both contain the same recalculated rows.
- Preserved exact Fantasy Points route totals through Week 6 and appended HeatRadar Week 7 to a 336-row cumulative route snapshot. HeatRadar remains a manual import.

## Evidence
- RB latest: 133 rows, byte-equivalent to weekly Week 7 rows after YAC import.
- Receiver latest: 333 rows, byte-equivalent to weekly Week 7 rows; 336 cumulative WR/TE route identities in the route archive.
- Defense coverage: games played in live Week 8.
- Checks: HeatRadar and receiver-window tests PASS (8/8); npm run test:data PASS (26/26); npm run build PASS (18 routes).

## Manifest
- scripts/refresh-nflverse-football.mjs — 69D9508DE8C48D219947DDB332B1682DD08726261897B8B3CB87ED1BD023EABB
- public/data/rb-2026.json — 25BC9ED4C3CAF4521C8948D41FE8A828408CCB560498E2242EB1D14AB82762CE
- public/data/rb-weekly-2026.json — FE9A225EF7AEF0FE7F6173FE7F706372A44AFA49C6CFBAEF911294CA46CCC827
- public/data/rb-yac-2026.json — 47609A02FF5ABF9CB1DF5DC712B440EE42D132B2A21F0CF8F355927E79CAE32B
- public/data/receivers-2026.json — B3BB199D606860D4CE3C36CE61E48C833B36E3A1A8F3E38C4A63E44B05FDF8FE
- public/data/receivers-weekly-2026.json — 1741F91AEA575223B9EF57E0208766E6F7F2F5F8B960FD85D4022EA3767CEC55
- public/data/nfl-defense-vs-position-2026.json — 3F49F6237392B289C43366AD0C6B8C1B6C31CFFB7C09E8736708C90C0EB71646

## HeatRadar addendum
- package.json adds the manual command `npm run import:heatradar-routes`.
- scripts/refresh-heatradar-routes.mjs — 3319686D8A72E91B276D83F553574AFE84E3F73449039891E42F4D63885BC90A
- tests/heatradar-routes.test.mjs — 811839F2484531E428DEE4FEE6AE585FAC5A8743930A1A65BC576FCB64410693
- public/data/receiver-routes-weekly-2026.json — 4C8FA8B6CE7623C32EDEBE1736A4B7E5FE08C94122C23A479CE39F90568A5DA0
- public/data/receivers-2026.json — F949A605CA4B0365705D171B069223C449EFB47F69DF6EB4761BE8B44739AC81
- public/data/receivers-weekly-2026.json — 7380EFFAA8505A9167F88DC8D26A32C409CE83DC461B1ED6AC835F66B66AD5BF
