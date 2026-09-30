# SS-20260930 — Player profile PPR fantasy points per game

## Goal

Make the existing `FP/G` value prominent on RB, WR, and TE player profiles and include it in their existing sortable sheets.

## Rules

- Display PPR fantasy points per game in RB, WR, TE, and player matchup headers.
- Calculate the color and percentile against the player's own position.
- Require at least 5 rushing attempts per game for RB percentile grades and at least 10 routes run per game for WR/TE percentile grades. Below-threshold players retain their raw PPR FP/G without a percentile color or grade.
- Add a sortable, percentile-colored PPR FP/G column to the existing RB and receiver sheets.
- Continue using the existing `FP/G` field; do not create another sheet.

## Acceptance

- The value, percentile, and positional grade are visible at the top of every implemented player profile card.
- The existing sortable sheets include PPR Fantasy PPG.
- The production build passes.
