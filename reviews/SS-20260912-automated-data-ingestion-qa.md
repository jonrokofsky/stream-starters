# SS-20260912-automated-data-ingestion: QA report

- Author / date / status: Tester / 2026-09-12 / FOUNDATION FAIL — TWO BLOCKING REFRESH-FAILURE DEFECTS
- Spec / build inputs: `specs/SS-20260912-automated-data-ingestion.md` v1; `reviews/SS-20260912-automated-data-ingestion-build.md`; actual uncommitted implementation based on `f6cb3b8e65dcac23bb1d92ce4585fb87e4305a7a`
- Application location / revision under review: `C:/Users/jonro/stream-starters`; uncommitted manifest in the build handoff, independently inspected and tested
- Output path / next owner / requested action: this report / Coder / fix I-001 and I-002, add focused regression checks, then return the updated manifest for retest
- Open issue / decision IDs: I-001 BLOCKING; I-002 BLOCKING; D-001 provider provenance blocks AC-8 and AC-9; D-002 deferred

## Verdict

The typed catalog, canonical validation, deterministic snapshots, test-double activation, protected route design, and production build are sound. The foundation is not ready for Manager review because two database failure paths can either bypass the promised safe per-dataset result or permanently prevent future refreshes. Provider adapter parity and public cutover remain untestable until D-001 is resolved; that is a product dependency rather than an implementation defect.

## Acceptance-criterion coverage

