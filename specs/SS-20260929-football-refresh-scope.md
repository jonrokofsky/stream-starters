# SS-20260929-football-refresh-scope

- Author/role: Architect (sequential pass)
- Date: 2026-09-29
- Status: READY FOR BUILD
- Input: User requested reliable automatic updates and clarified that automation should refresh only FPDS and SumerSports; PFR defense and YAC/Att are manual uploads.
- Base revision: `7d3ce83`
- Application: Stream Starters Next.js app
- Next owner: Coder

## Acceptance criteria

- AC-1: The scheduled RB job imports FPDS basic rushing only, retries transient grid failures, preserves manual YAC/Att, and never attempts PFR defense or YAC scraping.
- AC-2: The scheduled receiver job imports FPDS receiving plus expanded SumerSports WR and TE tables and retries transient source failures.
- AC-3: A validated manual YAC TSV import updates the YAC snapshot, RB profile data, RB matchup data, scores, and latest weekly table.
- AC-4: Today’s FPDS RB, FPDS receiving, and SumerSports WR/TE data are refreshed and pass non-regression checks.
- AC-5: The 8:15 AM fallback monitor checks both GitHub workflows and treats PFR defense/YAC as manual data that automatic jobs must preserve.
- AC-6: Relevant tests and production build pass before release.

## Boundaries

PFR defense-vs-position and advanced rushing remain user-supplied. The uploaded defense screenshots already match the active Week 3 snapshot and do not require a data rewrite.
