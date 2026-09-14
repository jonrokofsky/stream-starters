# SS-20260912-automated-data-ingestion: Architect spec

- Author / date / spec version / status: Architect / 2026-09-13 / v6 / PITCHER AND `mlb_team_offense` WORK READY; `nfl_running_backs` SOURCE DISCOVERY READY, AUTOMATED RB ADAPTER/CUTOVER BLOCKED BY D-0002
- Input references and versions: user request in current Codex session; user-confirmed FanGraphs pitcher source URLs and PitcherAll/L30 formula screenshot, 2026-09-13; user-confirmed FanGraphs MLB team batting L30/vL/vR reports and clarification that opposing-team stats means baseball offense, 2026-09-13; user decision for once-daily in-season refreshes with no live updates, 2026-09-13; Tester QA through round 5 and `reviews/SS-20260912-automated-data-ingestion-pitcher-parity.json`; user-confirmed Fantasy Points Data Basic Rushing source and read-only 2026 report inspection, 2026-09-13; `AGENTS.md`; `STREAM_STARTERS_CONSTITUTION.md` v1; `PRODUCT_MEMORY.md`; `WORKFLOW.md`; `agents/ARCHITECT.md`; current application source; six public Google Sheet CSV feeds inspected 2026-09-12
- Application location / revision: `C:/Users/jonro/stream-starters` / `f6cb3b8e65dcac23bb1d92ce4585fb87e4305a7a` plus pre-existing uncommitted private-HQ review updates outside this spec
- Output path / next owner / requested action: `specs/SS-20260912-automated-data-ingestion.md` / Manager, then Coder/Tester / continue pitcher handoff, implement the v6 FanGraphs `mlb_team_offense` adapter, and perform only the bounded `nfl_running_backs` discovery defined in v5
- Open issue and decision IDs: D-0002 (resolved for `mlb_pitchers` and `mlb_team_offense`; partially resolved for `nfl_running_backs`; unresolved for three other datasets); D-0003 (decided: daily refresh while each sport is in season, no live updates)

## Outcome and boundaries

The site currently depends on six published Google Sheet CSV feeds. Each feature page downloads and parses those feeds in the visitor's browser with `cache: "no-store"`. Updating the site therefore depends on the user's manual sheet workflow, Google availability, duplicated client parsers, and the continued public availability of each sheet URL.

Create one trustworthy ingestion path that fetches source data, transforms it into stable Stream Starters dataset contracts, validates it, and atomically promotes a good snapshot. Public feature pages read the latest good Stream Starters snapshot through same-origin server endpoints. Data refreshes run once daily on hosted infrastructure while the applicable sport is in season; there are no live or continuous updates and no always-on home PC. The initial schedule covered `mlb_pitchers`; v6 adds `mlb_team_offense` to that same MLB run after its parity gate passes.

### In scope

- A shared catalog and schema contract for all six current datasets.
- Server-owned storage of versioned dataset snapshots and refresh metadata using the project's existing Supabase backend.
- Source adapters that isolate provider-specific fetching and transformation from application-facing contracts.
- Strict validation, staging, atomic promotion, last-known-good behavior, and useful refresh errors.
- Same-origin read APIs used by the six existing page consumers.
- A private, session-triggered refresh control and status view in Agent HQ, protected by the existing HQ authentication.
- A hosted Vercel Cron trigger for `mlb_pitchers` that calls the same server-owned refresh service once daily and skips explicitly outside MLB season.
- Removal of direct Google Sheet URLs and CSV parsing from production page code after equivalent source adapters are approved and verified.
- Documentation of required environment variables without committing credentials.

### Out of scope

- Continuous/live data updates, continuous agents, or an always-on home computer.
- Buying or subscribing to a data provider without user approval.
- Inventing, changing, or simplifying scoring formulas or statistical definitions.
- Redesigning the public sports pages or the Agent HQ theme.
- Migrating the existing hitter Elo tables, except that player identity compatibility must be preserved.
- Historical analytics beyond retaining enough snapshot metadata for rollback and diagnosis.

## Current data inventory

| Dataset key | Current consumers | Current size observed | Identity / required contract fields |
| --- | --- | ---: | --- |
| `mlb_pitchers` | `/baseball/pitchers` | 247 rows | `Player`, `Team`, `Hand`; season and L30 `IP`, `ERA`, `SIERA`, `K%`, `BB%`, `WHIP`, `Strike%`, `SwStr%`, `Stuff+` |
| `mlb_team_offense` | `/baseball/pitchers` | 30 rows | `Team`; `K%`, `BB%`, `wRC+` versus right/left hand and L30 |
| `mlb_hitters` | `/baseball/hitters` | 517 rows | `Name`, `Team`, `Hand`; season and L30 `PA`, `BB%`, `K%`, `OBP`, `SLG`, `wRC+`, `EV90`, `SqUpSw%`, `Z-Contact%`, `O-Swing%`, `SB` |
| `mlb_hitter_rank_pool` | `/baseball/hitters/rankings` | 398 rows | `Name`, `Team`, `Pos`, `$ Value`, `PA`, `BB%`, `K%`, `xBA`, `Z-Contact%`, `SqUpSw%`, `HR`, `HR%`, `EV90`, `Z-Swing%`, `O-Swing%`, `Z-O`, `wOBA`, `xwOBA`, `SB`, `Team R/G` |
| `nfl_running_backs` | `/football/rb`, `/football/rb/matchup` | 97 rows | `Name`, `Team`; rushing profile, receiving, opportunity, touchdown, fantasy-point, age, and derived score fields currently consumed by the page |
| `nfl_defense_by_position` | `/football`, `/football/rb/matchup` | 32 rows | `Team`, `Acronym`; QB/RB/TE/WR allowed volume, yardage, touchdown, fantasy PPG fields plus `ADJUSTMENT` |

