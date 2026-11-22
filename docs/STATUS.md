# STATUS

Shared memory for humans and agents. Newest entries first. Keep entries short. Mark blocked items with `BLOCKED:`.

## 2026-11-22 · M0-002 · Boundary checker hardening
Done: merged [M0-001 PR #1](https://github.com/hyvvs/lyceum/pull/1) into main (`1ae8592`). Extended the boundary checker using the existing TypeScript parser: block package imports from apps, deep or relative cross-package imports, forbidden core/gateway dependency edges (including dev/peer/optional dependencies), missing typecheck scripts in packages and apps, and direct nondeterministic calls in core (including computed properties), with source locations and regression fixtures. Source files outside `src` are scanned; source symlinks and escaping export paths are rejected.
Verified: local `pnpm verify` passes 44 tests in 10 files, with one Linux-only symlink fixture skipped on Windows due to OS permission restrictions; four package typechecks, agentcheck, boundaries and lint pass. Full `pnpm audit` reports no known vulnerabilities. Checker also covers `.d.ts` imports and rejects package export targets in unscanned build directories. Added `.gitattributes` for consistent LF checkouts on Windows.
Review decision: removed the unused exported `systemClock` convenience implementation (its `new Date()` violated the injected-clock invariant); `Clock` interface and `createRng` remain unchanged. This public export removal requires human review before merging M0-002. The existing `@lyceum/ui/glass.css` export also needs reconciliation if a future consumer imports it directly, because the package boundary policy requires the public index entry point.
Next: independent review, commit and open M0-002 PR; then M0-003 accessible UI primitives, subject to approval of required React/Radix/Storybook/testing dependencies.

## 2026-11-22 · M0-001 · Acceptance checks proven
Done: verified CI rejects forbidden subject tooling in core through disposable [draft PR #2](https://github.com/hyvvs/lyceum/pull/2); closed PR unmerged and removed its branch. M0-001 requirements and acceptance tests (including frozen fresh-checkout install, all three successful CI jobs, negative boundary check) are demonstrated.
Verified: [negative-control run 45003487494](https://github.com/hyvvs/lyceum/actions/runs/45003487494) failed Verify at `pnpm boundaries` with the expected error; audit and secret scan succeeded. [PR #1 CI run 45000358447](https://github.com/hyvvs/lyceum/actions/runs/45000358447) passed all three jobs.
Next: merge [PR #1](https://github.com/hyvvs/lyceum/pull/1) after green checks, then implement M0-002. Separately, repository owner still must authorize the Renovate GitHub App; `.github/renovate.json` is committed.

## 2026-11-22 · M0-001 · GitHub onboarding
Done: pushed baseline `main` (`1a8e4da`) before `m0/ci-bootstrap`, opened [PR #1](https://github.com/hyvvs/lyceum/pull/1), set CODEOWNERS to `@hyvvs`, and enabled `main` branch protection requiring up-to-date Verify, Dependency audit, and Secret scan checks (also for admins).
Verified: [PR run 45000233694](https://github.com/hyvvs/lyceum/actions/runs/45000233694) passed all three GitHub Actions jobs; local `pnpm verify` passed 30 tests. No merges were made.
Follow-up outside M0-001's configured-file acceptance: owner must authorize [Renovate GitHub App](https://github.com/apps/renovate/installations/new) for `hyvvs/lyceum`. Negative boundary CI proof was completed in the later entry above.

## 2026-11-22 · M0-001 · Bootstrap in progress
Done: initialized local Git history and pushed the baseline `main` to `hyvvs/lyceum`; added SHA-pinned CI verify/audit/secret-scan jobs, Renovate config, issue templates, CODEOWNERS (`@hyvvs`), Windows-compatible validation paths, and boundary-regression tests. Updated Vitest to 5.1.1 and Zod to 4.6.7; added Vite 8.3.8 as the compatible Vitest peer; raised Node requirements to 22.12+ and CI to 22.20.0.
Verified: local `pnpm verify` passes (30 tests, typecheck, lint, boundaries, agentcheck) using an ignored Windows Corepack shim; secret scan finds 0. `corepack pnpm audit` reports no known vulnerabilities, without advisory exclusions.
Review note: Vite 8 brings in MPL-2.0-licensed Lightning CSS as a dev-only transitive dependency; review distribution obligations before release.
Next: verify hosted CI on the bootstrap PR, configure branch protection and Renovate installation, demonstrate boundary rejection via a draft PR, and finish M0-001 acceptance before M0-003 UI primitives.

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
