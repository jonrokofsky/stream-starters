# SS-20261030-football-manual-refresh-yprr — Build

- Author/role: Coder (sequential pass)
- Date: 2026-10-30
- Status: READY FOR QA
- Revision: uncommitted changes after 2b0ac67
- Next owner: Tester

Removed cron triggers from nflverse-football-refresh.yml, rb-refresh.yml, and receiver-refresh.yml; workflow_dispatch remains. HeatRadar and nflverse route joins now ignore common name suffixes. Current, manual-import, and week-range receiver calculations suppress YPRR and target-per-route below 10 routes/game. Rebuilt Week 7 routes and all current football snapshots.

Examples: Luther Burden III 18.19 -> 2.68 YPRR; Harold Fannin Jr. 8.86 -> 1.28; John Metchie III 5.00 -> 1.18. Low-route samples display blank rates.
