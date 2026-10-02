# SS-20261002-football-refresh-week-windows

- Author/role: Architect (sequential pass)
- Date/status: 2026-10-02 / READY FOR BUILD
- Inputs: user requests to refresh Fantasy Points and SumerSports, manually supplied PFR YAC/Att TSV and defense screenshots, and requests for consolidated Through Week X / Since Week X controls
- Application: `C:/Users/jonro/stream-starters`
- Base revision: `3107d4b`
- Next owner/action: Coder / refresh validated snapshots and implement the RB weekly stat-window selector

## Outcome

Publish current 2026 Fantasy Points RB and receiver data, current SumerSports WR/TE enrichment, the user-provided Week 4 PFR YAC/Att snapshot, and the verified user-provided PFR defense snapshot. Add a compact RB weekly table control that supports cumulative **Through Week X** and derived **Since Week X** views.

## Boundaries and rules

- Fantasy Points and SumerSports remain the only automated football sources.
- PFR YAC/Att and defense data remain manual user uploads.
- A Since Week view is available only when the immediately preceding cumulative snapshot exists. It subtracts the prior cumulative snapshot from the latest snapshot and recalculates per-game/rate fields and the existing RB scores across the derived population.
- Keep existing sorting, PPR qualification, score formulas, and color rules.
- Preserve unrelated `public/1.png`.

## Acceptance criteria

- **AC-1:** FPDS RB refresh passes non-regression validation and preserves the manual PFR YAC source until the supplied YAC table is imported.
- **AC-2:** FPDS receiving and SumerSports WR/TE refreshes pass population and game-total validation.
- **AC-3:** The supplied YAC table imports 90 unique RBs through Week 4 and updates the RB profile, matchup source, and latest weekly table.
- **AC-4:** The supplied QB/RB/WR/TE defense tables cover 32 teams and are recorded as a verified Week 4 manual snapshot without changing matching values.
- **AC-5:** One compact Through/Since mode control and one week dropdown replace per-week buttons.
- **AC-6:** Through mode selects a cumulative snapshot. Since mode shows the selected week through the latest snapshot and recalculates rates and scores from period deltas.
- **AC-7:** Focused football tests, TypeScript production build, and a browser walkthrough pass before release.
- **AC-8:** At phone width, RB and receiver profiles use compact score/metric grids, their player sheets use readable cards with sort controls, and the page has no horizontal overflow. Desktop tables remain available.

## Review note

Roles were performed sequentially in one session; QA is evidence-based but not an independent-agent review.
