# STATUS

Shared memory for humans and agents. Newest entries first. Keep entries short. Mark blocked items with `BLOCKED:`.

## 2026-11-22 · M0-001 · Bootstrap in progress
Done: initialized local Git history, added SHA-pinned CI verify/audit/secret-scan jobs, Renovate, issue templates, CODEOWNERS placeholder, Windows-compatible validation paths, and boundary-regression tests.
Verified: local `pnpm verify` passes (30 tests, typecheck, lint, boundaries, agentcheck) using an ignored Windows Corepack shim; secret scan finds 0. GitHub workflow has not run because no remote is configured. `corepack pnpm audit --audit-level high` reports 3 critical and 2 high vulnerabilities in the starter lockfile.
BLOCKED: GitHub owner/team identity needed for CODEOWNERS; remote and sample PR required to verify CI. Existing vulnerable dependencies require a separate, reviewed upgrade.
Next: check CI on GitHub, resolve audit findings, finish M0-001 acceptance, then begin M0-003 UI primitives.

## 2026-11-22 · Design language added
Done: docs/18 (glass design language + Framer Motion spec) from the reference video, docs/design-reference, `packages/ui` with `glass.css` and `motion.ts` (+6 tests, 26 total), ADR-0008, task cards M0-017 to M0-020, AGENTS.md UI rules. `pnpm verify` passes.
Next: M0-017 to M0-020 (design system, motion primitives, backdrop pipeline, glass performance spike).

## 2026-11-22 · Long-session workflow
Done: docs/19 and AGENTS.md section 11b for harnesses that restart chats with summaries (ChatGPT/Codex). No code changes.
Next: unchanged (M0-017 to M0-020 and the other M0 cards).

## 2026-11-22 · Codex-native agent files
Done: removed CLAUDE.md, .claude, .cursor, Copilot file (Codex ignores them); added 10 skills in .agents/skills, 7 nested AGENTS.md files, `pnpm agentcheck`; updated AGENTS.md, docs 15/19, README.
Next: unchanged.

## Current milestone
M0 Foundations (in progress)

## 2026-11-21 · Kit initialization
Done: repo scaffold, AGENTS.md, specs 00 to 17, ADRs 0001 to 0006, task cards for M0 to M2, working scaffold (core types, BKT, concept graph validation, gateway types, OpenAI-compatible adapter, registry, math profile stub, boundary checker). `pnpm verify` passes (20 tests).
Decisions: local-first architecture, TypeScript engine, Pyodide+SymPy for math verification (pending M0 spike), official-auth-only policy for provider accounts.
Next: run the architect kickoff prompt (docs/15 section 8); start M0 tasks.
Open questions: see docs/17.

## Decision log (short)
- ADR-0001 Local-first
- ADR-0002 TypeScript engine
- ADR-0003 Stack
- ADR-0004 Gateway ports and tiers
- ADR-0005 Event sourcing
- ADR-0006 Provider account policy
- ADR-0008 Glass design language and motion (ADR-0007 is reserved for the local runtime decision, task M0-009)
