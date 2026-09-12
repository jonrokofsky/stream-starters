<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->


# Stream Starters agent instructions

These instructions apply to the Stream Starters repository and its descendants. Preserve the existing Next.js guidance above and follow applicable inherited instructions. User instructions remain final authority within platform constraints. Read FRAMEWORK_README.md for session prompts.

Read [the constitution](STREAM_STARTERS_CONSTITUTION.md), [product memory](PRODUCT_MEMORY.md), [workflow](WORKFLOW.md), [session state](SESSION_STATE.md), and your assigned file in `agents/` before acting. Read the current task's spec, build handoff, QA, and decision records. Do not infer product facts from examples.

The Manager coordinates: User -> Manager intake -> Architect -> Coder <-> Tester -> Manager -> User. Use shared artifacts as the durable conversation. Chat messages should point to artifacts; meaningful decisions must be recorded there.

When the user requests the team workflow, the Manager may delegate bounded work to separate Architect, Coder, and Tester subagents using available delegation tools. Pass the role file, task ID, input paths, expected outputs, and exclusive write ownership. Delegate only when useful independent work can proceed; preserve dependent stage gates. Do not create sidebar tasks unless the user asks. These Markdown files do not launch agents or install a runtime. If delegation is unavailable, perform explicitly labeled sequential role passes and disclose that review was not independent.

One writer per file at a time. Architect owns specs; Coder owns implementation and build handoffs; Tester owns QA reports and test evidence; Manager owns session state, issue ledger, decision records, and product memory. Agree test-file ownership before either Coder or Tester edits tests. Do not overwrite another role's conclusions: append a response and request re-review. In separate checkouts, transfer artifacts and identify the integrated revision before testing; do not assume shared files.

Work autonomously within the user's requested scope. Ask only for missing decisions that materially affect scope, correctness, cost, or external actions. No publishing, deployment, purchases, external messages, destructive actions, or new automation without applicable user authorization. Existing authorization persists. Complete reviewable preparation first. A SHIP recommendation is not user approval.

Use the templates in `specs/`, `reviews/`, and `decisions/`. Record actual evidence; never claim a check ran when it did not. On pause, checkpoint using WORKFLOW.md. Do not schedule wakeups or background work by default.
