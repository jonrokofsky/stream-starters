# SS-20260912-automated-data-ingestion: Build handoff

- Author / date / status: Coder / 2026-09-13 / AC-T7 TEAM PAGE CUTOVER AND AC-T8 COMBINED MLB SCHEDULE REVISION 8 READY FOR RETEST; DATABASE APPLICATION AND DEPLOYMENT NOT PERFORMED
- Spec path and version / other inputs: `specs/SS-20260912-automated-data-ingestion.md` v6; `AGENTS.md`; `STREAM_STARTERS_CONSTITUTION.md` v1; `WORKFLOW.md`; `agents/CODER.md`; Tester revision 7 AC-T1 through AC-T6 PASS and same-capture parity artifact; bundled Next.js 16.3.1 route-handler, dynamic-route, and server/client component guides
- Application location / revision or file manifest: `C:/Users/jonro/stream-starters` / base `f6cb3b8e65dcac23bb1d92ce4585fb87e4305a7a` plus uncommitted files listed below; unrelated `public/1.png`, Manager-owned decision/session files, and earlier private-HQ review edits were not touched
- Output paths / next owner / requested action: application code including `app/baseball/pitchers/page.tsx`, the existing MLB cron route/orchestration, `DATA_INGESTION.md`, `tests/data-foundation.test.ts`, and this handoff / Tester / verify AC-T7 through AC-T9 against revision 8 without applying the production migration or deploying
- Open issue and decision IDs: I-001, I-002, and I-003 closed by Tester; D-0002 resolved for `mlb_pitchers` and `mlb_team_offense`, partially resolved for `nfl_running_backs`, and unresolved for three datasets; D-0003 decided, implemented for scheduled pitchers, and gated for team offense pending parity/cutover readiness

## Engineering plan

Add one typed catalog and source-neutral refresh pipeline for the six current datasets. Normalize provider-shaped values once, validate required columns, identities, row thresholds, and finite numbers, calculate a stable checksum, stage an immutable snapshot, then activate it through one database transaction. Keep provider knowledge behind adapters and ship an explicit unconfigured adapter until D-0002 supplies sources and formulas. Put public reads behind one same-origin route, protect status and refresh routes with the existing HQ cookie, require same-origin POSTs, and add accessible controls to the existing HQ. Use a test-double store for fixture and last-known-good checks; leave live pages and production data untouched.

Likely failure points were schema absence, concurrent refreshes, secret leakage, partial activation, and source ambiguity. The migration uses an active-pointer table, a transactional activation function, row-level security, revoked browser access, and a unique running-refresh index. Route errors are intentionally sanitized. A failed/unconfigured adapter does not stage or activate data.

## Implementation

- `lib/data/types.ts`, `catalog.ts`: typed keys, definitions, status/snapshot contracts, schema versions, identity fields, thresholds, required fields, and numeric fields for all six datasets.
- `lib/data/validation.ts`, `checksum.ts`, `adapters.ts`: whitespace/team/percent/number normalization, required-column and row validation, deterministic SHA-256 checksums, bounded upstream helper, fixture adapter, and safe unconfigured adapter.
- `lib/data/storage.ts`, `supabaseSnapshotStore.ts`, `refresh.ts`: storage interface and test double, Supabase implementation, overlap lock, independent refresh results, unchanged detection, failure-stage metadata, staging, and atomic activation with last-known-good preservation.
- `supabase/migrations/202609120001_data_snapshots.sql`: immutable snapshots, active pointers, refresh runs, unique per-dataset running lock, RLS/revocations, and transactional activation function. Created only; not applied.
- `app/api/data/[dataset]/route.ts`: public same-origin snapshot read response with canonical data and metadata; safe 404/503 states.
- `app/api/hq/data/status/route.ts`, `app/api/hq/data/refresh/route.ts`, `lib/data/requestSecurity.ts`: explicit HQ-session checks on both endpoints, same-origin requirement on mutation, all/individual refresh selection, and per-dataset results.
- `app/hq/data-operations.tsx`, `app/hq/page.tsx`, `app/hq/hq.module.css`: status grid, ready/refreshing/unchanged/failed/never-loaded states, metadata, accessible buttons, busy states, live result message, and one-column mobile layout.
- `DATA_INGESTION.md`, `package.json`, `tsconfig.json`, `tests/data-foundation.test.ts`: credential-free setup guidance and focused Node 24 checks.

