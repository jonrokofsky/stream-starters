# SS-20260912-agent-activity-bubbles: Build handoff

- Author / date / status: Coder / 2026-09-12 / READY FOR QA
- Spec path and version / other inputs: `specs/SS-20260912-agent-activity-bubbles.md` v1; `AGENTS.md`; `WORKFLOW.md`; `agents/CODER.md`
- Application location / revision: `C:/Users/jonro/stream-starters` / base `f6cb3b8e65dcac23bb1d92ce4585fb87e4305a7a` plus active uncommitted ingestion-foundation work
- Output paths / next owner / requested action: `app/hq/activity.ts`, `app/hq/page.tsx`, `app/hq/hq.module.css`, this handoff / Tester / independently verify desktop, 375px, keyboard, and screen-reader behavior
- Open issue and decision IDs: none

## Engineering plan

Add a typed activity contract and pure demo-state resolver, then render a compact status-labelled bubble at each workstation. Keep the current handoff simulation visibly marked SAMPLE, use neutral idle or paused language for all other states, expose the full safe summary through accessible text and a native title, and show only the selected agent's bubble in the room at phone widths. Keep the existing tabs, controls, sidebar, and data-operation component unchanged. The future event integration can replace the resolver output without changing the bubble renderer.

Likely failure points are speech bubbles overlapping the upper room furniture at desktop widths, crowding the two-row mobile workstation layout, and copy accidentally implying live activity. Verification will include type checking, focused lint, production build, and visual inspection.

## Implementation

- `app/hq/activity.ts` defines `AgentActivity`, the shared agent name, a bounded whitespace-normalizing summary helper, and a pure v1 resolver. It emits only `hq` sources: the current simulated handoff is `working` with a visible `SAMPLE` label, inactive agents are neutral `idle`, and pausing makes every agent `waiting` with `DEMO` copy. It never emits the reserved `live-event` source.
- `app/hq/page.tsx` renders one informational status bubble per workstation from the resolver. State and message are available in visible text, `aria-label`, and `title`; agent-selection buttons also carry visually hidden current summaries so phone users can discover every state.
- `app/hq/hq.module.css` adds crisp agent-accented pixel bubbles and text-based state labels. At widths up to 580px, only the selected workstation bubble appears in the room, preventing four bubbles from colliding while tabs keep all agents selectable and their summaries accessible.
- Existing handoff, pause, data-operation, agent-selection, sign-out, and sidebar behavior was retained. No data-ingestion backend or data-operation component was edited, and no live connection is claimed.

## Revision under review

Base `f6cb3b8e65dcac23bb1d92ce4585fb87e4305a7a` plus the active uncommitted ingestion-foundation manifest and these activity-bubble files: `app/hq/activity.ts`, `app/hq/page.tsx`, `app/hq/hq.module.css`, and `reviews/SS-20260912-agent-activity-bubbles-build.md`.

## Checks actually performed

| Check | Actual result |
| --- | --- |
| `npx eslint app/hq/page.tsx app/hq/activity.ts` | PASS, exit 0, no diagnostics. |
| `npx tsc --noEmit` | PASS, exit 0, no diagnostics. |
| `npm run build` | PASS, exit 0. Next.js 16.3.1 compiled, typechecked, generated all 16 pages, and listed `/hq` plus the ingestion routes successfully. |
| Desktop and 375px visual/interaction/accessibility inspection | NOT RUN by Coder. Tester should inspect the integrated UI; CSS provides the specified mobile selected-agent fallback. |

## Tester reproduction

Open `/hq` at a typical desktop width and confirm four distinct bubbles remain associated with their workstations. Advance and pause the demo to verify only sample/neutral copy appears. At 375px, select each agent and confirm only its bubble appears in the room with no horizontal overflow. Tab through agent selection, handoff, pause, data controls, and sign-out; inspect accessible names for bubble state and summary.

## Issue responses

No Tester findings received yet.