Observed CSVs also contain unnamed spacer columns. Those are presentation artifacts and must not enter the canonical contracts.

## Version 2 scope: FanGraphs `mlb_pitchers` adapter

The user confirmed that the current pitcher master is season-row based and that both input feeds are the same 2026 FanGraphs starter leaderboard with the same custom columns. The full-season request uses `month=33`; the last-30-days request uses `month=3`. Both are available as JSON from FanGraphs at `/api/leaders/major-league/data` with the remaining query parameters preserved from the user-confirmed URLs.

The pitcher adapter must:

1. Fetch the full-season and L30 JSON server-side. Keep the endpoint base and complete query parameter sets in one adapter/configuration module; the two requests must differ only by the confirmed `month` value unless a later decision records another change.
2. Treat the full-season response as the master row set. Do not add an L30-only player to the output.
3. Join the L30 response by exact `PlayerName`, matching the spreadsheet's `XLOOKUP($A8,'L30'!$B:$B,...,"")` behavior. If a season player has no exact L30 match, retain the season row and emit blank L30 metric values.
4. Map FanGraphs fields to the existing canonical pitcher contract as follows:

| Canonical field | Full-season source/calculation | L30 source/calculation |
| --- | --- | --- |
| `Player` | `PlayerName` | join key only |
| `Team` | `TeamNameAbb` | season value remains authoritative |
| `Hand` | `Throws` | season value remains authoritative |
| `IP`, `ERA`, `SIERA`, `K%`, `BB%`, `WHIP`, `SwStr%` | same-named field | same-named field emitted with `L30 ` prefix |
| `Strike%` | `Strikes / Pitches` | `Strikes / Pitches`, emitted as `L30 Strike%` |
| `Stuff+` | `sp_stuff` | `sp_stuff`, emitted as `L30 Stuff+` |

5. Emit percentage values in the canonical representation expected by the existing pitcher UI/reference snapshot. Calculation comparisons should use numeric values before display formatting so percent signs and rounding do not change business meaning.
6. Treat missing/non-finite `Strikes` or `Pitches`, or `Pitches <= 0`, as a blank Strike% for that period rather than dividing by zero. Required identity fields and the general snapshot validation rules still apply.
7. Preserve exact player-name identity for this parity release. Normalize only surrounding whitespace; do not case-fold, remove punctuation/accents, or perform fuzzy matching.
8. Record `FanGraphs` as the provider, the 2026 leaderboard parameters (including `month=33` and `month=3`), fetch times, row counts for both responses, canonical output row count, and checksum in refresh metadata. Do not expose unnecessary upstream response content.
9. Limit this version 2 source-specific implementation to `mlb_pitchers`. The separate `mlb_team_offense` feed is governed by the subsequently resolved version 6 scope.

## Version 3 scope: daily in-season scheduling

The user decided there should be no live updates. Each sport's datasets should refresh once daily only while that sport is in season. Version 3 implements this policy for the confirmed `mlb_pitchers` adapter; unresolved baseball and football adapters are not added to the scheduled run yet.

1. Configure one Vercel Cron invocation per day at `10:00 UTC`, a reversible v1 default corresponding to 6:00 AM Eastern during MLB daylight time. Document that the Eastern wall-clock equivalent changes when daylight saving time changes because the schedule is UTC.
2. Route the cron invocation through a dedicated server endpoint that calls the same `mlb_pitchers` refresh service used by authenticated manual refreshes. Do not duplicate fetch, transform, validate, snapshot, or activation logic in the cron route.
3. Authenticate the hosted call with `CRON_SECRET`. The route must verify the expected bearer credential server-side, fail closed when the secret is missing or incorrect, and never return or log the secret.
4. Check an MLB in-season guard server-side before calling FanGraphs or writing a refresh run/snapshot. The guard uses configured current MLB season start and end dates, inclusive, with comparison performed in UTC. The boundary dates must be visible in non-secret configuration and straightforward to update for the next season.
5. Outside the configured MLB season, return a successful explicit result such as `{ status: "skipped", reason: "outside_mlb_season" }`. A skip makes no FanGraphs request, creates no data snapshot, and does not change the active pitcher dataset or last-success timestamp.
6. During the configured MLB season, an authorized cron invocation requests only `mlb_pitchers` and uses the existing per-dataset overlap protection. Its refresh result retains the shared statuses (`ready`, `unchanged`, or `failed`) and last-known-good guarantees.
7. Keep the private HQ manual pitcher refresh available as an operational fallback. Its use does not change the daily cron schedule, and an overlap with cron is rejected or coalesced by the shared refresh service.
8. Record safe cron-run evidence separately from dataset activation metadata: invoked time, dataset, in-season/skip decision, completion status, and sanitized error. Do not represent the daily snapshot as live data in public or HQ copy.
9. Future approved football datasets must reuse the same cron-to-refresh-service pattern with a separate football season guard. Do not apply MLB dates to football or add a football schedule before its source adapters are approved.

## Version 4 scope: same-capture pitcher parity

Tester round 5 retained a complete comparison between the published PitcherAll sheet and live FanGraphs. It found 247 common players, no sheet-only players, four newer FanGraphs-only players, and broad season/L30 changes consistent with different capture times. No remaining transformation defect was isolated. Because the sheet and FanGraphs are rolling datasets, exact cross-time equality is not a valid release condition and would force a manual sheet refresh that this task is intended to remove.

Keep `reviews/SS-20260912-automated-data-ingestion-pitcher-parity.json` as migration context. It documents the old sheet contract, membership relationship, display conventions, and the absence of a systematic mapping failure at that capture. Its expected time-based mismatches do not determine v4 pass/fail.

Prove parity with one bounded verification run that:

1. Fetches the season (`month=33`) and L30 (`month=3`) FanGraphs responses once, freezes each response as an immutable input for the duration of the run, and records capture time, byte count, row count, and SHA-256 hash for both inputs.
2. Feeds that exact frozen pair to the production pitcher adapter/normalizer and to a separately implemented reference transformer. Neither path may refetch data during the comparison.
3. Keeps the reference transformer independent of production transformation helpers. It may share type declarations and the canonical 21-field list, but it must separately implement the documented legacy rules: season rows are the master; trim-only exact `PlayerName` lookup into L30; exclude L30-only players; blank L30 fields when absent; direct field mappings; `sp_stuff` to Stuff+; `Strikes / Pitches` to Strike%; R/L hand display mapping; ordinary team abbreviation handling; and preservation of `<count> Tms` multi-team labels.
4. Independently applies the observed legacy display rules: IP uses one decimal with trailing `.0` omitted; ERA/SIERA/WHIP use two decimals; percentage fields use two decimal percentage points; Stuff+ uses a whole number; empty string and canonical null compare as the same blank value.
5. Compares the production and reference outputs across every valid season-master row and all 21 canonical fields: `Player`, `Team`, `Hand`, nine season metrics, and nine L30 metrics. The report includes total rows, identity/order differences, total field comparisons, per-field match/mismatch/blank counts, and bounded examples for any mismatch.
6. Treats an input with missing required source fields, duplicate trimmed season identities, an unreadable response, or a changed response hash within the run as an invalid verification run, not a parity pass or adapter failure. Capture a fresh pair and rerun.

Exact pass condition: both transforms use the recorded identical response hashes; canonical row count, player identity set, and deterministic row order are identical; every corresponding canonical field matches after the independent display normalization above; and total mismatches, missing rows, and extra rows are all zero.

Exact fail condition: on a valid frozen input pair, any row membership/order difference or any nonblank canonical field mismatch remains between production and reference output. A failure blocks AC-P8 and must identify the affected rules/fields. Expected differences between the older published sheet and the live same-capture result remain migration context unless they reveal a separate stable product requirement.

## Version 5 scope: Fantasy Points Data `nfl_running_backs` discovery

The user identified the Fantasy Points Data Basic Rushing report at `https://data.fantasypoints.com/nfl/tools/player/rushing-basic` as the source used for the RB sheet and wants the 2026 season. Read-only inspection confirms the report is marked FREE, can be viewed without signing in, offers 2026 as a selection, currently shows 10 rows covering one game at the capture time, and offers CSV/XLSX exports with headers.

These observations establish data provenance, but they do not establish a supported server-to-server API or permission to automate the webpage export. They also do not establish that the report supplies the sheet's age or composite score fields. Version 5 is therefore a bounded discovery and parity stage, not authorization to scrape the UI or cut over `nfl_running_backs`.

### Confirmed direct-field candidates

Inventory the actual export headers and document exact mappings. The visible report includes these source concepts, which may map directly or by a display-only rename:

| Fantasy Points Data concept/header | Current canonical candidate |
| --- | --- |
| `ATT`, rushing `YDS`, `RuYDS/G`, `YPC`, rushing TD | `ATT`, `RuYds`, `RuYds/G`, `RuYds/Rush`, `RuTD` |
| `1+`, `3+`, `5+`, `10+`, `15+`, `20+`, `30+` rushing gain rates | corresponding `1+ RuYd%` through `30+ RuYd%` |
| inside-5/10/20 rushing attempts/rates | current inside-5/10/20 carry fields after exact header confirmation |
| `TGT`, `TGT%`, `REC`, receiving `YDS`, team receiving-yard share, `YPR`, `YPT`, `RecYDS/G`, catch% | `Targets`, `Target Share`, `Rec`, `Rec Yards`, `Team Rec Yards %`, `RecYds/Rec`, `RecYds/Tgt`, `RecYds/G`, `Catch%` |
| receiving TD, team TD%, `WO`, `WO/G`, `FP/G`, `FP` | `Rec. TD`, `Tm TD%`, `Weighted Opp.`, `Weighted Opp./G`, `FP/G`, `FP` |
| `FUM` | retain as documented source-only data unless a current consumer requirement is identified |

Do not treat similar labels as proven equivalent until units, section context, null behavior, and display formatting are checked in an exported 2026 artifact. In particular, distinguish the report's rushing and receiving `YDS` columns by section/order rather than header text alone.

### Discovery and parity requirements

1. Determine whether Fantasy Points provides a documented or stable machine-readable request for this report that can run server-side on Vercel without interactive login, browser automation, copied session cookies, CAPTCHA bypass, or UI scraping. Record request method, required non-secret parameters for 2026, response format, pagination/row limits, update timestamp or game scope, rate limits, authentication requirements, and applicable provider terms.
2. If no permitted stable server path is confirmed, stop the production adapter at a typed provider interface and return D-0002 to Manager with evidence and options. The existence of CSV/XLSX buttons does not satisfy this requirement.
3. Capture one 2026 CSV or XLSX export as a discovery/reference artifact where permitted. Record capture time, report filters, displayed row/game count, header order, byte/hash metadata, and whether all displayed rows are exported. Do not treat a manual export as the production ingestion mechanism.
4. Produce a field matrix for every current `nfl_running_backs` canonical field with one classification: exact direct mapping, renamed/reformatted direct mapping, derived with confirmed formula, absent, or unresolved. Include units, rounding, blank/null convention, and source section for duplicate header names.
5. Prove direct-field transformation against one frozen source artifact: output membership matches the agreed RB population/filter, every classified direct field matches for every row after documented formatting, and the retained report contains per-field totals plus bounded mismatch examples. Any mismatch in a confirmed direct field blocks the adapter; time drift between separately captured artifacts does not establish a transform defect.
6. Make validation season-aware. The current confirmed 2026 report contains 10 rows/one game, so the prior 97-row sheet size must not be used as a fixed minimum. A valid result must reconcile to the source's displayed/exported total and required identities for the same filters; unexplained truncation, missing pages, or a zero-row in-season response is blocking.
7. Confirm how the source population is restricted to running backs, including any position filter and treatment of non-RB players with rushing attempts. Do not infer the filter from the endpoint name.
8. Do not calculate or fill `Age`, `2026 Age`, `Rush Gain Profile`, `Rush Score`, `Age Adjusted Rush Score`, `Rec Score`, `Opportunity Score`, or `Total TD` until their source/formulas and rounding rules are confirmed. Keep current Google-backed production behavior for the RB pages until all user-visible required fields have an approved mapping.
9. Do not add `nfl_running_backs` to Vercel Cron yet. After its adapter and full canonical parity pass, it should follow D-0003's once-daily football in-season pattern with a separate football season guard.

