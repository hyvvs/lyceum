# 19. Working with ChatGPT/Codex-style Harnesses and Long Sessions

For setups where the agent is ChatGPT or Codex inside a harness that **starts a fresh chat every ~400k tokens and carries over a summary**. Assumptions: the harness details are not part of this kit, so this doc only relies on two facts: (1) a new chat begins with a summary, not the full history; (2) the agent can read and write files and run `pnpm` in the repository.

## 1. How the repo is laid out for Codex (nothing is ignored)

Everything agent-facing uses formats Codex reads (per OpenAI's Codex docs):

| Format | Where | What it does |
|---|---|---|
| `AGENTS.md` | repo root | Global rules. Codex reads it before work. Combined instruction files default to a 32 KiB cap, so this file stays under about 25 KB (currently about 15 KB). |
| Nested `AGENTS.md` | `packages/core`, `gateway`, `ui`, `profile-math`, `evals`, `docs`, `tasks` | Scoped rules, loaded when you work in that folder (root to working directory, one file per directory). They add to, never loosen, the root rules. |
| Skills (`SKILL.md`) | `.agents/skills/<name>/` | Repeatable workflows and reviews. Codex scans `.agents/skills` from your working directory up to the repo root; skills load on demand by description or when you invoke them by name. |
| Docs | `docs/`, `tasks/`, `evals/` | Plain files agents read when `AGENTS.md`, a skill, or a task card points to them. |

Removed because Codex does not read them: `CLAUDE.md`, `.claude/`, `.cursor/`, and the Copilot instructions file. `pnpm agentcheck` (part of `pnpm verify`) fails if they reappear, if a skill has bad frontmatter, if a doc references a skill that does not exist, or if the instruction files grow near the size cap.

## 2. Skills in this repo

`lyceum-session-start`, `lyceum-handoff`, `lyceum-implement-task`, `lyceum-architecture-review`, `lyceum-pedagogy-review`, `lyceum-ux-review`, `lyceum-security-review`, `lyceum-test-writer`, `lyceum-eval-scenarios`, `lyceum-adr`. Table of when to use each: `AGENTS.md` section 14.

Notes:
- If you use plain ChatGPT chat (not the Codex agent), nothing auto-loads files. Your harness or first message must tell it to read `AGENTS.md` and run the `lyceum-session-start` steps; paste the skill's text if skills are not available.
- Your harness must run `pnpm install` and `pnpm verify`. If it cannot, require pasted real output; never accept "tests pass" without output.
- Review skills cannot enforce read-only behavior; they instruct it. Run them in a fresh chat and check that no files changed.

## 3. Rules for long, restarting sessions

1. **Summaries are hints, the repo is truth.** If a summary conflicts with `AGENTS.md`, a spec, an ADR, or the code, the repo wins. Summaries tend to drop invariants and "why" details.
2. **Decisions go in files, not chat.** Decision → ADR. Progress → `docs/STATUS.md`. Requirements → task card. Anything only in chat can vanish at the next restart.
3. **One task card per chat when possible.** Quality usually degrades well before a context limit; 400k tokens is a ceiling, not a target. Start a new chat between tasks even if there is room.
4. **Checkpoint often.** Commit at every green state (work-in-progress commits on a branch are fine). Never end a chat with uncommitted work.
5. **Write the handoff block before context runs out** (around 60 to 70 percent used), not at the end.
6. **Verify the summary at the start of every new chat** (git state, tests, files), then continue.
7. **Summaries should cite IDs and paths** (`M1-007`, `packages/core/src/learner/bkt.ts`, `ADR-0005`) rather than restate specs.
8. **Never put secrets or learner data in summaries or STATUS.**

## 4. Session-start (skill or prompt)

Invoke the `lyceum-session-start` skill at the top of every new chat. If skills are unavailable in your harness, paste this:

> New session on Lyceum. Do not take requirements from any carried-over summary. First: (1) read `AGENTS.md`, `docs/STATUS.md`, and task card `<ID>` plus the specs it references; (2) run `git status`, `git log -5 --oneline`, and `pnpm verify` and show the real output; (3) compare the carried-over summary with the repo and list every discrepancy (the repo wins); (4) post a short plan and continue task `<ID>` from the last checkpoint. Do not edit files until the plan is posted.

## 5. Handoff (skill or block)

Invoke the `lyceum-handoff` skill before context runs out. It runs verify, commits, and appends this block to `docs/STATUS.md`:

```
## <date> · <task ID> · HANDOFF
Branch / last commit: <name> @ <hash>
State per acceptance criterion: <done | in progress | not started>, one line each
Verified: <real `pnpm verify` result; eval results if relevant>
Decisions made: <ADR links or "none">
Next 3 steps: 1) ... 2) ... 3) ...
Gotchas / surprises: ...
Open questions for the human: ...
```

## 6. Reviews

Run `lyceum-architecture-review`, `lyceum-pedagogy-review`, `lyceum-ux-review`, and `lyceum-security-review` as relevant, each in a **fresh chat** on the current branch. Fix findings in the working chat, then re-run the reviewer.

## 7. Human checks that matter more with restarting chats

- After each restart, skim the first reply: did it read the files and run the commands, or just agree with the summary?
- Every few tasks, run the full milestone review in `docs/15` section 9; it catches slow drift that per-chat summaries hide.
- If an agent contradicts an ADR, stop and point it to the ADR; do not let a summary rewrite history.