| AC | Result | Evidence and limitation |
| --- | --- | --- |
| AC-1 | PASS | `DATASET_CATALOG` is one typed record containing exactly all six `DatasetKey` values, with schema version, identity, minimum rows, required fields, numeric fields, and adapter selection. `npx tsc --noEmit`, focused ESLint, and `npm run build` all exited 0. |
| AC-2 | PASS | `npm run test:data` passed representative canonical fixtures for all six datasets through normalization, validation, staging, and activation. Numeric separators and percentages are exercised. There is no CSV adapter in this foundation, so quoted-CSV coverage is not applicable yet. Snapshot assertions cover active row count and normalized numbers; metadata construction was also inspected in `refresh.ts`. |
| AC-3 | PASS | Automated negative checks reject missing columns, blank and duplicate identities, nonnumeric calculated fields, and undersized inputs. Independent mocked-fetch checks confirmed a 503 becomes a dataset-specific message without echoing a token-bearing URL and an actual body over 5 MiB is rejected. Declared-size and timeout branches were inspected. See the resource-bound observation below. |
| AC-4 | PASS | The repository-supported `MemorySnapshotStore` integration test activates only after a complete snapshot is staged, and the active read returns that complete snapshot. The SQL RPC derives the dataset key from the already-inserted candidate and updates the single active pointer atomically. A live non-production Supabase migration was not available, so database-engine behavior was assessed by code inspection rather than execution. |
| AC-5 | PASS | The focused test proves an identical checksum reports `unchanged` and an invalid replacement preserves the first active snapshot. The refresh implementation does not activate on fetch, transform, validation, or staging failure. |
| AC-6 | FAIL | Anonymous rejection, HQ-cookie verification, same-origin rejection, dataset selection, and overlap handling are present by inspection; the memory integration test proves same-dataset overlap is rejected. I-001 and I-002 mean storage failures can bypass the safe route result or leave a permanent overlap lock. Authenticated route execution against a migrated non-production database was NOT RUN. |
| AC-7 | NOT RUN | Source inspection confirms six cards, all/per-dataset native buttons, accessible names, disabled and `aria-busy` state, polite status output, visible focus, and a one-column layout at 580 px. An authenticated desktop, keyboard, and narrow-screen browser walkthrough was not run because the migration is not applied to a non-production backend. |
| AC-8 | NOT RUN | Correctly blocked by D-001. Real adapters, frozen-reference parity, page cutover, and six consumer smoke checks do not exist yet. |
| AC-9 | NOT RUN | Correctly blocked by D-001. Repository search confirms runtime Google Sheet URLs remain in all current consumers, as the spec explicitly permits during the foundation stage. |
| AC-10 | PASS | The invalid-replacement test preserves last-known-good data. Independent failure checks show provider URLs/tokens are not reflected. New API routes return controlled messages, catch read/status failures, and add no secret logging. The refresh-start exception in I-001 still needs correction for the required useful error behavior, but no secret value is exposed by the inspected implementation. |
| AC-11 | PASS | `DATA_INGESTION.md` lists `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `HQ_PASSWORD`, and `HQ_SESSION_SECRET`, their purposes, local/production placement, migration sequence, and contains no values. `npm run build` passed on the final working tree. |

## Checks run

| Check | Actual result |
| --- | --- |
| `npm run test:data` | PASS: 4 tests, 4 passed, 0 failed. Node emitted experimental TypeScript-transform and module-type performance warnings only. |
| `npx tsc --noEmit` | PASS, no diagnostics. |
| Focused ESLint over `lib/data`, the new data/HQ routes, HQ data component/page, and foundation test | PASS, no diagnostics. |
| `npm run build` | PASS with Next.js 16.3.1; compilation, type checking, static generation, and finalization succeeded, and all three new route families were emitted as dynamic. |
| Mocked provider 503 containing a token-bearing request URL | PASS: rejected with the controlled dataset/status message and did not include the token. |
| Mocked response body of `MAX_UPSTREAM_BYTES + 1` | PASS: rejected with `UPSTREAM_TOO_LARGE`. |
| Repository secret/log search and `git diff --check` | PASS for the new foundation: only environment variable names are documented, no values or new console logging were found, and diff check found no whitespace errors. Runtime Google URLs remain only because AC-9 is blocked. |

## Issues

### I-001 — BLOCKING: refresh-lock acquisition errors escape the safe result contract

- Impact: If the migration is missing, Supabase is unavailable, or insertion of the refresh-run row fails for any reason other than the unique lock, `refreshDataset` rejects instead of returning a dataset-specific failed `RefreshResult`. `Promise.all` in the refresh route then rejects the whole request. The user receives a framework-level 500 rather than the required per-dataset result and useful next action; one failure can also discard otherwise independent `Refresh all` results.
- Expected: Every fetch, transform, validation, storage, or activation failure produces a sanitized per-dataset failed result, and `Refresh all` reports each dataset independently.
- Actual / reproduction: `await store.tryAcquireRefresh(key)` executes before the function's `try` block in `lib/data/refresh.ts`. A store double whose `tryAcquireRefresh` throws therefore rejects `refreshDataset`; the route has no surrounding catch for `Promise.all`.
- Closure condition: Catch acquisition/storage errors within the per-dataset operation, return a sanitized failed result without calling completion for a lock that was never acquired, and add a regression test covering one acquisition failure during `Refresh all` without losing the other dataset results.

### I-002 — BLOCKING: a completion-write failure can leave a permanent refresh lock

- Impact: The database lock is represented by a `dataset_refresh_runs` row whose status remains `refreshing`. If `finishRefresh` fails after any outcome, that row remains covered by the unique partial index. Every future refresh for that dataset is then reported as already running until someone manually repairs the database. HQ status also continues to show `refreshing` indefinitely.
- Expected: A transient failure while recording completion must not permanently prevent later refreshes. Locks need a lease/expiry or a recovery path that safely identifies and closes stale runs.
- Actual / reproduction: `SupabaseSnapshotStore.tryAcquireRefresh` inserts a `refreshing` row; `finishRefresh` is the only path that changes it. When its update fails, `refreshDataset` converts the result to failed but has no second release mechanism. The partial unique index has no time bound, and acquisition never recovers stale rows.
- Closure condition: Implement an atomic lease or explicit stale-run recovery with a safe threshold, preserve live-run overlap protection, and add an integration-level test showing a simulated completion failure does not block the next refresh indefinitely.

## Security and resilience observation

`fetchBoundedText` rejects oversized content, but for a response without a trustworthy `Content-Length` it calls `response.arrayBuffer()` before checking the byte count. That can allocate an arbitrarily large upstream body before the 5 MiB rejection. This does not change AC-3's observed reject result, but it weakens the stated response-size bound. Before connecting untrusted providers, stream the body with an incremental byte limit and cancel once the threshold is exceeded.

## Retest request

Coder should address I-001 and I-002 without changing provider scope, add focused failure tests, and identify the updated uncommitted manifest or commit. Tester will rerun affected AC-6 failure and overlap checks plus the full foundation suite and production build. AC-7 still needs an authenticated browser walkthrough against a migrated non-production backend; AC-8 and AC-9 remain provider-blocked.

## Retest round 1 — foundation revision 2

- Date / revision: 2026-09-12 / base `f6cb3b8e65dcac23bb1d92ce4585fb87e4305a7a` plus the updated uncommitted manifest identified in the Coder handoff
- Inputs: Coder responses under `Round 1 — I-001`, `Round 1 — I-002`, and `Revision 2 checks` in `reviews/SS-20260912-automated-data-ingestion-build.md`
- Result: FOUNDATION RETEST PASS for the implemented source-neutral scope; I-001 and I-002 CLOSED

### I-001 retest — CLOSED

`refreshDataset` now places lock acquisition inside its own catch boundary. An acquisition exception returns a sanitized failed `RefreshResult`, records storage as the failure stage, and does not attempt completion without an acquired lock. The new two-dataset regression proves one acquisition failure does not reject `Promise.all`, does not disclose the private exception text, and does not prevent the other dataset from returning `ready`. Independent execution passed.

AC-6 is updated from FAIL to PASS for the implemented foundation behavior. Anonymous/HQ-session/same-origin guards remain correct by inspection, live overlap rejection still passes, and acquisition failure is now isolated per dataset. A full authenticated browser-to-Supabase route walkthrough remains part of the separate AC-7 environment check.

### I-002 retest — CLOSED

The database acquisition RPC now atomically expires a `refreshing` row after the five-minute lease before attempting a unique-index-protected insert. A live lease still returns the existing overlap result. Status independently identifies an expired run as failed with a retry action. The memory store mirrors the same lease boundary. The new regression makes the first completion write fail, advances beyond the lease, and proves the next attempt acquires the dataset and returns `unchanged` while preserving the active snapshot. Independent execution passed.

The SQL recovery path was inspected but not executed against PostgreSQL because no migrated non-production Supabase project was available. The transaction structure, partial unique index, and caught unique violation provide the intended single-winner behavior; database-engine confirmation remains an environment-limited integration check rather than an open code defect.

### Independent revision 2 checks

| Check | Actual result |
| --- | --- |
| `npm run test:data` | PASS: 6 tests, 6 passed, 0 failed, including both issue regressions. Experimental TypeScript-transform and module-type performance warnings only. |
| `npx tsc --noEmit` | PASS, no diagnostics. |
| Focused ESLint over the data foundation, routes, HQ component/page, and tests | PASS, no diagnostics. |
| `npm run build` | PASS: Next.js 16.3.1 compiled, type checked, generated all pages, and finalized successfully. |
| `git diff --check` | PASS: no whitespace errors; line-ending notices only. |

### Remaining limitations

No implementation blocker remains in the source-neutral foundation. AC-7 is still NOT RUN as a browser walkthrough against a migrated non-production backend. AC-8 and AC-9 remain NOT RUN and correctly blocked by D-0002 provider provenance and formula decisions. The earlier streaming-size observation remains a pre-provider hardening recommendation and is not reopened as a foundation blocker.

## Review round 2 — revision 3 FanGraphs pitcher adapter

- Date / revision: 2026-09-13 / base `f6cb3b8e65dcac23bb1d92ce4585fb87e4305a7a` plus Coder revision 3 in the current uncommitted manifest
- Result: FAIL FOR PITCHER CUTOVER — I-003 BLOCKING; adapter mechanics otherwise pass

| Criterion | Result | Independent evidence |
| --- | --- | --- |
| AC-P1 | PASS | URL construction contains the recorded 2026 starter/custom-column parameters. Captured season and L30 requests are identical after removing `month`, with values `33` and `3`; the default catalog adapter is FanGraphs only for `mlb_pitchers`. |
| AC-P2 | PASS | Fixture output retains season membership and order, excludes an L30-only player, and retains a season-only player with null L30 fields. Live evidence also followed the season master: 251 season rows and 154 L30 rows. |
| AC-P3 | PASS | Code and fixtures verify `PlayerName`, `TeamNameAbb`, `Throws` to RHP/LHP, every listed direct metric, `sp_stuff`, and L30 prefixes. The downstream generic team normalization defect is recorded separately as I-003. |
| AC-P4 | PASS | `Strike%` is computed numerically as `Strikes / Pitches` for each period. Zero, missing, and non-finite inputs become null; the code applies the same finite check to both numerator and denominator. |
| AC-P5 | PASS | L30 lookup trims surrounding whitespace and otherwise uses exact map keys; case, punctuation, and accents are preserved. Duplicate trimmed season identities fail canonical validation. |
| AC-P6 | FAIL | No frozen PitcherAll export was supplied, so exact frozen parity remains unavailable. A live comparison found all 247 sheet identities in the current 251-row FanGraphs season result, plus four new FanGraphs rows (`Andrew Sears`, `Brady Basso`, `Braydon Fisher`, `Cesar Perdomo`), consistent with rolling-source drift. It also exposed I-003: rows where both sources agree on `2 Tms` are changed downstream to `2 TMS`. |
| AC-P7 | PASS | A complete 150-row fixture refresh stages and activates with FanGraphs metadata and checksum. A period-specific 503 produces a sanitized L30 failure and preserves the seeded active snapshot. Stream-over-limit testing confirms immediate reader cancellation after crossing 5 MiB. |
| AC-P8 | NOT RUN | Public pitcher cutover is intentionally absent and remains gated by AC-P6/I-003. The team-offense request remains unchanged. |

### Live bounded-source evidence

Read-only requests to the exact configured FanGraphs endpoint succeeded within the command timeout: 251 season rows and 154 L30 rows, with the requested source fields present. The current published pitcher CSV contained 247 rows. Identity comparison showed 247 common, zero sheet-only, and four FanGraphs-only players. Team/hand differences involving recently added or transferred players are rolling-data drift and are not attributed to the adapter. Fifteen common players had `2 Tms` in both live inputs, which isolates I-003 from drift.

### I-003 — BLOCKING: canonical normalization corrupts the FanGraphs multi-team label

- Impact: Before snapshot validation, `normalizeCanonicalRows` uppercases every `Team` value. FanGraphs and the current reference both use the display label `2 Tms` for multi-team season rows, so canonical output becomes `2 TMS`. This violates exact team-field parity in AC-P6 and changes the public display if pitchers are cut over.
- Expected: Known team abbreviations are normalized consistently while the provider's non-abbreviation multi-team display label remains `2 Tms`, matching the reference.
- Actual / reproduction: At least 15 common live players, including Freddy Peralta, Jameson Taillon, Robbie Ray, and David Peterson, are `2 Tms` in both current sources. Passing that value through the shared `Team` normalization yields `2 TMS` because the fallback is `text.toUpperCase()`.
- Severity: BLOCKING for pitcher parity and AC-P8 cutover; it does not block fixture-based ingestion or scheduling infrastructure.
- Closure condition: Preserve or explicitly map the multi-team label to the agreed canonical display, add an end-to-end adapter-through-normalizer regression for `2 Tms`, and rerun parity. Do not weaken ordinary abbreviation normalization.

## Review round 3 — revision 4 daily in-season pitcher schedule

- Date / revision: 2026-09-13 / current uncommitted revision 4
- Result: PASS for scheduled-refresh implementation; deployment evidence remains outside this review

| Criterion | Result | Independent evidence |
| --- | --- | --- |
| AC-S1 | PASS | `vercel.json` contains exactly one cron entry, `/api/cron/mlb-pitchers` at `0 10 * * *`. Operations documentation states 10:00 UTC, 6:00 AM Eastern during daylight time, 5:00 AM during standard time, and calls it a reversible/default annual configuration. |
| AC-S2 | PASS | The route delegates through `handleScheduledPitcherRequest`, which calls injected `refreshDataset("mlb_pitchers", store)`. It contains no provider, transform, validation, staging, or activation implementation. HQ continues to call the same `refreshDataset` operation. |
| AC-S3 | PASS | Missing server secret and missing, malformed, Basic, and incorrect bearer values all return 401 before clock/store/refresh/evidence work. Tests assert zero store/refresh calls and no secret in response. The route logs only post-auth sanitized evidence. |
| AC-S4 | PASS | Constants are exactly `2026-03-25` through `2026-10-31`. Tests pass at 00:00:00.000Z on the start, midseason, and 23:59:59.999Z on the end, proving inclusive UTC date behavior. |
| AC-S5 | PASS | Tests at 2026-03-24T23:59:59.999Z and 2026-11-01T00:00:00.000Z return the explicit skip result before store construction or refresh delegation. With no store/provider path, snapshots, activation, active data, and last-success metadata cannot change. |
| AC-S6 | PASS | In-season invocation delegates only pitchers and returns the shared state. Existing shared-service tests cover ready, unchanged, failed last-good preservation, live overlap rejection, and stale-lock recovery; the cron path uses that service rather than an alternate pipeline. |
| AC-S7 | PASS | HQ says pitcher data “refreshes daily during the MLB season” and offers manual refresh. Operations documentation explicitly says it is not live or continuous. Search found no new public/HQ claim of live pitcher data. |
| AC-S8 | PASS | Only the pitcher endpoint appears in the sole cron entry. The scheduler accepts the shared store/refresh boundary and owns MLB dates locally; no football dataset or MLB guard reuse for football was added. |

### Independent revision 3/4 checks

| Check | Actual result |
| --- | --- |
| `npm run test:data` | PASS: 17 tests, 17 passed, 0 failed. |
| `npx tsc --noEmit` | PASS, no diagnostics. |
| Focused ESLint over data code, data/HQ/cron routes, HQ data UI/page, and tests | PASS, no diagnostics. |
| `npm run build` | PASS: Next.js 16.3.1 compiled, type checked, generated pages, and emitted `/api/cron/mlb-pitchers` as dynamic. |
| `git diff --check` | PASS with line-ending notices only. |

The Supabase migration and Vercel cron were not applied or deployed. Production `CRON_SECRET`, a real cron invocation, database-engine integration, and browser behavior therefore remain NOT RUN as external-environment checks. These limitations do not conceal a code failure. I-003 is the only new implementation blocker and applies to pitcher parity/cutover, not the daily scheduler.

## Retest round 4 — revision 5 I-003

- Date / revision: 2026-09-13 / current uncommitted revision 5
- Inputs: Coder revision 5 response in `reviews/SS-20260912-automated-data-ingestion-build.md`; updated `lib/data/validation.ts`; adapter-through-normalizer regression
- Result: I-003 CLOSED; AC-P6 remains NOT RUN pending a frozen reference export and full metric parity report

### I-003 retest — CLOSED

The new MLB-specific normalizer recognizes a numeric multi-team label case-insensitively and emits the stable `<count> Tms` form before the generic uppercase abbreviation fallback. Normal MLB abbreviations and existing aliases still use uppercase normalization. The focused regression passes FanGraphs rows through both the adapter and canonical normalizer and proves ` 2 Tms ` becomes `2 Tms` while `bos` becomes `BOS`.

Independent bounded live execution returned 251 canonical rows. Nineteen current multi-team rows retained `2 Tms`, and zero rows contained the incorrect `2 TMS`. This directly reproduces and closes I-003 without applying the migration or writing to Supabase.

### AC-P6 disposition

AC-P6 changes from FAIL due to I-003 to NOT RUN. The known mapping defect is fixed, but the criterion explicitly requires a retained automated parity report against a frozen PitcherAll export covering every identity, team, hand, direct metric, and derived metric with documented display rounding. The repository still has no frozen reference fixture. A live sheet comparison cannot substitute for that artifact because FanGraphs is rolling: the prior review already observed 251 current provider rows versus 247 sheet rows and isolated source drift. AC-P6 therefore cannot be marked PASS yet, and AC-P8 cutover remains gated on completing that parity run.

### Independent revision 5 checks

| Check | Actual result |
| --- | --- |
| `npm run test:data` | PASS: 18 tests, 18 passed, 0 failed, including the I-003 adapter-through-normalizer regression. |
| Bounded live adapter-through-normalizer run | PASS: 251 rows; 19 `2 Tms`; 0 `2 TMS`. |
| `npx tsc --noEmit` | PASS, no diagnostics. |
| Focused ESLint over `lib/data` and the foundation test | PASS, no diagnostics. |
| `npm run build` | PASS: compilation, type checking, page generation, and finalization completed. |
| `git diff --check` | PASS with line-ending notices only. |

No open implementation issue remains from revision 5. The remaining pitcher-cutover gate is missing parity evidence, not a demonstrated mapping defect.

## Retest round 5 — retained AC-P6 parity capture

- Date / capture: 2026-09-13 / one bounded run fetching the public PitcherAll CSV, FanGraphs season `month=33`, and FanGraphs L30 `month=3`
- Machine-readable evidence: `reviews/SS-20260912-automated-data-ingestion-pitcher-parity.json`
- Result: AC-P6 FAILS STRICT PARITY because the published sheet and live source represent different update times; no new transformation defect identified

The retained summary contains UTC start/completion timestamps, byte counts and SHA-256 content hashes for all three responses, row counts, full common/sheet-only/generated-only identity sets, formatting rules, per-field match/mismatch/blank counts, and bounded representative differences. It contains no complete provider payload, credentials, or secret URLs.

The published CSV has 22 headers because it includes one unnamed spacer column. The canonical contract intentionally excludes that presentation artifact and contains 21 fields: three identity fields plus nine season and nine L30 metrics. All 21 canonical fields were compared.

### Capture result

| Measure | Result |
| --- | ---: |
| PitcherAll rows | 247 |
| FanGraphs season rows | 251 |
| FanGraphs L30 rows | 154 |
| Common identities | 247 |
| Sheet-only identities | 0 |
| FanGraphs-only identities | 4 |
| Common field comparisons | 5,187 |
| Exact formatted matches | 2,546 |
| Mismatches | 2,641 |
| Matching blank/null values | 801 |

The four live-source-only identities are Andrew Sears, Brady Basso, Braydon Fisher, and Cesar Perdomo. Their absence from the sheet, while every sheet identity exists in the newer source, supports a timing difference rather than player-key loss in the adapter.

### Difference classification

The differences are consistent with rolling source-time drift:

- Counting stats changed for many established pitchers, such as Aaron Nola moving from 155 sheet IP to 161.1 live IP. Rate stats moved with those additional results.
- L30 differences are broad and expected when the rolling window advances; they affect IP and every linked L30 rate rather than one isolated mapping.
- Team differences correspond to newer transfers or updated multi-team aggregation. Hand differences are blank or `#N/A` in the sheet for newer entries while FanGraphs supplies R/L.
- Direct percentages show the sheet's older displayed values while the current provider emits updated underlying rates. Strike% continues to equal current `Strikes / Pitches`; no unit inversion, prefix swap, join spill, case-folded identity, or multi-team-label corruption appears.
- The I-003 correction remains verified: the live adapter-through-normalizer run preserved current `2 Tms` values and generated no `2 TMS` values.

