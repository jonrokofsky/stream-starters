# Stream Starters team framework

Start here. This is a session-based operating framework for four Codex roles, with reusable artifacts and explicit review gates. It does not install a service, create four running agents, or configure schedules.

Open `C:/Users/jonro/stream-starters` as the working project. Its root AGENTS.md includes this framework alongside the existing Next.js instructions. Codex discovers instructions according to directory scope; see [official AGENTS.md documentation](https://learn.chatgpt.com/docs/agent-configuration/agents-md). Role files are read by instruction, not automatically registered agents. For an already-open task, explicitly ask it to read the updated AGENTS.md before starting.

The framework is installed alongside the current website. The original application README remains unchanged; this guide is FRAMEWORK_README.md. No application code, deployment settings, secrets, or synced ChatGPT source files were changed.

## Start a session
Copy this prompt and replace the brackets:

> Act as Stream Starters Manager. Read AGENTS.md, the constitution, product memory, workflow, and session state. Run the four-role workflow for: [outcome]. Use separate subagents where available and useful, and shared artifacts for every handoff. Create a task ID, identify the actual application location, and proceed within my request. Ask only questions that block a meaningful decision. Return a SHIP, FIX, or RETHINK recommendation with evidence for my acceptance.

## Resume or pause
> Resume Stream Starters from SESSION_STATE.md. Verify the saved files and revision, read open issues and decisions, and continue the next recorded action. Do not assume old tests cover new changes.

> Pause Stream Starters now. Stop delegated work, save handoffs and session state, and tell me the next action to resume.

The pause prompt is needed for a clean checkpoint; an abrupt shutdown can interrupt unsaved work. No presence detection or automatic shutdown is configured.

## File map
- [AGENTS.md](AGENTS.md): entry instructions and file ownership.
- [Constitution](STREAM_STARTERS_CONSTITUTION.md): authority, quality and escalation.
- [Product memory](PRODUCT_MEMORY.md): confirmed facts and unknowns.
- [Workflow](WORKFLOW.md): gates, handoffs and examples.
- [Session state](SESSION_STATE.md): current checkpoint.
- `agents/`: four role briefs.
- `specs/`: requirements and Architect handoff template.
- `reviews/`: build handoff, QA, issue ledger and Manager review templates.
- `decisions/`: durable decision records and template.

For a small change, keep entries short and mark irrelevant fields N/A with a reason. Do not invent work to fill a template.

