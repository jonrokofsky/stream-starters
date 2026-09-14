# SS-20260912-agent-activity-bubbles: Architect spec

- Author / date / spec version / status: Architect / 2026-09-12 / v1 / READY FOR BUILD
- Input references and versions: current user request; `specs/SS-20260912-agent-hq.md`; `app/hq/page.tsx`; `app/hq/hq.module.css`; Stream Starters constitution and workflow
- Application location / revision: `C:/Users/jonro/stream-starters` / HEAD `f6cb3b8e65dcac23bb1d92ce4585fb87e4305a7a` with active uncommitted ingestion-foundation work
- Output path / next owner / requested action: `specs/SS-20260912-agent-activity-bubbles.md` / Coder / add truthful pixel activity bubbles without disturbing concurrent ingestion work
- Open issue and decision IDs: none

## Outcome and boundaries

Add a small pixel-style chat bubble above each Architect, Coder, Tester, and Manager workstation. Each bubble answers “what is this agent doing?” at a glance while preserving the approved room design and phone usability.

The current HQ has no live Codex event stream. Version 1 must derive its text only from state already known to the HQ page or an active data operation. When no reliable activity exists, it must say the agent is idle, waiting, or has no live update. It must not imply that an agent is running, thinking, testing, or communicating in real time when that has not been observed.

In scope: four compact bubbles, truthful state mapping, accessible text, responsive behavior, and a typed input contract for a future event connection. Out of scope: connecting Codex, polling task history, starting agents, persisting chat, notifications, or redesigning the room/sidebar.

## Requirements

### Activity contract

Create a small shared type or equivalent single source of truth:

```ts
type AgentActivity = {
  agent: "Architect" | "Coder" | "Tester" | "Manager";
  state: "idle" | "working" | "waiting" | "blocked" | "done";
  summary: string;
  source: "hq" | "session" | "data-operation" | "live-event";
  taskId?: string;
  artifact?: string;
  updatedAt?: string;
};
```

`live-event` is reserved for a future integration and is not emitted by v1. Rendering accepts one current activity per agent, so a later live feed can replace the v1 resolver without changing the visual component.

### Truthful v1 state

- The resolver may use the current demo handoff/paused state, explicit session/task state supplied to the page, and the actual pending/success/failure state of HQ data refresh operations.
- Demo-derived text remains visibly identified as `SAMPLE` or `DEMO`; selecting an agent or advancing a handoff does not become a claim of live work.
- A data refresh may show `working` only while its request is actually pending, then `done` or `blocked` from its returned result. Do not invent which role performed a server operation unless the mapping is explicitly defined by the product state.
- With no observed current activity, use a short neutral message such as “Waiting for a task” or “No live update.” Do not use hard-coded claims like “Writing the spec” as a permanent fallback.
- Do not display secrets, raw error bodies, stack traces, provider URLs, or arbitrary unbounded upstream text. Keep summaries short enough for the bubble and sanitize any server-derived message.

### Visual and interaction behavior

- Position one bubble visually above or immediately beside each pixel agent/workstation without covering the room title, windows, board, people, or nameplates.
- Match the existing pixel-art language: hard corners or stepped corners, crisp border/shadow, compact pixel-like label, and each agent's existing accent color. Avoid gradients, new image assets, and new packages.
- Show a brief status message, preferably one line and no more than two lines. Long summaries truncate visually while the full safe text remains available to assistive technology or a native title.
- State is distinguishable by text, not color alone. The selected/active treatment already in the room must remain clear.
- Bubbles are informational and require no click target. Existing agent tabs, handoff controls, pause control, data controls, and sign-out remain usable.
- On narrow phone widths, prevent overlap and horizontal scrolling. It is acceptable to show only the selected agent's bubble in the room if the agent tabs/sidebar still expose the other agents' current safe summaries; do not shrink text below the page's existing readable small-text size.
- Changes stay within the HQ page/component and scoped HQ styles except for a small reusable activity type/resolver when helpful.

## Acceptance criteria

| ID | Observable requirement | Verification method |
| --- | --- | --- |
| AC-1 | Desktop HQ shows a distinct pixel-style activity bubble associated with each of the four named workstations. | Visual inspection at a typical desktop width. |
| AC-2 | Every displayed message comes from the typed activity contract/resolver and carries a source/state; v1 does not emit `live-event`. | Code inspection and focused type/build check. |
| AC-3 | With no known activity, bubbles use neutral idle/waiting language and never claim live agent work. Demo messages are visibly labeled as sample/demo. | Exercise initial, paused, and handoff states; inspect copy. |
| AC-4 | If an existing HQ data refresh state is connected, `working` appears only during the pending request and resolves from its real result; sensitive/raw error content is not shown. | Trigger success and simulated failure paths, or verify resolver fixtures if integration is not yet available. |
| AC-5 | Bubbles do not obscure room elements or existing controls, and all existing HQ interactions continue to work. | Desktop interaction smoke check. |
| AC-6 | At 375px width there is no horizontal scrolling or text collision; the selected agent's activity remains readable and other activity remains accessible through the existing agent selection UI. | Mobile-width visual and interaction check. |
| AC-7 | Bubble information is available to screen readers, status is expressed in text, and no new keyboard trap or inaccessible control is introduced. | Accessibility tree/keyboard inspection. |
| AC-8 | The normal production build succeeds and focused lint for touched files reports no new errors. | Run the repository's build and focused lint commands. |

## Assumptions and decisions

- Confirmed: the user wants small pixel chat bubbles describing agent activity and wants the existing HQ retained.
- Observed: the current page explicitly labels itself a visual prototype with sample activity and says no live agents are connected.
- Reversible default: keep all four bubbles visible on desktop and prioritize only the selected agent's bubble inside the room on narrow screens.
- Reversible default: display neutral current-state copy in the room; retain the existing sample handoff narrative as clearly labeled demo content.
- No user decision is required for v1. A future live Codex event source will require a separate design and authorization before `source: "live-event"` can be truthful.

## Architect handoff

Implement the bubble as a small presentational component fed by a pure activity resolver. Keep truthful state selection separate from rendering so the future event stream has one clean insertion point. Coordinate around current uncommitted HQ/data-operation edits and do not overwrite them. READY FOR BUILD.