No stable implementation issue is opened from these mismatches because the evidence does not isolate an incorrect transformation. However, AC-P6 requires exact or tolerance-bounded comparison against a frozen reference representing the same source state. A stale sheet cannot meet that condition, so AC-P6 remains FAIL and AC-P8 remains blocked.

### Smallest next action

Refresh the PitcherAll season and L30 source tabs/calculations from FanGraphs, export the resulting PitcherAll CSV immediately, and rerun the retained parity comparison against those same-time inputs. That single coordinated refresh/export is the smallest action that removes rolling-time drift while preserving the sheet as the agreed reference. Any remaining systematic field difference after that run should open a mapping defect; an exact formatted result closes AC-P6 and permits AC-P8 cutover testing.

## Retest round 6 — spec v4 same-capture AC-P6

- Date / revision: 2026-09-13 / production FanGraphs adapter and normalizer in current uncommitted revision 5; Architect spec v4
- Machine-readable evidence: `reviews/SS-20260912-automated-data-ingestion-pitcher-same-capture-parity.json`
- Result: AC-P6 PASS; pitcher-only AC-P8 cutover may proceed to Coder

In one bounded run, Tester captured the configured FanGraphs season (`month=33`) and L30 (`month=3`) responses exactly once and recorded their immutable SHA-256 hashes. An injected fetcher then returned those identical frozen response texts to the production `FanGraphsPitcherAdapter`; its rows passed through the production canonical normalizer. A separately implemented legacy reference consumed the same frozen JSON pair and independently performed exact trimmed-name XLOOKUP behavior, season-master ordering, field mapping, Strike/Pitches guards, MLB team and hand normalization, and legacy display formatting. The reference imported the production catalog only for the required 21-field name list and did not reuse production join, mapping, normalization, or formatting helpers.

