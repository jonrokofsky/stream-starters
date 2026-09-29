# SS-20260929-football-refresh-scope — QA

- Author/role: Tester (sequential, not independent)
- Date: 2026-09-29
- Status: PASS
- Revision: `57beec5`
- Next owner: Manager

## Evidence

- AC-1 PASS: revised FPDS-only RB importer completed on its first verification attempt, reported 90 RBs/241 games, and explicitly preserved the manual YAC capture.
- AC-2 PASS: receiver import captured 255 FPDS rows, 147 expanded SumerSports WR rows, and 111 expanded SumerSports TE rows; output contains 162 WR and 93 TE with route coverage for 145 WR and 91 TE.
- AC-3 PASS: TSV importer accepted 90 unique RB rows and updated Derrick Henry to 2.7, Jonathan Taylor to 2.0, and Jahmyr Gibbs to 1.5 before recalculating scores and the latest weekly table.
- AC-4 PASS: snapshot population and game-total guards passed in live local imports.
- AC-5 PASS: automation `verify-8-am-football-refresh` is active with the two-workflow/manual-PFR instructions.
- AC-6 PASS: 37 focused tests passed; script syntax and focused ESLint passed with no errors; production build passed and generated all routes.

## Hosted release checks

- GitHub FPDS RB workflow run #11: PASS in 52 seconds.
- GitHub receiver workflow run #2: PASS in 1 minute 9 seconds.
- Production JSON: 90 RBs/241 player-games, 90 YAC rows, Derrick Henry YAC/Att 2.7, 162 WR, and 93 TE with September 29 timestamps.

No open product issue.