Current live sports pages still request their existing Google Sheet CSVs by design. Provider adapters, parity work, and page cutover remain blocked by D-0002. No deployment or database migration was performed.

## Uncommitted implementation manifest

`DATA_INGESTION.md`; `app/api/cron/mlb-pitchers/route.ts`; `app/api/data/[dataset]/route.ts`; `app/api/hq/data/status/route.ts`; `app/api/hq/data/refresh/route.ts`; `app/baseball/pitchers/page.tsx`; `app/hq/data-operations.tsx`; `app/hq/page.tsx`; `app/hq/hq.module.css`; `lib/data/adapters.ts`; `lib/data/catalog.ts`; `lib/data/checksum.ts`; `lib/data/errors.ts`; `lib/data/fangraphsPitchers.ts`; `lib/data/fangraphsTeamOffense.ts`; `lib/data/refresh.ts`; `lib/data/requestSecurity.ts`; `lib/data/scheduledPitchers.ts`; `lib/data/storage.ts`; `lib/data/supabaseSnapshotStore.ts`; `lib/data/types.ts`; `package.json`; `tsconfig.json`; `supabase/migrations/202609120001_data_snapshots.sql`; `tests/data-foundation.test.ts`; `vercel.json`; `reviews/SS-20260912-automated-data-ingestion-build.md`.

## Checks actually performed

| Check / command or steps | Environment / revision | Actual result / evidence |
| --- | --- | --- |
| `npm run test:data` | Node 24.19.0; uncommitted manifest above | PASS: 4 tests, 4 passed, 0 failed. Covers all six valid fixtures, normalization/activation, unchanged and invalid last-known-good behavior, five validation failure classes, and same-dataset overlap. Node printed experimental transform-types and module-type performance warnings only. |
| `npx tsc --noEmit` | TypeScript project; uncommitted manifest above | PASS, exit 0, no diagnostics. |
| Focused ESLint over `lib/data`, new API routes, HQ data UI/page, and test | Uncommitted manifest above | PASS, exit 0, no diagnostics after final cleanup. |
| `npm run build` | Next.js 16.3.1 production build; uncommitted manifest before final failure-stage/test-warning-only edits | PASS: compile, TypeScript, page generation, and finalization completed; new data/status/refresh routes listed as dynamic. Final edits are typechecked and focused-linted but the full build was not repeated because they only add typed failure-stage persistence and remove a test lint warning. |
| `npm run lint` | Whole repository; uncommitted manifest before final test-warning cleanup | FAIL: 6 errors and 17 warnings. All 6 errors are in pre-existing `app/baseball/hitters/rankings/page.tsx` and `app/football/rb/matchup/page.tsx`; warnings are existing image warnings plus one test warning that was subsequently fixed and passed focused lint. No new application file has a focused lint finding. |
| Non-production Supabase integration / route auth walkthrough / HQ desktop-mobile visual check | Not run | NOT RUN: no non-production database was supplied and the migration must not be applied to production. Tester should use a non-production Supabase project or inspect the migration/store boundary; browser QA remains required for AC-6/AC-7. |

## Tester reproduction

1. Run `npm run test:data`, `npx tsc --noEmit`, and the focused ESLint command from the checks table.
2. Review the SQL transaction and RLS/revocation behavior without applying it to production.
3. With a disposable Supabase project, apply the migration, use existing HQ auth variables, sign in to `/hq`, and confirm six cards, keyboard controls, narrow layout, anonymous 401s, cross-origin 403, and safe unconfigured-provider failures.
4. Confirm existing public pages remain unchanged; AC-8 and AC-9 are not testable until D-0002 is resolved.

## Issue responses

### Round 1 — I-001

ACCEPT. `refreshDataset` now catches `tryAcquireRefresh` errors inside the per-dataset boundary, returns a sanitized failed `RefreshResult`, and does not call completion when no lock was acquired. The new regression runs two dataset refreshes together with one acquisition failure and proves the other result remains successful and private error detail is not returned. Ready for Tester retest on the current uncommitted manifest.