| Gate | Result |
| --- | ---: |
| Frozen season response rows | 251 |
| Frozen L30 response rows | 154 |
| Production canonical rows | 251 |
| Independent reference rows | 251 |
| Missing production identities | 0 |
| Extra production identities | 0 |
| Order mismatches | 0 |
| Canonical fields | 21 |
| Field comparisons | 5,271 |
| Value mismatches | 0 |

Every per-field mismatch count in the retained report is zero. The report contains capture timestamps, byte counts, both source hashes, exact row/order/identity totals, the 21 field names, full per-field match and blank totals, and empty mismatch collections. It retains no full provider response, credentials, or secret URL.

This v4 result supersedes the earlier stale-sheet AC-P6 failure as directed by the revised spec. The stale-sheet report remains valid migration context showing why independently timed rolling sources cannot establish transform parity. I-003 remains CLOSED. No pitcher adapter parity blocker remains; AC-P8 is now ready for the separately tested pitcher-only public-page cutover while team offense stays on its current feed.

## Review round 7 — revision 6 AC-P8 pitcher-only page cutover

- Date / revision: 2026-09-13 / current uncommitted revision 6 based on `f6cb3b8e65dcac23bb1d92ce4585fb87e4305a7a`
- Inputs: Coder revision 6 response; AC-P6 same-capture PASS artifact; actual `app/baseball/pitchers/page.tsx` diff
- Result: AC-P8 NOT RUN pending active-snapshot browser success; static/local integration PASS with no implementation issue found

