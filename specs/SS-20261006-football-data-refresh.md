# SS-20261006-football-data-refresh: Architect spec

- Author / date / spec version / status: Architect (sequential role pass) / 2026-10-06 / v1 / READY FOR BUILD
- Input references and versions: User refresh request; four PFR defense screenshots; user-provided PFR YAC/Att TSV; existing automatic FPDS/SumerSports refreshers
- Application location / revision: `C:/Users/jonro/stream-starters` / base `ee5c274`
- Output path / next owner / requested action: this spec / Coder / refresh, validate, and stage football snapshots
- Open issue and decision IDs: None

## Outcome and boundaries

Refresh all established 2026 football data used by RB profiles, receiver profiles, and position matchups. Automatic sources are Fantasy Points and SumerSports. PFR YAC/Att and defense-vs-position remain manual and must use the user’s supplied Week 4 material. Do not change scoring formulas, UI behavior, schedules, or unrelated files.

## Requirements

- Refresh Fantasy Points RB and receiving data and SumerSports WR/TE enrichment with existing population and game-total regression guards.
- Preserve manual YAC while automatic RB capture runs, then replace it with the supplied validated Week 4 table and recalculate RB scores/latest weekly rows.
- Replace QB/RB/WR/TE defense data with all 32 teams from the supplied Week 4 tables.
- Preserve prior weekly snapshots and update the detected latest week rather than duplicating it.
- Validate all focused scoring/data tests, production build, and all three football routes.

## Acceptance criteria

| ID | Observable requirement | Verification method |
| --- | --- | --- |
| AC-1 | RB snapshot contains the current guarded Fantasy Points population and game totals. | Refresh output plus JSON inspection. |
| AC-2 | Receiver snapshot contains current WR/TE populations and SumerSports enrichment. | Refresh output plus JSON inspection. |
| AC-3 | YAC/Att snapshot records the supplied Week 4 RB data and recalculated scores. | Importer output, row count, Derrick Henry spot-check. |
| AC-4 | Defense snapshot contains 32 merged teams with QB/RB/WR/TE Week 4 metrics. | Merge validator, provenance, screenshot spot-checks. |
| AC-5 | Existing scoring, weekly windows, profiles, and matchup routes remain functional. | Focused tests, build, Chromium route walkthrough. |

## Assumptions and decisions

The supplied PFR screenshots and TSV are authoritative manual inputs. Direct PFR table capture may be attempted only as a consistency aid; failure must preserve data until the supplied tables are converted and validated. The unrelated untracked `public/1.png` remains untouched.

## Architect handoff

Run existing automatic importers first, then apply manual PFR inputs, validate each population, and publish only after all checks pass. READY FOR BUILD.
