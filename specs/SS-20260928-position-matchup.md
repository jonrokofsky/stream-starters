# SS-20260928-position-matchup

- Author/role: Architect (sequential pass)
- Date: 2026-09-28
- Status: READY FOR BUILD
- Input: User request to add WR/TE players to the RB matchup tool, rename it Position Matchup Tool, and rename the defense-only tool Defense vs Position.
- Application: Stream Starters Next.js app
- Base revision: `5c02e14`
- Next owner: Coder

## Outcome and data rules

Provide one player matchup page for RB, WR, and TE. RB selections use the RB profile and YAC snapshots; WR/TE selections use the receiver profile snapshot; opponent cards use the existing defense-vs-position snapshot and the selected position's fields. WRs and TEs retain their position-specific profile grades.

## Acceptance criteria

- AC-1: The player matchup page lets the user switch among RB, WR, and TE and search players from the selected position.
- AC-2: RB cards retain rushing, receiving, opportunity, rush-gain, and YAC/attempt data.
- AC-3: WR/TE cards show receiver efficiency and opportunity grades plus receiver efficiency context, using `receivers-2026.json`.
- AC-4: Defense cards switch to RB, WR, or TE fields from `nfl-defense-vs-position-2026.json`.
- AC-5: The combined score remains 60% player profile and 40% matchup. Receiver profile is 60% efficiency and 40% opportunity.
- AC-6: The combined tool is available at `/football/matchup`; the existing `/football/rb/matchup` remains compatible.
- AC-7: The defense-only `/football` heading and homepage card read “Defense vs Position”; profile and homepage navigation point to the combined tool.
- AC-8: Production build and an RB/WR/TE browser interaction smoke test pass.
- AC-9: Every populated player and defense metric card uses the shared red-to-blue percentile scale and displays its percentile where the card represents a raw metric.

## Boundaries

No scoring-source changes, refresh-schedule changes, or new datasets. The task reuses published snapshots.