### Source boundary and response handling

- The pitcher page now requests the relative same-origin path `/api/data/mlb_pitchers` with `cache: "no-store"`. The former pitcher Google URL and `gid=371661956` are absent from runtime page code.
- The separate team-offense request remains the original Google CSV feed with `gid=1810390724`. Its CSV parser, sorting, opponent selection, handedness lookup, and matchup calculations remain on the existing path.
- The pitcher response must contain an object with a `data` array. Every row must be an object; all 21 canonical fields are enumerated and validated while converting into the page's established `Record<string, string>` representation. A failed HTTP response, malformed JSON, invalid row, missing text identity, or non-finite numeric field reaches the existing page-level error boundary rather than partially populating the UI.

### Canonical-to-legacy compatibility

The bridge preserves the display contract proven in AC-P6: canonical null becomes an empty string; IP uses one decimal with `.0` removed; ERA, SIERA, and WHIP use two decimals; ratio percentages become two-decimal percentage-point strings; Stuff+ becomes a whole-number string; and Player, Team, and Hand remain text. The existing `numericValue` helper strips percent signs and commas before `Number`, so downstream minimum-IP filters, percentile populations, chart values, season/L30 qualification, and scoring receive the same numeric magnitudes as before. Hand remains `RHP`/`LHP`, team keys remain compatible with themes, and the alphabetical sort plus first-row selection/search initialization are unchanged after parsing.

