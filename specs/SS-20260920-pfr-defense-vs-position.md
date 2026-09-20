# PFR defense vs. position automation

## Goal

Replace the 2025 Google Sheet matchup source with current 2026 Pro Football Reference defense-vs-position data for QB, RB, WR, and TE.

## Behavior

- Capture all 32 teams for all four positions.
- Convert season totals to per-game values using each team's games played.
- Refresh with the existing Monday, Tuesday, and Friday 8 AM Eastern in-season workflow.
- Publish a new snapshot only when all four tables validate.
- Preserve the last valid snapshot and emit a workflow warning when PFR is temporarily unavailable.
- Use raw 2026 percentiles without an offseason adjustment.

## Acceptance

- The position matchup tool and RB matchup tool read the local validated snapshot.
- Both tools clearly identify the data as current 2026 results.
- The production build and data tests pass.
