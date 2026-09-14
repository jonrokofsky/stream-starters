# D-0003: Dataset refresh scheduling

- Task / author / date / status: SS-20260912-automated-data-ingestion / Manager / 2026-09-13 / DECIDED
- Inputs / versions / application revision: Architect spec v1 / f6cb3b8e65dcac23bb1d92ce4585fb87e4305a7a plus uncommitted task artifacts
- Output path / next owner / requested action: this file / Architect and Coder / implement one daily hosted refresh with sport-specific in-season guards
- Related issues / supersedes: nonblocking; supersedes none

## Decision needed

Refresh each connected dataset once daily while its sport is in season. Continuous polling and live data updates are unnecessary.

## Options and recommendation

Use one hosted daily trigger that calls the same validated refresh service as the private HQ controls. Each adapter checks its sport's season before fetching and returns an explicit skipped result outside the season. Keep the manual HQ refresh available. For the first MLB implementation, 10:00 UTC is the reversible default, corresponding to 6:00 AM Eastern during most of the MLB season.

## Authority and resolution

The user authorized daily in-season refreshes on 2026-09-13. Architect defines the guard and authentication requirements; Coder implements them. Future provider costs or a change in cadence still require user direction.