Loading text is now `Loading Stream Starters data...` and the visible error is `Failed to load Stream Starters data.` Neither suggests that pitcher data still comes from Google Sheets. The combined page error remains truthful because either the Stream Starters pitcher snapshot or retained team source can make the page unavailable.

### Independent checks

| Check | Actual result |
| --- | --- |
| `npm run test:data` | PASS: 18 tests, 18 passed, 0 failed. |
| `npx tsc --noEmit --incremental false` | PASS, no diagnostics. |
| `npx eslint app/baseball/pitchers/page.tsx` | PASS with zero errors; one pre-existing unoptimized-image warning. |
| `npm run build` | PASS: Next.js compiled, type checked, generated all pages, and emitted both `/baseball/pitchers` and `/api/data/[dataset]`. |
| Source-boundary inspection | PASS: same-origin pitcher API present; old pitcher sheet absent; team-offense sheet unchanged. |
| `git diff --check` for the page and build handoff | PASS with a line-ending notice only. |

### Remaining AC-P8 evidence

AC-P8 includes a browser/network smoke check of successful active data, selection, season/L30 display, minimum-IP filtering, opponent calculations, and export behavior. The Supabase migration is unapplied and no active `mlb_pitchers` snapshot exists in an authorized non-production environment, so that success path cannot be exercised without exceeding this review's no-migration/no-deployment boundary. This is missing environment evidence rather than a failed behavior or implementation defect.

