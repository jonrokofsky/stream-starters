# SS-20261113-football-week9-refresh: Build handoff

- Author / date / status: Coder sequential pass / 2026-11-13 / COMPLETE
- Spec path and version / other inputs: `specs/SS-20261113-football-week9-refresh.md` v1
- Application location / revision or file manifest: `C:/Users/jonro/stream-starters`; six football data files.
- Output paths / next owner / requested action: `public/data/` / Tester / verify.
- Open issue and decision IDs: None.

## Engineering plan
Audit the existing Week 9 commit, preserve its PFR defense/YAC snapshots, refresh the completed player-week foundation and HeatRadar routes, rebuild latest/weekly RB and receiver data, then reapply the PFR YAC snapshot to scores.

## Implementation
The initial Week 9 commit had current defense/YAC, receiver basics, and route data, but both profile timelines still ended at Week 8 and RB player data was still Week 8. The repair now provides 145 RB rows, 348 receiver rows, Weeks 1-9 in both profile archives, 341 cumulative route identities, 93 PFR YAC identities, and 32 PFR defense rows.

## Checks actually performed
| Check / command or steps | Environment / revision | Actual result / evidence |
| --- | --- | --- |
| Data foundation suite | Local Windows checkout | PASS, 26/26. |
| Focused RB/receiver/route suites | Local Windows checkout | PASS, 22/22. |
| Production build | Next.js 16.3.1 | PASS, all 18 routes generated. |
| Snapshot audit | Local JSON | PASS; RB and receiver archives contain Weeks 1-9 and latest rows have max G=9. |
| Route/YAC samples | Local JSON | PASS; Kelce/Likely/Chase/Nacua have Week 9 routes; Henry/Gibbs/Bijan retain uploaded YAC. |

## Issue responses (append each round)
The upstream player feed contained live Week 10 data. The refresh intentionally used its completed-week detector, producing a Week 9 endpoint while restoring the uploaded Week 9 PFR defense snapshot afterward.