## Version 6 scope: FanGraphs `mlb_team_offense` adapter

The user clarified that “opposing team stats” means MLB team batting/offense used by the pitcher matchup page. It does not add or change any football defense/opponent requirement.

Build `mlb_team_offense` from three user-provided 2026 FanGraphs team batting reports at `/api/leaders/major-league/data`. All three use `stats=bat`, `team=0,ts`, `qual=0`, and custom fields `type=c,35,34,61`; only the report period/split changes:

| Report | `month` | Canonical output fields |
| --- | ---: | --- |
| Last 30 days | `3` | `K% L30`, `BB% L30`, `wRC+ L30` |
| Versus left-handed pitching | `13` | `K% vL`, `BB% vL`, `wRC+ vL` |
| Versus right-handed pitching | `14` | `K% vR`, `BB% vR`, `wRC+ vR` |

Read-only probing of the L30 endpoint returned 30 aggregate team rows with `TeamNameAbb`, `K%`, `BB%`, and `wRC+`. The response may also contain irrelevant representative player fields such as `PlayerName`; those must not be used for identity, membership, ordering, or output.

The adapter must:

1. Construct all three requests from one shared 2026 team-batting query definition and vary only the confirmed `month` value. Preserve the complete user-provided query parameters rather than reconstructing them from page defaults.
2. Key and join exclusively by trimmed, canonical MLB `TeamNameAbb`. Use the L30 report as the deterministic master order, require 30 distinct MLB team keys, and require the vL and vR reports to contain the identical team-key set. Missing, extra, blank, or duplicate team keys fail the candidate snapshot; do not emit a partially populated team row.
3. Map only `K%`, `BB%`, and `wRC+` from each report into the nine period/split fields in the table above. Ignore `PlayerName` and every unrequested source field.
4. Preserve the existing team-offense contract and pitcher-page meaning: vL describes the offense facing a left-handed pitcher, vR describes the offense facing a right-handed pitcher, and L30 is the team's rolling 30-day offense.
5. Normalize direct numeric values and display formatting once in the adapter/canonical layer. Document whether FanGraphs percentages arrive as fractions or percentage points, and match the current UI's percentage/wRC+ display without changing comparison or percentile behavior.
6. Validate all nine metrics as finite for every team. An upstream report failure, wrong schema, or team-set mismatch fails only `mlb_team_offense` and preserves its prior active snapshot.
7. Prove transformation parity in one bounded-capture run: freeze the three FanGraphs responses once, record hashes/row counts, and feed the identical parsed payloads to production code and a separately implemented reference merge following rules 1–6. Compare all 30 teams and all 10 canonical fields (`Team` plus nine metrics); exact normalized equality with zero missing/extra rows and zero field mismatches is required.
8. Retain comparison to the older Google team CSV only as migration/display context when capture times differ. Do not require the user to refresh that sheet to pass the same-capture adapter gate.
9. After adapter parity and snapshot-path checks pass, cut only the team-offense request on `/baseball/pitchers` to the same-origin dataset API. The pitcher-row cutover remains governed by AC-P6/AC-P8.
10. After cutover readiness, add `mlb_team_offense` to the existing once-daily `10:00 UTC` MLB in-season scheduled invocation using the same MLB guard and per-dataset isolation. Do not add a second daily cron run solely for this dataset.

## Requirements

### Architecture and flow

Use this flow for every dataset:

`approved upstream provider -> server-side source adapter -> canonical transformer -> validator -> staged snapshot -> atomic activation -> same-origin read API -> existing page`

1. Maintain a single dataset catalog in application code. Each entry defines the dataset key, canonical schema/version, adapter, identity field, minimum viable row count, and fields required by current consumers.
2. Keep source-specific column names and calculations inside adapters. Public pages depend only on canonical Stream Starters fields.
3. Store immutable snapshot records in Supabase with, at minimum: dataset key, schema version, source/provider label, source timestamp when available, ingest timestamp, row count, checksum, status, sanitized error summary, and JSON payload or a linked normalized table. Maintain one active snapshot pointer per dataset so promotion is atomic.
4. Expose a same-origin read endpoint for each dataset. A successful response includes the active data and metadata (`schemaVersion`, `updatedAt`, `rowCount`, and source label). Do not expose Supabase service credentials or provider secrets to the browser.
5. Provide an authenticated refresh endpoint and Agent HQ control for `Refresh all` and individual datasets. It must use the existing verified HQ session, reject anonymous requests, prevent accidental overlapping refreshes of the same dataset, and report per-dataset progress/result.
6. A refresh validates and stages each dataset independently. A failed dataset keeps its previous active snapshot; other valid datasets may activate. Activation must never expose a partially written dataset.
7. Public page behavior and calculations remain equivalent after cutover. Loading, empty, and error text should refer to Stream Starters data rather than Google Sheets.
8. Remove all production client requests to `docs.google.com` after D-0002 adapters pass parity checks. The backup text file is not runtime code and may be handled separately.