### Round 1 — I-002

ACCEPT. Refresh locks now use a five-minute lease. The Supabase acquisition RPC atomically marks an expired running row failed before attempting the unique-index-protected insert; live leases still reject overlap. Status renders an expired run as failed with a useful retry message. The memory store mirrors lease behavior, and the regression simulates a completion-write failure, advances beyond the lease, and proves the next refresh completes as `unchanged` rather than remaining blocked. Ready for Tester retest on the current uncommitted manifest.

### Revision 2 checks

- `npm run test:data`: PASS, 6 tests passed and 0 failed, including I-001 and I-002 regressions.
- `npx tsc --noEmit`: PASS, no diagnostics.
- Focused ESLint over the foundation, routes, HQ component/page, and tests: PASS, no diagnostics.
- `npm run build`: PASS on Next.js 16.3.1; all routes compiled and page generation completed.
- `git diff --check`: PASS; line-ending notices only for unrelated or previously modified files.
## Revision 3 — FanGraphs `mlb_pitchers` adapter

### Engineering response

ACCEPT the Architect v2 scope and D-0002 pitcher mapping. `lib/data/fangraphsPitchers.ts` now owns the confirmed public endpoint and complete 2026 custom-leaderboard query. It issues season and L30 requests that differ only by `month=33` and `month=3`. Season order and membership remain authoritative; joins trim surrounding whitespace and otherwise compare exact `PlayerName` values.

The transformer maps identity/team/hand, direct metrics, `sp_stuff`, and `Strikes / Pitches` exactly as specified. Invalid or nonpositive pitch denominators become null. Missing L30 matches retain the season row with null L30 metrics. Ambiguous duplicate L30 names fail safely, while duplicate trimmed season identities are rejected by canonical validation. `defaultAdapterFor` selects FanGraphs only for `mlb_pitchers`; all other provider adapters remain unconfigured.

Snapshot metadata now retains the provider label, complete confirmed non-month query, both month values, both fetch-completion times and source row counts, canonical row count, season year, and the existing canonical checksum. The migration adds `source_details` JSON; it remains unapplied. The public snapshot response includes those sanitized source details.

O-001 is closed in the Coder implementation: `fetchBoundedText` reads response streams incrementally, tracks bytes before retaining each chunk, cancels the reader immediately after the 5 MiB threshold, and still rejects an oversized declared `Content-Length`. Provider failures are wrapped with season/L30 context without exposing URLs or bodies.

### Files changed in revision 3

`lib/data/fangraphsPitchers.ts`; `lib/data/adapters.ts`; `lib/data/catalog.ts`; `lib/data/refresh.ts`; `lib/data/types.ts`; `lib/data/validation.ts`; `lib/data/supabaseSnapshotStore.ts`; `supabase/migrations/202609120001_data_snapshots.sql`; `app/api/data/[dataset]/route.ts`; `tests/data-foundation.test.ts`; `DATA_INGESTION.md`; this build handoff.

### Revision 3 checks

- `npm run test:data`: PASS, 13 tests passed and 0 failed. New coverage verifies the exact query and month-only difference, default selection, season-master membership/order, exact trimmed joins, field mappings, missing L30 nulls, duplicate season identity rejection, zero/missing/non-finite denominators, period-specific sanitized failures with prior-snapshot retention, source row/fetch metadata, checksum, and incremental stream cancellation.
- `npx tsc --noEmit`: PASS, no diagnostics.
- Focused ESLint over the data foundation, routes, HQ component/page, and foundation test: PASS, no diagnostics.
- `npm run build`: PASS on Next.js 16.3.1; compilation, type checking, page generation, and finalization completed.
- `git diff --check`: PASS with line-ending notices only.
- Bounded live FanGraphs adapter read: PASS; current endpoint returned 251 season rows and 154 L30 rows with every requested canonical field present on the mapped sample.
- Bounded live FanGraphs read through `refreshDataset` and `MemorySnapshotStore`: PASS; state `ready`, 251 canonical rows, 64-character checksum. No Supabase write occurred.

### Remaining limitations and Tester request

