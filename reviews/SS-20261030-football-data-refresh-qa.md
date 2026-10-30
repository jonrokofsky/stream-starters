# SS-20261030-football-data-refresh — QA

- Author/role: Tester (sequential pass; not independent)
- Date: 2026-10-30
- Status: PASS
- Revision: HEAD a7cbd20f9109b91dbe9e1de712ad3562a5bf1cf3 plus build manifest
- Inputs: spec and build handoff
- Next owner/action: Manager review.

## Criterion results
- AC-1 PASS: RB 133/133 and receiver 333/333 latest rows exactly equal their Week 7 archive rows.
- AC-2 PASS: Derrick Henry 147 ATT, 2.1 YAC/Att; Kenneth Walker III 120 ATT, 2.8 YAC/Att. Both latest and weekly RB files match after score recalculation.
- AC-3 PASS: defense note reports live Week 8. Green Bay RB values match the supplied PFR table at 23.6 rush attempts/game, 93.5 rush yards/game, 5.8 targets/game, and 20.7 standard FantPt/game.
- AC-4 PASS: no app/page files changed.
- AC-5 PASS: Fantasy Points Weeks 1–6 are unchanged; HeatRadar Week 7 adds one weekly increment. Kelce remains 45 routes for Weeks 4–6 and gains 34 routes in Week 7.
- AC-6 PASS: focused HeatRadar/window tests 8/8; npm run test:data 26/26; npm run build, 18 routes.

## Limitations
No browser smoke test was run because no UI code changed. Some target counts can vary slightly between nflverse and PFR provider accounting; PFR fantasy scoring and the sampled live-week totals match.

