# SS-20261002-football-refresh-week-windows — QA

- Author/role: Tester (sequential pass; not independent-agent review)
- Date/status: 2026-10-02 / PASS
- Inputs: task spec and build handoff
- Revision tested: `eb5cf0b`
- Environment: Windows local Next.js preview, Chromium/Playwright, Node focused tests
- Next owner/action: Manager / release review

## Criterion results

| Criterion | Result | Evidence |
| --- | --- | --- |
| AC-1 | PASS | RB importer reported 90 RBs and 247 player-games; non-regression checks passed and prior YAC remained until manual import. |
| AC-2 | PASS | Receiver importer captured 255 FPDS rows, 148 SumerSports WR rows, and 111 TE rows; output contains 162 WR and 93 TE. |
| AC-3 | PASS | Manual importer reported 90 unique RB YAC rows through Week 4 and rewrote profile/latest-week scoring inputs. |
| AC-4 | PASS | Uploaded QB/RB/WR/TE tables match the active 32-team values; snapshot records the Week 4 user verification. |
| AC-5 | PASS | Browser shows one Through/Since mode control and one week dropdown; no per-week button row. |
| AC-6 | PASS | Browser shows Through options Weeks 2–4 and Since options Weeks 3–4. “Since Week 3” reports through Week 4 and produces period rows (example: Quinshon Judkins has two period games). |
| AC-7 | PASS | 37/37 focused tests pass; `npm run build` passes all 18 routes; focused ESLint has zero errors and one pre-existing `<img>` performance warning. |

## Commands and observed results

- `node --test --experimental-transform-types tests/data-foundation.test.ts tests/rb-scores.test.ts tests/rb-weekly.test.mjs tests/rb-yac.test.ts tests/receiver-scores.test.ts` — 37 passed, 0 failed.
- `npm run build` — passed TypeScript, static generation, and route build.
- Focused ESLint — 0 errors; existing `@next/next/no-img-element` warning only.
- Playwright local walkthrough — Through/Since controls render; Since Week 3 through Week 4 status and derived rows render.

No blocking or nonblocking defects recorded.

## Round 2 — mobile scope revision

- Revision: `2381359`
- **AC-8 PASS:** At a 390×844 viewport, RB and receiver pages each report `clientWidth=390` and `scrollWidth=390`; no horizontal page overflow exists. Desktop tables are hidden at this width, mobile player cards render for the full filtered populations, and each sheet exposes a mobile sort selector. Compact profile score and metric grids render in two columns where appropriate.
- Regression checks: production build passes; 11 focused RB/receiver scoring tests pass; focused ESLint has zero errors and the same two existing team-logo `<img>` warnings.

No issues opened. Round 1 release recommendation remains valid for revision `2381359` plus the documentation-only follow-up.

## Round 3 — one-screen profile retest

- Revision: `95315bd`
- **AC-9 PASS:** At 390×844, the complete RB mobile profile measures 358×657 px and the receiver profile measures 358×478 px. Visual captures confirm identity, PPR FP/G, every composite score, and all component groups are present and readable. Both pages retain `scrollWidth=390`.
- Export behavior: the existing profile export container now contains the visible compact summary on phones and the detailed card at larger breakpoints.
- Regression checks: production build passes; 9 focused scoring/YAC tests pass. Focused ESLint has zero errors and four `<img>` optimization warnings because both responsive profile variants render team-logo elements; no behavioral issue observed.

No blocker or nonblocking defect opened.
