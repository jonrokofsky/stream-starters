# SS-20260912-agent-activity-bubbles: QA report

- Author / date / status: Tester / 2026-09-13 / PASS
- Spec: `specs/SS-20260912-agent-activity-bubbles.md` v1
- Independence: sequential Manager review; the delegated Tester was unavailable after reaching its usage limit
- Revision: working tree based on `4d62637`

Desktop inspection showed four distinct pixel activity bubbles aligned with the four workstations. State and summary are exposed as visible text, accessible status labels, and titles. All demo activity remains visibly marked SAMPLE or DEMO; inactive agents use neutral waiting language.

At a 375px viewport, the document had no horizontal overflow (`clientWidth: 360`, `scrollWidth: 360`). Only the selected agent's bubble remained visible, selecting another agent moved the visible bubble correctly, and pausing changed every activity to `waiting` with `DEMO · Paused` copy.

The HQ data panel authenticated after the login cookie scope fix, loaded the active production snapshots (251 pitchers and 30 team rows), and a manual pitcher refresh returned `data is already current`. Sign-out clears both the current root-scoped cookie and the former `/hq` cookie.

Validation passed: 26 data tests, TypeScript with incremental output disabled, focused ESLint for all touched TypeScript files, and the Next.js production build.

No blocking or nonblocking issues remain.
