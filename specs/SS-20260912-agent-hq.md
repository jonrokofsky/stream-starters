# SS-20260912-agent-hq: Architect spec

- Author / date / spec version / status: Architect / 2026-09-12 / 1 / READY FOR BUILD
- Input references: user approval of the visual prototype; existing website code; STREAM_STARTERS_CONSTITUTION.md
- Application location / revision: C:/Users/jonro/stream-starters / baseline 1a0711d plus framework files
- Output path / next owner / requested action: this file / Coder / implement
- Open issue and decision IDs: none

## Outcome and boundaries
Add a polished, responsive 16-bit-style Agent HQ to the current Stream Starters website. It should let the user click Architect, Coder, Tester, and Manager and step through a sample disagreement and handoff cycle.

In scope: a new `/hq` page, a homepage navigation link, accessible controls, responsive layout, and prominent disclosure that activity is sample data. Out of scope: live agent connections, background processes, persistent activity data, deployment, or changes to sports tools.

## Acceptance criteria
| ID | Observable requirement | Verification method |
| --- | --- | --- |
| AC-1 | `/hq` renders a recognizable pixel office with all four named roles. | Production build and visual inspection. |
| AC-2 | Selecting a role updates its message, role, artifact, and next owner. | Interact with all four buttons. |
| AC-3 | Next handoff advances a six-step Architect → Coder ↔ Tester → Manager cycle. | Click through and inspect labels. |
| AC-4 | Pause prevents handoff advancement and can resume it. | Exercise both controls. |
| AC-5 | The page clearly labels the experience as sample activity with no live agents connected. | Text inspection. |
| AC-6 | The page reflows without horizontal clipping on phone-size screens. | Responsive inspection. |
| AC-7 | The existing homepage links to Agent HQ without altering sports behavior. | Inspect homepage navigation and build. |

## Architect handoff
Use a dedicated client page and locally scoped CSS module. Recreate the approved mood using CSS-built pixel art so the page has no new asset or package dependency. READY FOR BUILD.
