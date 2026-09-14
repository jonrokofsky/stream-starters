# SS-20260912-automated-data-ingestion: Issue ledger

- Author / date / status: Manager / 2026-09-13 / FOUNDATION BLOCKERS CLOSED; PROVIDER WORK IN PROGRESS
- Inputs: Architect spec; Coder build handoff; Tester QA round 1
- Application revision: base f6cb3b8 plus uncommitted task manifest
- Next owner / requested action: Coder implements the confirmed FanGraphs pitcher adapter; Tester runs parity and failure checks

| ID | Severity | Status | Finding | Owner / closure condition |
| --- | --- | --- | --- | --- |
| I-001 | BLOCKING | CLOSED | Refresh-lock acquisition errors could escape the per-dataset safe-result path and reject `Refresh all`. | Closed in Tester retest round 1: sanitized per-dataset failure and independent dataset completion verified. |
| I-002 | BLOCKING | CLOSED | A failed completion write could leave a permanent `refreshing` row and unique-index lock. | Closed in Tester retest round 1: five-minute lease and stale-run recovery verified. |
| I-003 | BLOCKING | CLOSED | Canonical team normalization changed the FanGraphs multi-team label `2 Tms` to `2 TMS`, breaking pitcher parity. | Closed in Tester revision 5 retest: 19 live multi-team labels preserved, zero corrupted labels, and normal abbreviation normalization retained. |
| O-001 | NONBLOCKING | CLOSED | Upstream response size was checked after the response was fully buffered. | Closed in Coder revision 3 and independently exercised: the response stream is canceled as soon as it exceeds 5 MiB. |

The pitcher adapter and daily schedule are implemented with no open code issue. AC-P6 retained full parity evidence and AC-7 authenticated browser/database verification still gate pitcher cutover. The other five datasets remain blocked by decision D-0002.
