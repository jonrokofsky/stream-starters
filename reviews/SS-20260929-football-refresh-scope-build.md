# SS-20260929-football-refresh-scope — build handoff

- Author/role: Coder (sequential pass)
- Date: 2026-09-29
- Status: READY FOR QA
- Spec: `specs/SS-20260929-football-refresh-scope.md`
- Revision under review: working tree based on `7d3ce83`
- Next owner: Tester

## Implementation

- Renamed and narrowed `rb-refresh.yml` to FPDS RB data; removed automatic PFR defense/YAC steps and commit paths.
- Added three-attempt fresh-page capture to the FPDS RB importer.
- Added three-attempt capture wrappers to FPDS receiving and both SumerSports imports.
- Added `import-rb-yac-tsv.mjs` for validated user-provided PFR TSV data, including score and latest-week recalculation.
- Imported today’s FPDS RB snapshot (90 RBs, 241 player-games), receiver snapshot (162 WR, 93 TE), and 90-row Week 3 YAC upload.
- Updated the `verify-8-am-football-refresh` heartbeat to monitor both automatic workflows and preserve manual PFR snapshots.