AC-P6 parity against a frozen current PitcherAll export is not run because no frozen reference fixture is in the repository. AC-P8 public-page cutover remains intentionally not implemented until AC-P1 through AC-P7 and parity are independently accepted. Tester should retest AC-P1 through AC-P5 and AC-P7, inspect O-001 streaming closure, and record AC-P6/AC-P8 as environment/input limited rather than passed. No deployment or database migration was performed.
## Revision 4 — daily in-season pitcher schedule

### Engineering response

ACCEPT D-0003 and Architect spec v3. `vercel.json` schedules one GET request to `/api/cron/mlb-pitchers` at `0 10 * * *`, which is once daily at 10:00 UTC. No other dataset or cron entry is configured.

`lib/data/scheduledPitchers.ts` owns the non-secret 2026 season boundary (`2026-03-25` through `2026-10-31`, inclusive in UTC), Bearer authorization, orchestration, and safe evidence shape. Authentication and season checks execute before store construction. Outside the boundary it returns HTTP 200 with `status: skipped` and `reason: outside_mlb_season`, records only sanitized invocation evidence, and performs no provider, refresh-run, snapshot, activation, or last-success work.

During the configured season, the dedicated route constructs `SupabaseSnapshotStore` and delegates only `mlb_pitchers` to the existing `refreshDataset` function. This preserves the same adapter, validation, checksum, staging, atomic activation, last-known-good, and overlap behavior as the private HQ path. The route does not contain provider or snapshot logic. Missing, malformed, or incorrect `CRON_SECRET` receives HTTP 401 and no work or evidence callback occurs. Safe cron evidence contains invocation time, dataset, in-season decision, completion state, and sanitized failure text when applicable; the secret is never included or logged.

`DATA_INGESTION.md` documents `CRON_SECRET`, the UTC schedule, 6:00 AM Eastern daylight-time and 5:00 AM standard-time equivalents, visible season constants, annual update point, no-live-update policy, and manual HQ fallback. HQ copy now states that pitcher data refreshes daily during MLB season and keeps the manual controls.

### Files changed in revision 4

`vercel.json`; `app/api/cron/mlb-pitchers/route.ts`; `lib/data/scheduledPitchers.ts`; `app/hq/data-operations.tsx`; `DATA_INGESTION.md`; `tests/data-foundation.test.ts`; this build handoff.

### Revision 4 checks

- `npm run test:data`: PASS, 17 tests passed and 0 failed. New scheduling coverage checks missing/malformed/incorrect credentials, missing server secret, zero work on unauthorized calls, exact inclusive start/end and UTC before/after boundaries, explicit outside-season skip before store construction, pitchers-only shared-service delegation, passed store identity, safe evidence, and absence of secret content.
- `npx tsc --noEmit`: PASS, no diagnostics.
- Focused ESLint over the data foundation, data/HQ/cron routes, HQ component/page, and foundation tests: PASS, no diagnostics.
- `npm run build`: PASS on Next.js 16.3.1; `/api/cron/mlb-pitchers` appears as a dynamic route and all application pages generated.
- `git diff --check`: PASS with line-ending notices only.

### Remaining limitations and Tester request

The cron configuration and route are prepared but not deployed, `CRON_SECRET` has not been added to Vercel, and the Supabase migration remains unapplied, per task boundaries. Tester should retest AC-S1 through AC-S8 by code/config inspection and focused tests. A production cron invocation cannot be verified until the user later authorizes deployment and production configuration. Pitcher parity/cutover limitations from revision 3 remain unchanged.
## Revision 5 — I-003 multi-team label parity

### I-003 response

ACCEPT. Shared normalization treated every `Team` fallback as an abbreviation and uppercased FanGraphs/reference display label `2 Tms` to `2 TMS`. `normalizeTeam` now explicitly recognizes MLB multi-team labels matching a number plus `Tms` and emits the stable display form `<count> Tms`. This applies only to MLB datasets. Ordinary abbreviation normalization and the existing alias map remain intact, including `bos` to `BOS`.

The new regression passes a FanGraphs adapter result through `normalizeCanonicalRows` and verifies ` 2 Tms ` becomes `2 Tms` while a normal `bos` team becomes `BOS`. No provider mapping, snapshot behavior, schedule, or public consumer changed.

### Revision 5 checks

