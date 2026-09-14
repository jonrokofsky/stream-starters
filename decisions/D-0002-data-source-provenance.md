# D-0002: Data source provenance and transformation rules

- Task / author / date / status: SS-20260912-automated-data-ingestion / Manager / 2026-09-12 / PROPOSED
- Inputs / versions / application revision: Architect spec v1; user-provided FanGraphs URLs and Google Sheets formula screenshot, 2026-09-13 / f6cb3b8e65dcac23bb1d92ce4585fb87e4305a7a plus uncommitted task artifacts
- Output path / next owner / requested action: this file / Architect and Coder for MLB pitchers; User for remaining datasets / implement and verify the pitcher adapter, then identify remaining raw providers and transformations
- Related issues / supersedes: blocks source adapters, parity validation, and removal of Google Sheet runtime dependencies; supersedes none

## Decision needed

For each of the six datasets, identify the original provider or report, whether access is free or paid, and any spreadsheet formulas or manual adjustments used to create the published columns. Confirm that Stream Starters may retrieve the provider data server-side. This is required to reproduce advanced and custom metrics without silently changing their meaning.

## Options and recommendation

1. Preserve the current providers and formulas, then automate their retrieval and transformation. Recommended because it protects current scoring behavior.
2. Replace unavailable providers with approved alternatives and explicitly map any statistical differences. This may change outputs and requires user acceptance.
3. Keep selected manual adjustments, such as NFL `ADJUSTMENT`, as private HQ inputs while automating the rest. This is suitable when editorial judgment is intentional.

The source-neutral catalog, validation, snapshot storage, APIs, and HQ controls can proceed while this remains open.

## Confirmed mapping: MLB pitchers

- Provider: FanGraphs Major League starter leaderboard.
- Full-season report: user-provided 2026 URL with `month=33`, `qual=10`, `stats=sta`, and the selected custom columns.
- Last-30-days report: the same leaderboard configuration with `month=3`.
- Master row set: full-season pitchers.
- Join: exact pitcher-name lookup from the master player column to the L30 player-name column.
- Missing L30 player: return blank/null for each L30 metric, matching the fourth `XLOOKUP` argument `""` shown by the user.
- Observed provider mapping: `PlayerName` -> `Player`; `TeamNameAbb` -> `Team`; `Throws` R/L -> `Hand` RHP/LHP; `IP`, `ERA`, `SIERA`, `K%`, `BB%`, `WHIP`, and `SwStr%` map directly; `Strike%` = `Strikes / Pitches`; `Stuff+` = `sp_stuff`.

This resolves source and transformation provenance for `mlb_pitchers`. Same-capture parity passed on 2026-09-13: 251 rows, 5,271 canonical field comparisons, and zero identity, order, or value differences. The pitcher-only public-page cutover may proceed.

## Confirmed inputs: MLB opposing-team offense

- Provider: FanGraphs Major League team batting leaderboards for 2026.
- Purpose: supply the opposing lineup's K%, BB%, and wRC+ context on the pitcher matchup page.
- Team versus LHP: user-provided report with `stats=bat`, `team=0,ts`, `qual=0`, custom fields `type=c,35,34,61`, and `month=13`.
- Team versus RHP: the same report configuration with `month=14`.
- Team last 30 days: the same report configuration with `month=3`.
- Observed machine-readable response for the L30 configuration: 30 aggregate rows containing `TeamNameAbb`, `K%`, `BB%`, and `wRC+`. The response also carries irrelevant representative player fields; those are not team identities and must be ignored.
- Canonical master identity: normalized `TeamNameAbb`, with one row per MLB team. The three responses join by that key and must produce the existing `RHP`, `LHP`, and `L30` K%, BB%, and wRC+ fields expected by `/baseball/pitchers`.

These three inputs resolve the upstream reports for `mlb_team_offense`. Exact display formatting, team-code normalization, same-capture parity against an independent reference, and failure/last-known-good behavior remain implementation gates before public cutover.

## Authority and resolution

The user decides which providers, credentials, formulas, and manual inputs are authoritative. The MLB pitcher portion is decided by the user's URLs, XLOOKUP description, and screenshot on 2026-09-13. The MLB opposing-team offense inputs are decided by the user's three FanGraphs URLs on 2026-09-13. The overall decision remains PROPOSED while the remaining datasets and any unverified transformation details are unresolved. Architect updates source mappings, Coder implements approved adapters, and Tester runs parity checks against frozen reference snapshots.
