# SS-20261030-receiver-routes-filter: Architect spec

- Author / date / spec version / status: Architect sequential pass / 2026-10-30 / v1 / READY FOR BUILD
- Input references and versions: User request to filter the receiver board by routes run per game.
- Application location / revision: `C:/Users/jonro/stream-starters` / `aefbde5`
- Output path / next owner / requested action: `app/football/receivers/page.tsx` / Coder / implement and verify.
- Open issue and decision IDs: None.

## Outcome and boundaries
Add one minimum Routes/G control to the existing All Receivers board. Preserve the board's data, score calculations, position filters, sorting, desktop table, and mobile cards.

## Requirements
The control must allow a minimum from 0 through 50 routes per game, apply before sorting, update the visible player count immediately, and remain usable without horizontal page overflow on a phone. Players with missing route data remain visible only at the unfiltered zero setting.

## Acceptance criteria
| ID | Observable requirement | Verification method |
| --- | --- | --- |
| AC-1 | A labeled minimum Routes/G slider appears above the receiver board. | Browser inspection. |
| AC-2 | Raising the value removes rows/cards below the selected Routes/G threshold and updates the player count. | Browser interaction check. |
| AC-3 | Position filtering and sorting operate on the already route-filtered rows. | Code inspection and production build. |
| AC-4 | The control fits a 390 px viewport without page-level horizontal overflow. | Headless Chromium check. |

## Assumptions and decisions
The default is zero so the existing board remains unchanged until the user chooses a threshold. A 0-50 whole-number range covers the active dataset and makes the control easy to use.

## Architect handoff
Use client state in the existing Client Component and include the threshold in the board memo dependencies. READY FOR BUILD.
