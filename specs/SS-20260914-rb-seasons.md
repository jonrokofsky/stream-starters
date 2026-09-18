# SS-20260914-rb-seasons: Architect spec

- Author/date/version: sequential Architect / 2026-09-14 / v1
- Status: season UI ready; 2026 source integration blocked by D-0002
- Inputs: user request for 2025/2026 RB profile toggle; current RB page; ingestion spec v6
- Application/revision: C:/Users/jonro/stream-starters / 329f560
- Next owner: Coder, implement isolated season views; Manager, obtain custom formulas

Preserve the existing 2025 feed and scores. Add accessible 2025 and 2026 buttons only to /football/rb. Default to 2025 while 2026 is unavailable. Never display 2025 rows under a 2026 heading; use a clear pending-data message. Cancel stale fetches when switching seasons. Show the selected statistical season separately from the existing 2026 age adjustment. Do not change football matchup or baseball tools.

AC-1: 2025 remains available with its existing source and scoring. AC-2: both year buttons work and expose selected state. AC-3: 2026 displays no copied 2025 data. AC-4: rapid switching cannot apply a stale response. AC-5: type check and focused lint pass. AC-6: a complete 2026 profile requires confirmed source access and custom score formulas; remains blocked until supplied.

## v2 scope clarification — 2026-09-14
User supplied all five score formulas. Implement these without altering 2025 source scores; validate against legacy population. Preserve explicit missing age rather than defaulting to an age factor. User confirms permission/licensed access but has website access only. Remaining integration requirement is a supported retrieval path and full 2026 population, including the age data used for adjustment. A season switch alone is not completed automated ingestion.

## v3 user-directed scope — 2026-09-18
Supersedes AC1-4: profile must use 2026 only, remove year toggle and age adjustment, show raw Rush Score. Saved Sept14 snapshot may be used only with clear date/manual label. User subsequently identified TNF updates: current-data release requires a refreshed table. Matchup tools deferred to next task as user requested RB changes first.

## v4 browser source and scheduled refresh
User authorizes automatic browser source and, after explicit risk explanation, scheduled commits to main. Capture only public rendered table; no login profile reuse. Fail closed on selected season/regular/PPR mismatch, incomplete grid, unstable captures, schema changes, significant player loss or games regression. Keep previous file on failure. Schedule Mon/Tue/Fri08 Eastern for2026 season, manual dispatch available; verify cloud run separately from local success.
