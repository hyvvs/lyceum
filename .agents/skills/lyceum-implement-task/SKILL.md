---
name: lyceum-implement-task
description: Use when asked to implement a task card (for example M1-007) from the tasks/ folder of the Lyceum repo. Runs the full per-task loop: plan, tests first, implement, verify, review, document.
---

# Implement a Lyceum task card

Follow `AGENTS.md` section 6 and `docs/15-agent-workflow.md` section 5.

1. Run `lyceum-session-start` first if this is a new chat.
2. Read the card and its referenced specs. A card is Ready only if dependencies are done and acceptance criteria are testable; if not, say so and stop. Do not expand the card's scope; you may split it.
3. Post a plan and wait for approval when the card says "Ask first", changes a public interface or event schema, adds a dependency, or touches pedagogy, privacy, key handling, or an ADR.
4. Write failing tests first, including failure paths (bad model output, network failure, cancellation, empty/huge data, determinism with injected `Clock`/`Rng`).
5. Implement in small steps inside the package named by the card. Respect the nested `AGENTS.md` of each folder.
6. Run `pnpm verify` and paste the real output. Run evals for prompt, tutor, planner, grading, or gateway changes.
7. Run the review skills in fresh chats where practical: `lyceum-architecture-review` always; `lyceum-pedagogy-review` for tutoring behavior; `lyceum-ux-review` for UI; `lyceum-security-review` for keys, logging, sandbox, dependencies. Fix findings.
8. Update docs, ADRs, the card's status line in `tasks/`, and `docs/STATUS.md` (use `lyceum-handoff`).
9. Prepare the PR description from `.github/pull_request_template.md` with real command outputs and eval results.