- `npm run test:data`: PASS, 18 tests passed and 0 failed, including the adapter-through-normalizer I-003 regression.
- `npx tsc --noEmit`: PASS, no diagnostics.
- Focused ESLint over data code, routes, HQ data UI/page, and tests: PASS, no diagnostics.
- `npm run build`: PASS on Next.js 16.3.1; compilation, type checking, page generation, and finalization completed.
- Bounded live FanGraphs adapter-through-normalizer check: PASS; 251 rows, 19 current `2 Tms` rows preserved, 0 `2 TMS` rows.
- `git diff --check`: PASS with line-ending notices only.

Ready for Tester retest of I-003 and the affected AC-P6 parity comparison. No deployment, migration, or public-page cutover was performed.

## Revision 6 — AC-P8 pitcher-only public-page cutover

### Engineering response

ACCEPT the parity-approved AC-P8 handoff. `app/baseball/pitchers/page.tsx` now requests pitcher rows from the same-origin `/api/data/mlb_pitchers` active-snapshot endpoint. The page continues to request team-offense rows from the existing Google CSV URL with `gid=1810390724`; no team-offense provider or formula was inferred.

The client validates the dataset response shape and converts canonical values into the page's established display strings before they enter existing selection, ranking, scoring, and rendering code. The conversion follows the independently verified legacy rules from spec v4: IP uses one decimal with a trailing `.0` omitted; ERA, SIERA, and WHIP use two decimals; percentage ratios become two-decimal percentage-point strings; Stuff+ uses a whole number; and canonical null becomes the existing blank string. Player sorting, initial selection, search, minimum-IP filters, percentile calculations, team-offense matching, export behavior, and the page-level all-or-error loading boundary remain in their existing paths.

Loading and failure copy now refers to Stream Starters data rather than implying both sources are Google Sheets. A failed pitcher snapshot response, malformed snapshot payload, or failed team feed still produces the existing single page-level error state. No fallback to the stale pitcher CSV was added, so a failed automated source cannot silently serve old sheet rows outside the snapshot system's last-known-good pointer.

### Files changed in revision 6

`app/baseball/pitchers/page.tsx`; this build handoff.

### Revision 6 checks

- Tester prerequisite evidence: AC-P6 PASS in `reviews/SS-20260912-automated-data-ingestion-pitcher-same-capture-parity.json`; 251 production/reference rows, identical identity and order, 5,271 field comparisons, 0 mismatches.
- `npm run test:data`: PASS, 18 tests passed and 0 failed.
- `npx tsc --noEmit --incremental false`: PASS, no diagnostics. The first plain `npx tsc --noEmit` attempt was environment-blocked from writing `tsconfig.tsbuildinfo`; disabling incremental output produced a clean typecheck.
- `npx eslint app/baseball/pitchers/page.tsx`: PASS with 0 errors and one pre-existing `@next/next/no-img-element` warning at the logo image.
- `npm run build`: PASS on Next.js 16.3.1; compilation, TypeScript, all 16 static pages, and finalization completed. `/baseball/pitchers` and `/api/data/[dataset]` are present in the route manifest.
- Source-boundary check: PASS; the former pitcher Google CSV URL and `gid=371661956` are absent from the page, `/api/data/mlb_pitchers` is present, and the separate team feed `gid=1810390724` remains.
- `git diff --check`: PASS with line-ending notices only.

### Remaining limitation and Tester request

The Supabase migration remains unapplied and no production snapshot was seeded in this build session, so a live browser exercise of successful active-snapshot rendering was not possible without violating the no-migration/no-deployment boundary. Tester should exercise AC-P8 against a non-production or configured environment containing an active `mlb_pitchers` snapshot and verify pitcher selection, season/L30 values, minimum-IP filtering, opponent calculations from the retained team feed, export, and safe error display. No deployment or database migration was performed.

## Revision 7 — FanGraphs `mlb_team_offense` adapter

### Engineering response

ACCEPT the Architect v6 scope and the exact three URLs supplied through D-0002. `lib/data/fangraphsTeamOffense.ts` owns one explicit 2026 FanGraphs team-batting query with the complete confirmed parameters plus `pageitems=2000000000`. It issues three requests that differ only by `month`: 3 for L30, 13 versus left-handed pitching, and 14 versus right-handed pitching.