### Validation and identity

- Reject a snapshot when required fields are absent, the identity field is blank, identities are duplicated after normalization, no usable rows remain, or row count falls below the catalog threshold.
- Reject non-finite numeric values for fields used in calculations after provider-specific blanks and percent formats are normalized. Optional missing values may remain null and display through the page's existing empty-value behavior.
- Normalize whitespace, team abbreviations, percentage representation, and numeric separators exactly once in the adapter/transform layer.
- Preserve display names used as keys by the existing `hitter_rankings` and `hitter_ranking_history` tables. If the approved provider supplies stable player IDs, store them as an additional field; do not silently replace name-based Elo keys in this task.
- Compute a deterministic checksum over canonical rows so a no-change refresh can report `unchanged` without creating avoidable duplicate snapshots.
- Keep the previous active snapshot on every fetch, transform, validation, storage, or activation failure.

### Status, failure states, and usability

- The private HQ data view shows all six datasets with last successful refresh time, source timestamp when known, row count, schema version, and one of: `ready`, `refreshing`, `unchanged`, `failed`, or `never loaded`.
- Refresh buttons have clear accessible names, expose busy/disabled state during work, and show a concise completion result. Keyboard operation and narrow-screen layouts must remain usable.
- A provider error shown to the user identifies the affected dataset and next useful action without exposing URLs containing secrets, tokens, response bodies, stack traces, or credentials.
- If a refresh fails but an active snapshot exists, public pages continue using it. If no active snapshot exists, the public page shows its existing data-unavailable state rather than crashing.
- Store enough sanitized run metadata to distinguish fetch, transformation, validation, storage, and activation failures.

### Security and operations

- All provider credentials and Supabase write credentials stay server-side in environment variables. Do not log or persist secret values.
- Refresh mutations require the existing HQ authentication and same-origin requests. Read endpoints may remain public because the resulting sports datasets are already publicly displayed, subject to provider terms recorded under D-0002.
- Bound upstream request duration, response size, and refresh concurrency. Treat upstream content as untrusted input.
- The operational model is a hosted once-daily in-season refresh, plus the private HQ control as a manual fallback. No live polling, heartbeat, or always-on PC is required.
- Vercel Cron calls the same server-owned refresh operation through `CRON_SECRET`; the HQ path continues to use the user's HQ session. Keep the credentials and authorization paths distinct.

## Acceptance criteria

| ID | Observable requirement | Verification method |
| --- | --- | --- |
| AC-1 | The code contains one typed catalog covering the six dataset keys, their schema versions, identity fields, minimum row thresholds, and required canonical fields. | Inspect catalog and run type checking/build. |
| AC-2 | A valid fixture for each dataset can pass through its adapter/transformer and validator into a staged snapshot with normalized rows and complete metadata. | Run focused automated checks against representative fixtures, including quoted CSV values if an adapter consumes CSV. |
| AC-3 | Missing required columns, duplicate/blank identities, invalid calculated numbers, undersized datasets, and oversized/failed upstream responses are rejected with a dataset-specific sanitized error. | Run focused negative checks for each validation class. |
| AC-4 | Activating a valid snapshot makes it the complete result returned by its same-origin read API; no partially written data can be observed. | Integration check against a non-production database or repository-supported test double. |
| AC-5 | A failed or unchanged refresh leaves the previous active snapshot readable; an unchanged refresh reports `unchanged`. | Integration check using a prior snapshot, identical input, and invalid replacement input. |
| AC-6 | Anonymous requests cannot start any refresh; an authenticated HQ session can start all or one dataset and concurrent refreshes of the same dataset are safely rejected or coalesced. | Route checks for anonymous, authenticated, and overlapping requests. |
| AC-7 | Agent HQ shows current status and metadata for all six datasets and provides accessible all/per-dataset refresh controls with clear success and failure results on desktop and narrow mobile widths. | Browser walkthrough while authenticated, keyboard check, and mobile-width visual check. |
| AC-8 | After approved source adapters are connected, the six current public consumers load equivalent records through same-origin Stream Starters APIs and retain their current user-facing calculations and selection behavior. | Dataset-by-dataset parity comparison against an agreed reference snapshot plus browser smoke checks for all six consumers. |
| AC-9 | After cutover, production application code makes no client-side request to a Google Sheets CSV URL and no public error/loading copy instructs the user about Google Sheets. | Repository search excluding non-runtime backup/reference files plus browser network inspection. |
| AC-10 | A failed refresh never removes the last-known-good public data and never leaks a provider or database secret in UI, API output, or logs captured by tests. | Failure-path integration check and output inspection. |
| AC-11 | Configuration documentation lists variable names, dataset/provider purpose, and local/production setup steps without credential values; the normal production build succeeds. | Documentation inspection and `npm run build`. |

### Version 2 pitcher-adapter criteria

