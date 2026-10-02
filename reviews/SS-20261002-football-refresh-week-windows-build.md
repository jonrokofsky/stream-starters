# SS-20261002-football-refresh-week-windows — Build handoff

- Author/role: Coder (sequential pass)
- Date/status: 2026-10-02 / READY FOR QA
- Input: `specs/SS-20261002-football-refresh-week-windows.md`
- Base revision: `3107d4b`
- Revision under review: uncommitted working tree based on `3107d4b`
- Output: refreshed football JSON snapshots and `app/football/rb/page.tsx`
- Next owner/action: Tester / verify AC-1 through AC-7

## Engineering plan and result

- Ran the existing guarded FPDS RB importer, then the FPDS/SumerSports receiver importer.
- Imported the user-provided PFR YAC/Att TSV through the existing manual importer.
- Verified the four uploaded PFR defense tables against the active 32-team values and updated only capture provenance because the values matched.
- Added a Through/Since mode toggle with one week dropdown.
- Since mode subtracts the immediately prior cumulative snapshot from the latest snapshot, recomputes counting rates, shares, efficiency values, PPR FP/G, and the existing population-relative RB scores.

## Import evidence

- FPDS RB: updated, 90 RBs, 247 player-games; weekly archive updated.
- FPDS receiving: 255 rows across three pages.
- SumerSports: 148 WR rows and 111 TE rows.
- Combined receivers: 162 WR and 93 TE.
- Manual YAC: 90 RB rows through Week 4.
- PFR defense: all four supplied tables matched the active 32-team snapshot; capture note updated, PFR remains manual.

## Files

- `app/football/rb/page.tsx`
- `public/data/rb-2026.json`
- `public/data/rb-weekly-2026.json`
- `public/data/rb-yac-2026.json`
- `public/data/receivers-2026.json`
- `public/data/nfl-defense-vs-position-2026.json`

Unrelated `public/1.png` was not touched.

## Mobile revision

User expanded scope before release. RB and receiver profile score/metric grids now use denser phone-width spacing. Both sortable player sheets render compact mobile cards with key scores and stats plus a sort selector/direction button; their full tables remain visible from desktop breakpoints upward. Files added to the implementation set: `app/football/receivers/page.tsx`.

## One-screen profile revision

The phone breakpoint now renders purpose-built summary cards rather than the desktop detail stack. RB includes PPR FP/G, Rush/Receiving/Opportunity scores, all 9 rushing components, all 5 receiving components, and all 7 opportunity components. WR/TE includes PPR FP/G, Efficiency/Opportunity scores, and every metric in both component groups. The same export container selects the visible mobile summary on phones and the detailed profile on larger screens.

## Mobile visual cleanup

Removed the duplicated PPR FP/G tile from RB opportunity components because it is already prominent in the header. Responsive component grids now expand their final tile to fill incomplete rows, eliminating blank gray cells. Outer framing, spacing, label line-height, and the phone Copy Graphic button were tightened for a cleaner scan while preserving all unique metrics and percentile colors.
