# Workflow and handoffs

User -> Manager intake -> Architect -> Coder <-> Tester -> Manager -> User.

## Task lifecycle
1. Manager assigns `SS-YYYYMMDD-short-name`, records outcome, authority, application location and next owner in SESSION_STATE.md. Check existing work before writing. Copy templates into task-named files; never use template placeholders as completed evidence.
2. Architect writes `specs/<task>.md`: measurable acceptance criteria (AC-1, etc.), boundaries, assumptions and open questions. Manager checks completeness against user intent. READY FOR BUILD means no unresolved question blocks the planned work; it is not final user acceptance. Continue unaffected portions if a question blocks only part.
3. Coder reads the spec, records a brief engineering plan in `reviews/<task>-build.md`, challenges contradictions, then implements. A spec change goes back to Architect; a material scope change goes to the user. The build handoff identifies the exact revision and changes ready to test.
4. Tester reads spec and build, independently inspects behavior and relevant code, and writes `reviews/<task>-qa.md`. Map every required criterion to PASS, FAIL, or NOT RUN and explain limitations. Record issues by stable IDs in the QA report. Manager mirrors current dispositions in `reviews/<task>-issues.md`.
5. Coder appends issue responses in the build handoff and fixes accepted findings. Tester appends a numbered retest round against the updated revision. Manager updates the ledger from those artifacts. Preserve earlier results; a new revision invalidates affected results until reviewed. Repeat until blockers close or escalation applies.
6. Manager writes `reviews/<task>-manager.md`: SHIP (ready for user acceptance), FIX (specific remedial work), or RETHINK (requirements/design decision). SHIP requires required checks passing and no unresolved blockers; explicit user waivers must be visible. Missing essential evidence means FIX or RETHINK, not SHIP. Return the recommendation and key decisions to the user.
7. Record the user's actual acceptance, requested changes, rejection, or pending response. Only user acceptance marks ACCEPTED. Deploy/publish only within explicit applicable authorization; acceptance alone does not imply it. Mark COMPLETE after all requested actions and required checks finish.

States: INTAKE -> SPEC -> BUILD -> QA (back to BUILD for fixes) -> MANAGER REVIEW -> AWAITING USER -> ACCEPTED -> COMPLETE. BLOCKED and PAUSED retain the previous stage and next owner. Requested revisions return to SPEC or BUILD, then affected QA and Manager review.

## Common handoff envelope
Every task artifact starts with task ID, author/role, date, status, input paths and versions, output paths, application location, revision under review, open issue/decision IDs, next owner and requested action. Use a commit ID when available. Without Git, save a file/hash manifest covering relevant files and identify any changes since the previous handoff. Do not describe an uncommitted working tree using only HEAD.

Messages between agents contain: task ID; from -> to; request; artifact path/section; exact revision; expected response. The receiving role checks inputs and missing prerequisites before acting. Manager records routing in session state. Shared files are the source of continuity; private chat alone is insufficient.

## Challenge example (illustrative, not a product requirement)
- Tester I-001: BLOCKING. AC-2 requires an empty-state message; reproduction on revision R1 displays a blank screen. Expected message; observed blank screen.
- Coder: ACCEPT. Fixed empty-input branch on R2; build handoff links change and check.
- Tester: RETEST PASS on R2. Empty input and normal input checked; I-001 CLOSED.
- Tester I-002: NONBLOCKING. Large inputs may be slow; current required maximum passes. Propose a measured benchmark before optimization.
- Coder: DISAGREE with immediate optimization; links benchmark evidence. Manager records deferred improvement, owner and trigger. If required limits are unknown, route to Architect rather than inventing them.

## Escalation envelope
Issue/decision ID; decision needed; evidence from each role; impact of waiting; options with tradeoffs; recommended option; whether user authority is required; unaffected work that can continue. Apply the constitution's two-exchange/two-failed-fix limit. Record the answer in `decisions/` and update affected artifacts. Never manufacture a user answer.

## Pause and recovery
Manager stops further dispatch, requests checkpoints from active agents, and interrupts lingering work as needed. Save completed and partial outputs, actual revision, commands/checks and results, unfinished operations, open issues, current owner and exact next action in SESSION_STATE.md. Preserve uncommitted work. Do not create timers or assume the computer stays online.

On resume, verify files and revision against the checkpoint. Inspect interrupted operations before rerunning them, especially external actions. Reassign roles as needed; agent identities need not persist. If the session ended abruptly, reconstruct from artifacts and label uncertainty. Re-test affected behavior after changes.
