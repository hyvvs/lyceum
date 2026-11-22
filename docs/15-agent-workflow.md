# 15. Agent Workflow (how to build Lyceum with AI coding agents)

This guide is for the human running the project and for the agents doing the work. It explains roles, task cards, parallelization, handoffs, and gives copy-paste kickoff prompts.

> Using ChatGPT/Codex or any harness that restarts chats with summaries? Read `docs/19-long-session-and-chatgpt-workflow.md` for the session-start and handoff workflow (the `lyceum-session-start` and `lyceum-handoff` skills) and the review skills.

## 1. Principles

1. **Specs are the contract.** Agents implement specs; if a spec is wrong or missing, they stop and ask (AGENTS.md section 11), then update the spec.
2. **Small, verifiable steps.** Each task produces a PR that passes `pnpm verify` and its acceptance criteria.
3. **Boundaries prevent collisions.** Parallel agents work in different packages; shared interfaces change only through explicit tasks.
4. **Review by specialists.** Use the review skills (`lyceum-architecture-review`, `lyceum-pedagogy-review`, `lyceum-ux-review`, `lyceum-security-review`) and `lyceum-test-writer` before human review.
5. **Truth over confidence.** Agents report real command output and real eval numbers. Never claim a test passed without running it.
6. **Memory lives in the repo.** `docs/STATUS.md`, ADRs, and task cards are the shared memory across sessions and agents.

## 2. Roles

| Role | Does | Does not |
|---|---|---|
| **Human lead** | Sets priorities, accepts ADRs, resolves "ask first" questions, reviews PRs, runs learner studies | |
| **Architect agent** | Drafts ADRs, designs interfaces, writes plans for multi-file changes | Implement large features itself |
| **Implementer agent** | Implements a task card in its package | Change public interfaces or add dependencies without approval |
| **Test/eval agent** | Writes tests, eval scenarios, simulations | Change production code (reports bugs instead) |
| **Pedagogy reviewer** | Checks tutoring behavior against docs 05 to 07 | Edit code |
| **UX reviewer** | Checks UI against docs/01 | Edit code |
| **Security reviewer** | Checks keys, logging, sandbox, supply chain | Edit code |
| **Docs agent** | Keeps specs and STATUS in sync | Invent behavior |

One agent may play several roles in sequence, but reviews should be done by a fresh context (a different chat session running a review skill), not the author.

## 3. Task cards

Task cards live in `tasks/` (one file per milestone, one card per task). A card has: **ID, title, milestone, package(s), depends on, context (spec references), requirements, acceptance criteria, tests to write, out of scope, "ask first" triggers**. Template:

```
### M1-007 Scheduler: exam-aware interval compression
Package: packages/core  ·  Depends on: M1-006
Context: docs/05 section 3
Requirements:
 - ...
Acceptance:
 - ...
Tests: unit, property (fast-check), simulation
Out of scope: ...
Ask first if: changing FSRS parameters' public shape
```

Rules: a card is **Ready** only when dependencies are done, specs referenced exist, and acceptance criteria are testable. Agents may split a card but not expand its scope.

## 4. Parallelization map

| Safe in parallel (separate packages) | Coordinate on |
|---|---|
| `core` algorithms ↔ `gateway` adapters ↔ `profile-math` ↔ `ui` components | `core` interfaces consumed by others (`DomainProfile`, events, ports) |
| Different adapters in `gateway` | `gateway/types.ts` and the structured-output ladder |
| Different screens in `apps/web` | Shared stores, routing, design tokens |
| Docs and evals | Eval scenario format |

Interface changes go through a dedicated "interface task" merged first; dependent tasks rebase afterward.

## 5. The per-task loop (agent checklist)

1. Read AGENTS.md, `docs/STATUS.md`, the task card, the referenced specs and ADRs.
2. Post a short plan (files, interfaces, tests, risks, assumptions).
3. Write failing tests first.
4. Implement in small commits.
5. `pnpm verify`; run evals if applicable.
6. Run the review skills (fresh chats where practical); fix findings.
7. Update docs and `docs/STATUS.md`.
8. Open the PR using the template, with real command outputs and eval results.

