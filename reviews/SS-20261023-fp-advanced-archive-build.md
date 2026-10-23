# SS-20261023-fp-advanced-archive: Build record

- Author / date / status: Coder (sequential role pass) / 2026-10-23 / COMPLETE
- Spec / application: v1 / `C:/Users/jonro/stream-starters`
- Output / next owner: local advanced archive, manifest, importer, derived route archive / QA

## Implementation

Downloaded 21 Fantasy Points Data Suite CSV exports covering advanced passing, rushing, and receiving for completed Weeks 1–6 plus season-to-date, with every position included. The files live under `data-source-archive/fantasypoints/2026/advanced/`; `manifest.json` records the source URL, capture time, scope, byte count, and SHA-256 for each file.

Added `scripts/import-fantasypoints-advanced.mjs` and package command `import:fantasypoints-advanced`. The importer reads the two-row Fantasy Points headers, filters receiver route data to WR/TE, accumulates exact weekly routes, and writes `public/data/receiver-routes-weekly-2026.json`. The raw licensed directory is ignored by Git; only the importer and derived application data are eligible for publication.

## Result

The route archive contains 244, 269, 285, 296, 311, and 322 cumulative route rows for Weeks 1–6. The football refresh generated 6,551 player-week rows, detected completed Week 6 and live source Week 7, and rebuilt RB, receiver, YAC, and defense application snapshots. No deliberate visual redesign was made.
