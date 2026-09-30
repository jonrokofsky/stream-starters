# QA — Player profile PPR fantasy points per game

- **Result:** Pass
- RB, WR, TE, and Matchup profiles use the existing `FP/G` field.
- Percentiles use qualified players at the same position and retain the established red/white/blue scale: 5+ rushing attempts per game for RBs and 10+ routes run per game for WRs/TEs.
- Below-threshold players keep their raw PPR FP/G but do not receive a percentile color or grade.
- PPR Fantasy PPG is included in the existing RB and receiver sortable sheets.
- The proposed additional player sheet was removed after user clarification.
- `npm run build` passes.
