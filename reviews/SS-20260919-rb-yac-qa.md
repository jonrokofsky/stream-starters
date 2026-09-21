# Sequential Tester review
AC1 PASS: 72/72 snapshot joins; alias/team mismatch/zero/duplicate cases tested. AC2 PASS: local browser Gibbs shows YAC/Att1.5, Detroit Lions. Missing source is explicitly unavailable by code review and join tests. AC3 PASS: six scoring/join tests, endpoint and 20/80 contribution tests; browser Gibbs Rush67. AC4 PASS: local page shows separate PFR capture date and Week1 coverage caveat. Build and TypeScript passed. Review sequential, not independent. PFR scheduled retrieval not implemented or claimed.

Revision manifest:
app/football/rb/page.tsx 978255d73f16cb4e59f9aea4b9b06416697042fc1daaae3dd858512b76985945
lib/data/rbScores.ts 3fdc857d156573e39c9c23a89728c118bd189a42ba9ab48055c3757f3a7e4167
lib/data/rbYac.ts f508cf71c037c48230ce3a17efc3e55639d72c1282c51120d84d42bf552248c0
public/data/rb-yac-2026.json ec572cae947b820eca36524d9c8360899b45dc5fdcd61bea8bd53d3b90533909
scripts/refresh-rb.mjs 3fa674706a9f5580d63f1d6ed81410f686a499f76c330a5d9d715215728b8c6f
scripts/rb-transform.mjs 0c360ec5e42cefbb13fcf4fb1f36a2ac536dcfe2eb861c9a9e87855fc23d3f8d

## 2026-09-21 amendment QA

PASS: Missing YAC/Att now reweights the three available Rush Score components to 35/25/40. Zero remains a real YAC value and continues using the 28/20/32/20 formula. RB Profile and RB Matchup display missing YAC as unavailable. Six focused scoring tests and the production build pass.
