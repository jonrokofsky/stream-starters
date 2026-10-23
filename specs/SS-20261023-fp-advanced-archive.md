# SS-20261023-fp-advanced-archive: Architect spec

- Author / date / spec version / status: Architect (sequential role pass) / 2026-10-23 / v1 / READY FOR BUILD
- Input references and versions: User-authorized Fantasy Points Data Suite advanced passing, rushing, and receiving exports for the 2026 season
- Application location / revision: `C:/Users/jonro/stream-starters` / working tree after football structured-data foundation
- Output path / next owner / requested action: local source archive plus reusable importer / Coder / preserve all advanced fields and connect exact receiver routes
- Open issue and decision IDs: None

## Outcome and boundaries

Preserve all available advanced player data before the user's licensed trial ends. Download each completed week and season-to-date for passing, rushing, and receiving with all positions selected. Keep licensed raw exports local and ignored by Git. Use exact weekly route totals to strengthen receiver week-range calculations without redesigning the site.

## Requirements

- Capture completed Weeks 1–6 and season-to-date for all three advanced data families and all positions.
- Record file size and SHA-256 provenance in a manifest.
- Add a repeatable importer that turns weekly receiving exports into cumulative WR/TE route snapshots.
- Rebuild the existing football snapshots and verify the two-ended receiver timeline with a non-default start week.
- Preserve unrelated `public/1.png` and do not publish raw licensed CSVs.

## Acceptance criteria

| ID | Observable requirement | Verification method |
| --- | --- | --- |
| AC-1 | The local archive contains 21 non-empty CSV exports: 7 each for passing, rushing, and receiving. | Manifest and filesystem inspection. |
| AC-2 | Every archived file has a recorded size and SHA-256 hash. | Manifest validation. |
| AC-3 | Exact route totals are available for Weeks 1–6 and merge into receiver profiles. | Import output and coverage checks. |
| AC-4 | A Week 2–6 selection recalculates while keeping Routes/G populated. | Local browser interaction. |
| AC-5 | Existing football calculations and production build remain valid. | Focused tests, lint, and build. |

## Architect handoff

Store the licensed source archive outside version control, commit only derived application data and the reusable importer, and leave release/push as a separate user decision. READY FOR BUILD.
