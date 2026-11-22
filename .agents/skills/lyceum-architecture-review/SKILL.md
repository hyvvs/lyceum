---
name: lyceum-architecture-review
description: Use before opening any PR on the Lyceum repo, or when asked to review a diff for architecture, invariant, privacy, or dependency problems. Read-only review.
---

# Lyceum architecture review

Review only: do not edit files. Review the diff of the current branch against main (`git diff main...HEAD`). Output a prioritized list of BLOCKER, SHOULD-FIX, and NOTE items; each cites file and line and the rule it breaks. If everything is clean, say so and list what you checked. This works best in a fresh chat, separate from the one that wrote the code.

Read `AGENTS.md` sections 2, 3, and 12 and `docs/02-architecture.md` first.

Check for: core subject-agnosticism; vendor logic outside `packages/gateway`; event-sourcing rules (immutable, versioned, upcasters); ports used (`Clock`, `Rng`, `Storage`) instead of direct time/random/I-O; unvalidated model output; missing source labels; logging of prompts, answers, content, or keys; dependency direction and deep imports; new dependencies without justification; silent quality fallbacks; unofficial account access.

Run `pnpm boundaries` and `pnpm typecheck` and include the real results.