Smallest next action: apply the reviewed migration to a non-production Supabase project, seed one parity-approved pitcher snapshot through the shared refresh service, and perform the browser/network smoke checklist. AC-P8 may be marked PASS if that run succeeds; no Coder change is requested from this review.

## Review round 8 — revision 7 FanGraphs team-offense adapter

- Date / revision: 2026-09-13 / current uncommitted revision 7; Architect spec v6
- Machine-readable evidence: `reviews/SS-20260912-automated-data-ingestion-team-offense-same-capture-parity.json`
- Result: AC-T1 through AC-T6 PASS; hand AC-T7 public team cutover and AC-T8 single-cron addition to Coder

| Criterion | Result | Independent evidence |
| --- | --- | --- |
| AC-T1 | PASS | All three URLs contain the recorded 2026 team batting parameters: `stats=bat`, `team=0,ts`, `qual=0`, `type=c,35,34,61`, and the common configuration. Captured URLs differ only by `month=3`, `13`, or `14`; the focused request test passed. |
| AC-T2 | PASS | Production uses trimmed uppercase `TeamNameAbb`, ignores misleading player fields, requires the explicit 30-team set independently in every report, and retains L30 insertion order. Missing, unknown, and duplicate team fixtures reject. The live frozen capture contained exactly 30 rows and the expected team set in each report. |
| AC-T3 | PASS | Distinguishable fixtures and code inspection verify month 3 to L30, month 13 to vL, and month 14 to vR, mapping only `K%`, `BB%`, and `wRC+`. Every successful row has `Team` plus nine finite metrics. |
| AC-T4 | PASS | Percentage numbers remain fractional canonical ratios; percent strings normalize once to the same ratio; wRC+ remains a finite numeric index. Independent display comparison formats percentages to two decimal percentage points and wRC+ to a whole number. All 300 displayed values matched. |
| AC-T5 | PASS | One bounded run captured months 3/13/14 once, hashed each immutable input, then supplied the identical arrays to the production pure transform and an independent reference merge. Both produced the same 30-team set and order. All 300 canonical comparisons and all 300 display comparisons matched; zero missing, extra, order, canonical-value, or display-value differences. |
| AC-T6 | PASS | Shared-pipeline tests seed an active snapshot, fail each split independently, assert split-specific sanitized errors without raw body content, and confirm the active snapshot ID is unchanged. Separate invalid-membership tests repeat last-good preservation for each split. The shared bounded fetch helper enforces timeout, redirects, declared and streamed 5 MiB limits, and cancels oversized streams. |