## 6. Handoff and status protocol

Append to `docs/STATUS.md` at the end of every task:

```
## 2026-11-21 · M1-007 · agent: <name>
Done: ...
Decisions: ... (ADR link if any)
Next: ...
Open questions: ...
```

Keep entries short. Blocked tasks get a `BLOCKED:` line with what is needed from a human.

## 7. Prompting agents well

- Give the task card ID and tell them to read the files named in the protocol.
- Demand evidence: command outputs, test names, eval numbers.
- Ask for the plan first on anything non-trivial and approve it.
- Keep prompts free of secrets and learner data.
- For prompt-engineering tasks, require eval scenarios as part of the deliverable.

## 8. Kickoff prompts (copy-paste)

**Kickoff (first session, architect):**
> You are the architect for Lyceum. Read AGENTS.md, docs/00 to docs/13, and all ADRs. Do not write product code yet. Produce: (1) a list of ambiguities or contradictions you found in the docs with proposed fixes, (2) a refined M0 task breakdown with dependencies, (3) the three spike plans (local model viability, Pyodide+SymPy load and correctness, OPFS SQLite performance) each with success criteria. Output as markdown for me to review. Make no commits.

**Implementer:**
> Implement task <ID> from tasks/<file>. Follow AGENTS.md section 6. First read docs/STATUS.md and the specs referenced by the card. Post your plan and wait for my approval if the card says "Ask first" or touches a public interface. Write failing tests first. Run `pnpm verify` and paste the real output. Run the `lyceum-architecture-review` skill and fix findings. Update docs and docs/STATUS.md. Open a PR with the template filled in.

**Test/eval writer:**
> Write tests and eval scenarios for <module or behavior>. Do not change production code. Cover failure paths, determinism, and properties. For tutoring behavior, create scenarios in evals/scenarios using the format in docs/12 section 3.1 covering anti-sycophancy, hint ladder, tool authority, and injection. Report any production bugs you find as failing tests plus a note.

**Pedagogy review:**
> Use the `lyceum-pedagogy-review` skill on the current diff. Run the eval suite if available. List BLOCKER / SHOULD-FIX / NOTE items with example dialogues demonstrating each risk.

**UI implementer:**
> Implement <screen/component> per docs/01 and the task card. Use only design tokens and components from packages/ui. Provide Storybook stories for all states, keyboard and screen-reader behavior, and a Playwright test for the main flow. Run the `lyceum-ux-review` skill and fix findings. Attach screenshots in light, dark, high-contrast, and 200% text.

**Security review:**
> Review the diff for: key handling, logging of sensitive data, prompt-injection exposure, sandbox boundaries, new dependencies (license, maintenance), and telemetry. Run the secret scan and dependency audit. Report BLOCKER / SHOULD-FIX / NOTE.

## 9. Human review checklist per milestone

- Do acceptance criteria pass on a fresh machine?
- Is `docs/STATUS.md` truthful and current?
- Were any invariants bent? Are ADRs updated?
- Try the product as a learner for 30 minutes: is it calm, clear, and honest?
- Try to break it: kill the app mid-exam, unplug the network, feed bad model output, upload a corrupt file.
- Read three random tutor transcripts for tone and honesty.

## 10. Release exploratory checklist (manual)

Onboarding as a new user; connect a cloud key, a local server, and an embedded model; complete a session; run a mock exam and interrupt it; resume; export and re-import data; switch themes and text scale; navigate by keyboard only; use a screen reader on core flows; test offline; verify the privacy badges match reality (inspect network traffic); confirm no keys in logs or exports.

## 11. Anti-patterns to avoid when using agents

Letting an agent both write and approve its own work; broad "build the app" prompts; skipping the plan on cross-cutting changes; merging without real command output; accepting plausible-looking eval claims without seeing the run; letting agents "fix" failing tests by weakening them; leaving specs stale after behavior changes.