| ID | Observable requirement | Verification method |
| --- | --- | --- |
| AC-P1 | The `mlb_pitchers` adapter makes two FanGraphs JSON requests using the user-confirmed 2026 starter/custom-column parameters; the season request has `month=33` and the L30 request has `month=3`, with no other intentional parameter difference. | Adapter/config inspection and a request-construction test. |
| AC-P2 | Canonical output contains exactly the valid season master players in season order or a documented deterministic order; an L30-only player is excluded and a season-only player remains with blank L30 metrics. | Focused fixture test covering matched, season-only, and L30-only players. |
| AC-P3 | `PlayerName`, `TeamNameAbb`, `Throws`, direct metric fields, `sp_stuff`, and all L30 counterparts map to the canonical fields in the table above. | Field-by-field fixture test. |
| AC-P4 | Season and L30 Strike% equal `Strikes / Pitches` before canonical display formatting; zero, missing, and non-finite pitch inputs produce blank values without failing an otherwise valid row. | Numeric boundary tests with representative counts and invalid denominators. |
| AC-P5 | Exact-name joining matches the spreadsheet behavior: surrounding whitespace may be trimmed, but case, punctuation, and accents are not fuzzily altered. Duplicate normalized season identities fail validation rather than silently merging. | Join and duplicate-identity fixture tests. |
| AC-P6 | In one valid run, the production adapter/normalizer and a separately implemented legacy-rule reference consume the identical frozen season/L30 FanGraphs response pair. They produce identical canonical row count, player identity set, deterministic order, and values for all 21 canonical fields after independent legacy display normalization, with zero missing rows, extra rows, or field mismatches. The report records both input hashes and full per-field totals. The stale-sheet report remains migration context and is not required to match newer source data. | Tester inspects independence of the reference implementation and retains the machine-readable same-capture parity report; any difference on a valid pair is FAIL, while invalid capture/schema prerequisites are NOT RUN and require a fresh capture. |
| AC-P7 | A successful pitcher refresh can stage and activate through the shared snapshot pipeline; either FanGraphs request failing or returning an invalid payload leaves the prior active pitcher snapshot untouched and reports which period failed. | Integration/failure-path check. |
| AC-P8 | After AC-P1 through AC-P7 pass, including the v4 AC-P6 same-capture gate, `/baseball/pitchers` obtains pitcher rows from the same-origin dataset API while its separate team-offense request remains functional; no user-facing pitcher calculation or selection behavior regresses. | Browser/network smoke check and current-page behavior comparison. |

### Version 3 scheduling criteria

| ID | Observable requirement | Verification method |
| --- | --- | --- |
| AC-S1 | Hosted configuration invokes the pitcher cron endpoint exactly once daily at `10:00 UTC`; documentation states the Eastern daylight-time equivalent and identifies the time as a reversible default. | Inspect Vercel cron configuration and operations documentation. |
| AC-S2 | The cron endpoint delegates to the same `mlb_pitchers` refresh service as the HQ/manual path and contains no duplicate provider or snapshot pipeline. | Route/service code inspection and focused invocation test. |
| AC-S3 | Missing, malformed, or incorrect `CRON_SECRET` authorization receives a non-success response and performs no provider request, refresh run, snapshot write, or activation; the secret is absent from responses and captured logs. | Route tests with missing/invalid credentials and output inspection. |
| AC-S4 | An authorized invocation on the configured MLB start date, a date inside the interval, and the configured end date runs the pitcher refresh; season boundaries are inclusive and UTC behavior is deterministic. | Guard tests using an injected clock at both boundaries and an in-season date. |
| AC-S5 | An authorized invocation immediately before or after the configured MLB season returns `status: "skipped"` with reason `outside_mlb_season`, makes no FanGraphs request or database mutation, and leaves active data and last-success time unchanged. | Guard/route tests with provider and storage spies plus before/after metadata comparison. |
| AC-S6 | An in-season scheduled refresh reports `ready`, `unchanged`, or `failed` from the shared service and preserves the prior active snapshot on failure; overlapping manual/cron refreshes cannot activate competing snapshots. | Integration tests for success, unchanged, failure, and overlap paths. |
| AC-S7 | HQ and public copy describe pitcher data as daily/in-season and do not claim live or continuous updates. | Copy inspection and HQ/public browser smoke check. |
| AC-S8 | No football dataset is scheduled in v3; the scheduling boundary allows a future football implementation to use its own season dates and the shared refresh pattern. | Configuration and service-boundary inspection. |

### Version 5 RB source-discovery criteria

| ID | Observable requirement | Verification method |
| --- | --- | --- |
| AC-RD1 | A retained discovery record identifies the exact 2026 Basic Rushing report selection, capture time, visible/exported row and game counts, complete ordered headers, source artifact hash, pagination state, and filters. | Inspect the record against one permitted CSV/XLSX export and the report UI metadata. |
| AC-RD2 | A server automation assessment either demonstrates a stable permitted request from a Vercel-like server context without browser/session automation, or records BLOCKED with the missing capability/permission and feasible alternatives. A visible export button alone cannot pass. | Review provider documentation/terms and execute a bounded read-only request when permitted; retain sanitized request/response metadata. |
| AC-RD3 | The field matrix classifies every current `nfl_running_backs` canonical field and records exact source header/section, units, null handling, and formatting for each confirmed direct field. No composite/age field is labeled direct without evidence. | Matrix review against the frozen export and current dataset contract. |
| AC-RD4 | For one valid frozen 2026 source artifact, the discovery transformer matches the agreed RB membership and every confirmed direct field across every exported row after documented formatting, with zero unexplained row or direct-field mismatches. | Retained machine-readable parity report with per-field totals and bounded differences. |
| AC-RD5 | Early-season validation accepts the confirmed 10-row/one-game result only when it reconciles to the same source filters/export total; it rejects unexplained truncation, missing pages, duplicate/blank identities, and a zero-row in-season response. | Focused tests using injected source totals/pages and early-season fixtures. |
| AC-RD6 | The discovery record explicitly resolves or keeps open the RB population rule, including position filters and non-RB rushers; no production adapter assumes this rule. | Filter/request evidence and Manager decision record. |
| AC-RD7 | Age fields, `Rush Gain Profile`, `Rush Score`, `Age Adjusted Rush Score`, `Rec Score`, `Opportunity Score`, and `Total TD` remain unresolved/blank in discovery output unless their exact source or formula and rounding are recorded. | Field-matrix and fixture inspection. |
| AC-RD8 | No production RB page cutover, Google-feed removal, or football cron entry occurs during discovery. | Repository/configuration search and browser network inspection if a preview is produced. |

