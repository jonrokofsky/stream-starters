# SS-20260914-rb-seasons: Coder handoff

- Author/date: sequential Coder / 2026-09-14
- Input: specs/SS-20260914-rb-seasons.md v1; revision 329f560
- Plan: isolate each season using a keyed profile component, cancel the legacy fetch on unmount, add pressed-state year controls and an explicit pending 2026 view. Keep statistical season distinct from age-adjustment year. Preserve 2025 formulas and feed. Validate types and lint; do not publish an incomplete 2026 data integration.
- Next owner: sequential Tester; Manager for unresolved D-0002 formulas/source.

## 2026-09-14 scoring checkpoint
- Added lib/data/rbScores.ts with all five user-supplied formulas, explicit statistical season and age column, complete-population percentiles, and missing values represented as null.
- Verified module output against the existing 97-row CSV: all five outputs match 97/97, treating blank/error sheet outputs as missing. This includes Nate Carter's unavailable age-adjusted score.
- Three scoring tests pass (age factors/cap, weighted opportunity/ties, dash vs missing semantics). TypeScript and focused lint passed before adding tests; page retains one existing image warning.
- Formula module is prepared for ingestion; not wired over the existing 2025 scores. No 2026 feed connected or deployment performed.
- User confirms permission/licensed access, then clarifies website access only. Need a supported retrieval method; no API credentials or export integration supplied. Do not reinterpret website login as an available API.

## 2026-only RB implementation — 2026-09-18
User superseded year toggle: RB profile now loads public/data/rb-2026.json only; removed Google Sheets fetch, CSV parser, season toggle, age display and age-adjusted score selection. Raw Rush Score used. Snapshot has 68 RBs including rookies; age fields stripped. Missing scores display unavailable. Data provenance explicitly Sept 14/manual; no daily refresh claimed.
Checks: TypeScript passed; focused lint zero errors/one existing image warning; 3 scoring tests passed; production build passed with elevated filesystem access after sandbox EPERM. Snapshot verification passed across all 68 rows: identity, season, RB filter, four score recalculations, TD totals, rookie inclusion, absent age fields. Initial verifier mistakenly matched 'Scrimmage' with /age/; corrected to exact age field keys, then passed. Browser unavailable, so browser interaction tests NOT RUN.
User says TNF data is now on Fantasy Points. Direct retrieval still 403 and no browser control tool available this session. Current snapshot is NOT current through TNF; needs fresh table before current-data release. No deployment. Football matchup replacement remains separate and pending.

## Browser importer release — 2026-09-18
User approved scheduled automatic commits to main after automatic review explained that these can publish through Vercel. Added Playwright importer and GitHub Actions workflow (Mon/Tue/Fri at 08 Eastern, DST gated; season Sep1 2026-Jan12 2027; manual dispatch). Workflow keeps prior snapshot on capture/validation failure, commits only changed snapshot. GitHub scheduling may be delayed; production integration and first hosted run still require verification.
Successful real import: 72 RBs / 77 player games, copied September18 10:26 Eastern. Browser verifies 72 rows, current timestamp, no age adjustment, default 5 ATT; search finds Gibbs with 45 ATT. Build and type check passed; focused lint has only existing img warning; scoring tests 3 passed. No provider login used. No claim of hosted-run success until observed.

## 2026-09-19 metric display update
User requested Inside5Carries -> Inside5Carry%, Inside10Rec -> Inside10Rec/Game. RB component configs now use Inside5Carry% percent and compute Inside10Rec./G (missing or zero games yields missing). Both displayed values and percentile pools use the same accessor. Overall Opportunity Score formula remains unchanged, as stated to user. Production build passed. Local preview restarted on3010. Hosted workflow/production verification from prior release remains outstanding.

## 2026-09-19 gain formula change
User removed 30+ then15+ from display AND gain calculation. Remaining1+/3+/5+/10+/20+ original weights rescaled by dividing by .82, retaining0-100 scale. Recalculated snapshot Gain and Rush scores without changing source copiedAt. Four score tests pass, including invariance to removed metrics and full100 maximum; build passes. Local preview rebuilt. Changes remain local pending push; scheduled cloud importer still runs last pushed formula until these changes are pushed.
