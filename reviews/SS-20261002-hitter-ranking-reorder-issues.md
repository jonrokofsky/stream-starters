# SS-20261002-hitter-ranking-reorder: Shared issue ledger

- Owner: Manager
- Updated / spec version / current revision: 2026-10-02 / v1 / `55a2439`
- Input QA/build paths / output path / next owner / requested action: task QA and build handoff / this ledger / Manager / release review
- Open decision IDs: None

No issues opened.


| I-001 | BLOCKING | Duplicate player names could collide in a full rerank save, defeating AC-3. | Browser duplicate-key warning; current snapshot has Max Muncy on LAD and ATH; build response and QA round 2. | Coder/Tester | CLOSED | Both rows use team-qualified identities, API rejects ambiguous duplicates, 5 tests and browser retest pass. |
