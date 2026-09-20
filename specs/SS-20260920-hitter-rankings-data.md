# SS-20260920 — Automated hitter rankings data

## Goal

Replace the published Google Sheet used by Hitter 1v1 Rankings with a validated, daily FanGraphs snapshot.

## Sources

- Fantasy Player Rater: player value, position, team, and plate appearances.
- Major League leader data: plate discipline, contact quality, power, and production.
- Team leader data: runs per game.

## Rules

- Include hitters with at least 50 PA so Top 100–300 ranking pools remain populated.
- Join player data by FanGraphs player ID.
- Publish only when at least 300 eligible hitters join successfully.
- Keep the last valid snapshot when a source is unavailable or incomplete.
- Refresh daily at 10:00 UTC during the 2026 baseball season.

## Acceptance

- The rankings page no longer requests Google Sheets.
- Every existing ranking metric retains its expected display format.
- A production build succeeds and the generated snapshot contains at least 300 hitters.