### Version 6 team-offense criteria

| ID | Observable requirement | Verification method |
| --- | --- | --- |
| AC-T1 | The adapter constructs three 2026 FanGraphs team batting requests with `stats=bat`, `team=0,ts`, `qual=0`, and `type=c,35,34,61`; the only intended report difference is `month=3`, `13`, or `14`. | Request-construction inspection and focused test. |
| AC-T2 | The L30 response supplies deterministic master order and all three responses contain the identical set of exactly 30 distinct canonical `TeamNameAbb` keys; player fields cannot affect the result. | Fixture tests with misleading PlayerName values plus missing, extra, and duplicate team cases. |
| AC-T3 | `month=3` maps to the three L30 fields, `month=13` to the three vL fields, and `month=14` to the three vR fields; every canonical row contains `Team` plus nine finite metrics. | Field-by-field fixture test including distinguishable values for each split. |
| AC-T4 | Percentage units/rounding and wRC+ formatting are documented and preserve current pitcher-page display and percentile calculations. | Numeric fixture tests and current-page comparison. |
| AC-T5 | In one valid frozen three-response capture, production and an independent reference merge use identical recorded input hashes and produce the same 30-team order and all 300 canonical field values, with zero missing/extra rows or field mismatches. | Retained machine-readable same-capture parity report; any mismatch on valid input is blocking. |
| AC-T6 | Failure or invalid schema/team membership in any one of the three reports leaves the prior active `mlb_team_offense` snapshot unchanged and identifies the failing split without exposing raw upstream content. | Integration/failure-path tests for L30, vL, and vR. |
| AC-T7 | After AC-T1–AC-T6 pass, `/baseball/pitchers` reads team offense from the same-origin API, retains pitcher matchup behavior, and no longer requests the Google team CSV. | Browser/network and behavior smoke check. |
| AC-T8 | Once cutover-ready, `mlb_team_offense` joins the single daily 10:00 UTC MLB cron operation, uses the existing MLB season guard and per-dataset isolation, and does not create another daily schedule. | Cron configuration/route inspection and mixed-result scheduled-run test. |
| AC-T9 | No football code, dataset contract, source decision, or season guard changes as a consequence of the phrase “opposing team stats.” | Focused repository diff inspection. |

## Assumptions and decisions

### Confirmed and observed

- The user wants automated uploads and wants to stop relying on Google Sheet CSVs. Source: current session request.
- The agents operate while the user is online; 24/7 automation is not required. Source: `PRODUCT_MEMORY.md` and prior user direction.
- The application already uses Supabase server-side for hitter Elo data, so using the same backend for active dataset snapshots avoids introducing another storage vendor. Source: `lib/supabaseAdmin.ts` and `app/api/hitter-rankings/route.ts`.
- Six runtime datasets are fetched from four published spreadsheets/six tabs, and their current observed row counts and headers are recorded above. Source: application code and public feeds inspected 2026-09-12.
- The repository contains final calculated fields but no raw-data download workflow, spreadsheet formulas, source attribution, or provider credentials for rebuilding those fields. Source: repository audit at revision listed in the envelope.

### Reversible defaults

- Use one versioned snapshot payload per dataset for the initial implementation because current datasets are small (about 32 to 517 rows). Dedicated normalized tables may replace payload storage later if query/search needs grow.
- Keep public reads simple and cacheable with freshness controlled by Stream Starters metadata; refreshes explicitly invalidate or bypass stale application caches.
- Retain the last three successful snapshots per dataset initially, with deletion performed only by an explicit maintenance operation. Increase retention if audit/history needs emerge.
- Run each dataset refresh separately behind `Refresh all` so one provider failure does not roll back unrelated successful datasets.
- Schedule only the confirmed pitcher adapter in v3. Add other datasets to their sport's daily run only after their D-0002 source mapping and parity checks are complete.

### D-0002 — resolved for pitchers and MLB team offense; partially resolved for running backs

Decision owner: User, routed by Manager. On 2026-09-13 the user resolved the technical source and transformation mapping for `mlb_pitchers`: FanGraphs 2026 starter/custom-column JSON, `month=33` for full season, `month=3` for L30, exact `PlayerName` lookup from season rows into L30 rows, blank on no match, `Strikes / Pitches` for Strike%, and `sp_stuff` for Stuff+. The scoped pitcher adapter and parity-gated pitcher cutover are READY FOR BUILD.

The user also resolved `mlb_team_offense`: three 2026 FanGraphs team batting reports using `stats=bat`, `team=0,ts`, `qual=0`, `type=c,35,34,61`, with `month=3` for L30, `13` versus LHP, and `14` versus RHP. Join by `TeamNameAbb` and map `K%`, `BB%`, and `wRC+` as defined in v6. This scope is baseball offense for pitcher matchups and creates no football-opponent requirement.

D-0002 is partially resolved for `nfl_running_backs`: the user confirmed Fantasy Points Data Basic Rushing as the provenance, FREE/no-sign-in viewing, and the 2026 report selection, and the visible report contains the direct-field candidates listed in v5. A production adapter remains BLOCKED until AC-RD2 confirms a permitted server-readable path, AC-RD6 resolves the RB population/filter, and the source/formulas for age, composite scores, and Total TD are recorded. D-0002 also remains BLOCKING for `mlb_hitters`, `mlb_hitter_rank_pool`, and `nfl_defense_by_position`, and therefore for AC-8/AC-9 as whole-site criteria. Preserve existing sources for every unresolved or partially resolved dataset.

For each unresolved or partially resolved dataset, record:

1. Where the user currently downloads or obtains the raw data (provider/site/report name and whether access is free or paid).
2. Whether the Google Sheet merely renames/combines columns or also contains formulas/manual adjustments; provide the calculation rules for every derived field, especially `EV90`, `SqUpSw%`, `Stuff+`, `$ Value`, `Z-O`, `Team R/G`, `Rush Gain Profile`, `Rush Score`, `Age Adjusted Rush Score`, `Rec Score`, `Opportunity Score`, `Weighted Opp.`, and `ADJUSTMENT`.
3. Whether the user authorizes server-side automated access to each provider and whether its terms permit this use.
4. The desired refresh trigger for v1: recommended default is the private HQ `Refresh all` button while the user is online.

Recommended decision: preserve the current trusted providers and formulas first, automate their retrieval/transformation through adapters, and evaluate alternative providers only where automated access is unavailable or prohibited. Do not substitute approximately similar statistics without explicit user approval. For `mlb_pitchers` and `mlb_team_offense`, implementation must follow the v2/v6 mappings. For `nfl_running_backs`, use the Fantasy Points report for bounded discovery but do not equate UI export availability with production automation support.

### D-0003 — decided: daily while each sport is in season

Decision owner: User. Decided 2026-09-13: do not provide live updates; refresh each sport's data once daily while that sport is in season. Use hosted scheduling so no home PC needs to stay on. For v3, schedule only `mlb_pitchers` through Vercel Cron, authenticated with `CRON_SECRET`, guarded by explicit inclusive MLB season dates in UTC, and routed through the shared pitcher refresh service. Use `10:00 UTC` as the reversible v1 run time (6:00 AM Eastern during MLB daylight time).

Future approved MLB datasets should join the MLB daily run only after their D-0002 source mappings pass parity. Future approved football datasets should follow the same pattern with an independent football in-season guard. A request for a different cadence or run time is a routine configuration revision unless it changes cost or provider constraints.

## Architect handoff

The current spreadsheets are not just file hosting; their outputs appear to combine provider data, formula-derived fields, and possibly manual adjustments. Replacing Google Sheets safely therefore requires two layers: a source-neutral ingestion foundation and confirmed provider/formula adapters. Jumping directly to a sports API would risk silently changing the product's statistics.

Coder may proceed with the catalog, snapshot/storage interface, validation pipeline, same-origin APIs, authenticated HQ status/refresh shell, representative fixtures, the FanGraphs `mlb_pitchers` adapter defined in version 2, daily in-season MLB scheduling defined in version 3, and the FanGraphs `mlb_team_offense` adapter defined in version 6. For `nfl_running_backs`, proceed only with the v5 discovery interface, header/field inventory, season-aware validation fixtures, and parity tooling after a permitted source artifact/request is available. Keep RB production activation and scheduling disabled. Do not infer sources or transformations for `mlb_hitters`, `mlb_hitter_rank_pool`, or `nfl_defense_by_position`.

Exact parity handoff: Coder keeps ownership of production adapter code and must expose or preserve a pure path that transforms already captured season/L30 payloads without refetching. Coder must not alter documented mapping or formatting merely to make the comparison pass. Tester owns the independent legacy-rule reference, same-capture runner, machine-readable v4 parity report, and QA disposition. The reference may import shared types and the 21-field name list only; it must not import production join, mapping, normalization, or formatting helpers. In one run, Tester captures each FanGraphs response once, records immutable-input hashes, sends the same parsed pair to both transforms, and verifies the exact AC-P6 pass condition. Retain the existing stale-sheet JSON unchanged as migration context and write separate same-capture evidence. On zero differences, mark AC-P6 PASS and hand AC-P8 cutover to Coder; on any difference from a valid pair, open a blocking field/rule-specific issue and return it to Coder; on invalid capture/schema prerequisites, record NOT RUN and recapture rather than diagnosing the adapter from bad evidence.

Cut `/baseball/pitchers` over for pitcher rows only after Tester confirms v4 AC-P6 parity. Treat the team-offense request as an independent cutover governed by v6 AC-T1 through AC-T7.

Scheduling handoff: add a once-daily `10:00 UTC` Vercel Cron route secured by `CRON_SECRET`; check the inclusive server-side MLB season guard before provider/storage work; return and record an explicit `outside_mlb_season` skip; delegate in-season work to the shared `mlb_pitchers` refresh service; verify AC-S1 through AC-S8. Do not schedule unresolved datasets.

RB discovery handoff: Coder/Tester may capture and inventory one permitted 2026 CSV/XLSX reference, assess server-readable access, build the complete field matrix, verify only confirmed direct mappings, and return AC-RD1 through AC-RD8 evidence to Manager. Stop before production adapter activation, page cutover, or cron. Escalate the exact access/filter/formula gaps rather than scraping the UI or filling derived values by approximation.

Team-offense handoff: Coder implements the three-request v6 adapter with L30 as master and exact 30-team set equality, mapping only K%/BB%/wRC+ into L30/vL/vR fields. Tester independently verifies request construction, misleading-player-field exclusion, split mapping, units/format, failure retention, and same-capture zero-difference parity under AC-T1 through AC-T6. After PASS, Coder cuts the team feed on `/baseball/pitchers` to the same-origin API and adds it to the one existing daily MLB cron operation; Tester verifies AC-T7 through AC-T9.

Status: PITCHER WORK REMAINS READY UNDER V4. `mlb_team_offense` BUILD/PARITY IS READY UNDER V6. `nfl_running_backs` SOURCE DISCOVERY IS READY UNDER V5; ITS PRODUCTION ADAPTER, CUTOVER, AND SCHEDULE REMAIN BLOCKED on the unresolved portions of D-0002. Three other source adapters and whole-site AC-8/AC-9 remain blocked. Next action: implement/test team offense and continue bounded RB discovery while preserving unresolved production feeds.
