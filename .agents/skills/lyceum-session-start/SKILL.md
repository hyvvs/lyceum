---
name: lyceum-session-start
description: Use at the start of every new chat, after a context restart, or when a carried-over summary is provided on the Lyceum repo, before doing any work. Re-reads the rules, checks real repo state, and reconciles the summary against the repository.
---

# Lyceum session start

Never take requirements from a carried-over summary. The repository is the source of truth.

1. Read `AGENTS.md`, `docs/STATUS.md`, and the task card the user names (in `tasks/`), plus the specs and ADRs the card references. Nested `AGENTS.md` files in the folders you will touch also apply.
2. Run `git status`, `git log -5 --oneline`, and `pnpm verify`. Show the real output. Do not claim anything passes without running it.
3. Compare the carried-over summary (if any) with the repo and list every discrepancy (missing files, different decisions, failing tests). The repo wins.
4. Post a short plan for the task (files, interfaces, tests, risks, assumptions). If the card says "Ask first", or the change touches a public interface, an event schema, a dependency, privacy/key handling, or an ADR, stop and ask.
5. Do not edit files until the plan is posted.