`transformFanGraphsTeamOffense` is an exported pure captured-input path for Tester's independent same-capture comparison. It ignores `PlayerName` and all unrequested fields, normalizes only trimmed `TeamNameAbb` as identity, retains L30 response order, and requires every split to contain the identical explicit set of 30 current MLB team abbreviations. Blank, unknown, duplicate, missing, or extra teams reject the entire candidate.

Only `K%`, `BB%`, and `wRC+` are mapped. Month 3 emits `K% L30`, `BB% L30`, and `wRC+ L30`; month 13 emits the `vL` fields; month 14 emits the `vR` fields. FanGraphs percentage numbers are canonical fractional ratios, such as `0.194`; percent-sign strings in captured fixtures are normalized to the same fraction. wRC+ remains a finite numeric index. This preserves calculations because the existing page parser treats its displayed `19.40%` and `133` values numerically; the future AC-T7 boundary should format percentage ratios to two decimal percentage points and wRC+ to a whole number, matching the current CSV. A read-only current-feed check confirmed 30 rows and the exact 10-field header set, with representative values `19.40%`, `9.90%`, and `133`.

The catalog now reflects the actual v6 10-field contract (`Team` plus nine metrics), requires 30 rows, and selects the FanGraphs adapter by default only for `mlb_team_offense`. All nine metrics are converted and checked for finiteness inside the adapter before shared normalization and validation. Split-specific fetch, JSON/shape, team-set, and metric errors are sanitized and retain the shared pipeline's prior active snapshot. Source metadata records the non-month query, each split's month/fetch time/source row count, the canonical row count, and season year.

The existing public team CSV request remains present in `app/baseball/pitchers/page.tsx`, and the existing cron remains pitcher-only. Those changes are intentionally withheld until Tester passes AC-T1 through AC-T6, including AC-T5 same-capture parity. No football file, contract, source, or season guard changed.

### Files changed in revision 7

`lib/data/fangraphsTeamOffense.ts`; `lib/data/catalog.ts`; `lib/data/refresh.ts`; `tests/data-foundation.test.ts`; this build handoff.

### Revision 7 checks

- `npm run test:data`: PASS, 25 tests passed and 0 failed. Seven team-offense tests cover default adapter selection, exact request construction and month-only difference, L30 order, misleading player fields, split mapping, numeric units, requested-field-only output, missing/unknown/duplicate team failures, non-finite metrics, split-specific upstream failures, invalid-set last-known-good retention for all three splits, successful shared-pipeline activation, metadata, and checksum.
- `npx tsc --noEmit --incremental false`: PASS after adding explicit test-fixture and transformer return annotations; no diagnostics.
- Focused ESLint over the new adapter, catalog, refresh integration, and Coder-owned data tests: PASS, no diagnostics.
- `npm run build`: PASS on Next.js 16.3.1; compilation, TypeScript, all 16 static pages, and finalization completed.
- Bounded live adapter read: PASS; all three confirmed FanGraphs JSON requests returned 30 rows, the adapter emitted 30 rows in L30 order with the exact 10 canonical fields, and the observed normalized team set matched the explicit 2026 MLB set.
- Current public-feed contract check: PASS; 30 rows, exact fields `Team`, three vR, three vL, and three L30 metrics; representative percentage values use two decimal percentage points and wRC+ uses a whole number.
- Scope/source check: PASS; `/baseball/pitchers` still contains the separate Google team feed, the cron code/config contains no `mlb_team_offense`, and no football file changed in revision 7.
- `git diff --check`: PASS with line-ending notices only.

### Tester reproduction and remaining gate

Run `npm run test:data`, `npx tsc --noEmit --incremental false`, the focused ESLint command above, and `npm run build`. For AC-T5, capture the three responses once, record their hashes, feed those identical parsed arrays into `transformFanGraphsTeamOffense`, and compare its normalized output with a separately implemented reference merge across 30-team order and all 300 canonical values. Do not import production join, normalization, or mapping helpers into that reference.

AC-T7 and AC-T8 remain gated on Tester PASS for AC-T1 through AC-T6. No team-offense public cutover, cron addition, production database migration, snapshot activation, or deployment was performed.

