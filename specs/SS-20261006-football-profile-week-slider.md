# SS-20261006-football-profile-week-slider: Architect spec

- Author / date / spec version / status: Architect (sequential role pass) / 2026-10-06 / v1 / READY FOR BUILD
- Input references and versions: user request; existing RB weekly archive; Week 3 receiver Git snapshot; current Week 4 receiver snapshot
- Application location / revision: `C:/Users/jonro/stream-starters` / `13374d1`
- Output path / next owner / requested action: football profile pages and weekly receiver archive / Coder / implement and verify
- Open issue and decision IDs: None

## Outcome and boundaries

Add one compact cumulative-week slider to the RB, WR, and TE profiles. Only real saved snapshots may appear. RB history begins at Week 2; receiver history begins at Week 3. Week 1 is unavailable and must not be fabricated.

## Requirements

- RB profiles select from the existing Week 2–4 archive and recalculate the visible player, percentile pools, fantasy PPG color, and all component values from the selected snapshot.
- WR and TE profiles share one Week 3–4 slider and recalculate the profile and sortable sheet from the selected snapshot.
- The selected week must appear on the profile graphic.
- Future receiver refreshes must append or replace the detected cumulative week atomically and the workflow must commit that archive.
- The control must fit the existing mobile profile layout without horizontal overflow.

## Acceptance criteria

| ID | Observable requirement | Verification method |
| --- | --- | --- |
| AC-1 | RB slider offers W2, W3, W4 and changes the profile data. | Browser walkthrough. |
| AC-2 | Receiver slider offers W3, W4 and changes profile/table data. | Browser walkthrough. |
| AC-3 | Exportable cards identify the selected cumulative week. | DOM and visual inspection. |
| AC-4 | Receiver refresh safely maintains the weekly archive. | Unit tests and workflow inspection. |
| AC-5 | Profiles remain responsive and production-build clean. | 390px overflow check, tests, build. |

## Assumptions and decisions

The slider shows cumulative snapshots (“Through Week”). Week 1 is omitted because no real archive exists. Historical snapshots are not reconstructed from current totals.

## Architect handoff

Reuse the existing RB weekly archive, seed receiver Week 3 from the real repository snapshot, add an archive helper to the receiver refresher, and keep the latest snapshot as the default. READY FOR BUILD.
