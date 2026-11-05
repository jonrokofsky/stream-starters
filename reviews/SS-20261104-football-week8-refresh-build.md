# SS-20261104-football-week8-refresh: Build handoff

- Author / date / status: Coder sequential pass / 2026-11-04 / COMPLETE
- Spec path and version / other inputs: `specs/SS-20261104-football-week8-refresh.md` v1
- Application location / revision or file manifest: `C:/Users/jonro/stream-starters`; eight football data/script files.
- Output paths / next owner / requested action: `public/data/` snapshots and `scripts/refresh-nflverse-football.mjs` / Tester / verify.
- Open issue and decision IDs: None.

## Engineering plan
Refresh nflverse through completed Week 8, append HeatRadar Week 8 routes, rebuild RB/receiver latest and weekly snapshots, align YAC/Att to PFR's one-decimal precision, and import the four uploaded PFR defense tables into the existing per-game schema.

## Implementation
The update contains 8,420 player-week records through Week 8, 139 current RB rows, 341 current receiver rows, 105 RB YAC identities, a 333-identity cumulative Week 8 route snapshot, and 32 defenses across QB/RB/WR/TE. No page layout or interaction code changed. The refresh script now rounds YAC/Att to the same one decimal shown by PFR.

## Checks actually performed
| Check / command or steps | Environment / revision | Actual result / evidence |
| --- | --- | --- |
| Data foundation suite | Local Windows checkout | PASS, 26/26. |
| Focused RB/receiver/route suites | Local Windows checkout | PASS, 22/22. |
| Focused refresh-script lint | Local Windows checkout | PASS, zero findings. |
| Production build | Next.js 16.3.1 | PASS, all 18 routes generated. |
| Local mobile smoke test | 390 x 844 Edge | PASS for `/football`, `/football/rb`, `/football/receivers`, and `/football/matchup`; no page errors. |
| Uploaded source samples | Generated JSON | PASS: Arizona QB, Dallas RB, Detroit TE, Philadelphia WR, Derrick Henry, Jahmyr Gibbs, Bijan Robinson, Braelon Allen, and Tyler Goodson match. |

## Issue responses (append each round)
PFR headless capture was blocked, so the four user-uploaded tables were transcribed and validated as complete 32-team sets. Houston and San Francisco QB denominators were corrected to seven games before final verification.