## Revision 8 — AC-T7 team cutover and AC-T8 combined MLB schedule

### Engineering response

ACCEPT Tester's revision 7 release. The retained same-capture report and QA show 30 identical teams, 300 canonical comparisons, 300 independently formatted display comparisons, and zero missing, extra, order, value, or display differences across AC-T1 through AC-T6.

`app/baseball/pitchers/page.tsx` now loads team offense from `/api/data/mlb_team_offense` beside the existing `/api/data/mlb_pitchers` request. The Google team URL and the page's now-unused CSV parser were removed. The response boundary requires the exact 10 canonical fields and finite numbers, then formats K%/BB% fractional ratios as two-decimal percentage strings and wRC+ as a whole-number string. The existing alphabetical team selection, handedness keys, percentile populations/directions, matchup score, rendering, export, loading, and page-level error paths consume the same string shapes they used before.

The single existing `0 10 * * *` Vercel schedule and `/api/cron/mlb-pitchers` route remain the only MLB cron entry. Its server orchestration now runs `mlb_pitchers` and `mlb_team_offense` through the same `refreshDataset` service after the existing authorization and inclusive MLB season guard. Each dataset receives its own store boundary and refresh result, so staging/activation and failures remain independent. A thrown exception is converted into a dataset-specific sanitized failure without discarding the other result. All success returns 200, one failure returns 207 with both results, and both failures return 502. Outside season still skips before any store or provider work and now identifies both scheduled dataset keys.

`DATA_INGESTION.md` now records both active FanGraphs adapters, the pitcher page's two Stream Starters snapshot sources, and the single daily MLB run's independent per-dataset behavior. No football file, dataset, decision, schedule, or season guard changed.

### Files changed in revision 8

`app/baseball/pitchers/page.tsx`; `app/api/cron/mlb-pitchers/route.ts`; `lib/data/scheduledPitchers.ts`; `tests/data-foundation.test.ts`; `DATA_INGESTION.md`; this build handoff.

### Revision 8 checks

- Tester prerequisite evidence: AC-T1 through AC-T6 PASS; 30 teams, 300 canonical comparisons, 300 display comparisons, and zero differences in `reviews/SS-20260912-automated-data-ingestion-team-offense-same-capture-parity.json`.
- `npm run test:data`: PASS, 26 tests passed and 0 failed. Updated scheduling coverage proves authorization fail-closed behavior, unchanged inclusive UTC season boundaries, outside-season zero work for both datasets, exact two-dataset shared-service delegation, distinct stores, deterministic result order, and retention of the successful pitcher result when team offense throws with private detail.
- `npx tsc --noEmit --incremental false`: PASS, no diagnostics.
- Focused ESLint over the pitcher page, cron route/orchestration, and Coder-owned tests: PASS with 0 errors and one pre-existing page logo `@next/next/no-img-element` warning.
- `npm run build`: PASS on Next.js 16.3.1; compilation, TypeScript, all 16 static pages, and finalization completed. The one existing cron route and both data routes remain in the build manifest.
- Page source-boundary check: PASS; `/api/data/mlb_pitchers` and `/api/data/mlb_team_offense` are present, while `docs.google`, `output=csv`, `parseCSV`, and `splitCsvLine` have zero matches in `/baseball/pitchers`.
- Schedule check: PASS; `vercel.json` still has exactly one `0 10 * * *` entry and the server schedule contains exactly the two approved MLB dataset keys.
- `git diff --check`: PASS with line-ending notices only.

### Tester reproduction and remaining limitation

Run the revision 8 checks above. With a non-production environment containing active snapshots for both datasets, inspect `/baseball/pitchers` network requests and verify no Google request occurs; select left- and right-handed pitchers and several opponents; compare displayed L30/vL/vR K%, BB%, and wRC+ plus percentile/matchup results to the frozen parity display values. Invoke the schedule with injected mixed results and confirm both results survive independently; confirm the existing outside-season and authorization cases still perform no work.

The production migration remains unapplied and no active production snapshots were seeded, so a successful live browser smoke test could not be completed in this build session without violating the no-migration/no-deployment boundary. No migration, snapshot activation, deployment, or football change was performed.