### Same-capture evidence

| Input | Rows | SHA-256 |
| --- | ---: | --- |
| L30, month 3 | 30 | `8c378f01b038871ca69c9d24df3278987951d37fb1f0bdbc8cd92e8caafcf273` |
| Versus left, month 13 | 30 | `4c10697310660002e44eab8c0c61e2f1397f6440dcd9ad4fe79dd51c9ebff9f2` |
| Versus right, month 14 | 30 | `bdbd3c1a266244fffb918598c49e5f108ad1fb9c515ea45aea32423412e8082b` |

The retained JSON includes capture timestamps, byte counts, hashes, field names, reference-independence statement, full per-field canonical/display totals, and empty difference sets. It stores no provider payload, credential, or secret URL. The independent reference implements its own exact 30-team membership check, L30-master merge, split mapping, percent parsing, and display formatting; it does not import production mapping, join, normalization, or formatting helpers.

### Independent revision 7 checks

| Check | Actual result |
| --- | --- |
| `npm run test:data` | PASS: 25 tests, 25 passed, 0 failed. |
| `npx tsc --noEmit --incremental false` | PASS, no diagnostics. |
| Focused ESLint over the team adapter, catalog, refresh integration, and foundation tests | PASS, no diagnostics. |
| `npm run build` | PASS: compilation, type checking, page generation, and finalization completed. |
| `git diff --check` | PASS with line-ending notices only. |

No blocking or nonblocking implementation issue was found. AC-T7 is now released to Coder for the same-origin team-offense page cutover. AC-T8 is released to Coder to add `mlb_team_offense` to the existing single daily 10:00 UTC MLB cron operation with the existing season guard and per-dataset isolation. No second cron schedule should be created.
