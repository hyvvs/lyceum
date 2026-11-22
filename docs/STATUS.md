# STATUS

Shared memory for humans and agents. Newest entries first. Keep entries short. Mark blocked items with `BLOCKED:`.

## 2026-11-22 · M0-003 · Accessible Tooltip slice underway
Done (on `m0/ui-tooltip-storybook`, PR pending): introduced Radix Tooltip 1.4.1 (MIT, about 143 KB unpacked) with 300ms hover-delay and 8px placement tokens, semantic Button triggers and required nonempty plain-text content. The public API enforces hoverable content and Escape dismissal, disallows accessibility-label/role/hidden overrides, and rejects unsupported `asChild`/children combinations at type and runtime. The opaque, contrast-bordered portal respects reduced/off motion, forced colors, a 120ms full-motion entrance, and RTL direction (including Arabic sample text). Stories cover hover/focus, disabled/loading, icon-only, error/empty/long text, RTL, dark/light/high contrast, 200% text and full/reduced/off motion and transparency options. Tooltip text is supplementary: keyboard-inaccessible disabled or touch-only controls must not depend on the popup for essential instructions.
Verified locally: `pnpm verify` (62 unit tests passed, 1 Windows symlink skip, four package typechecks and architecture/lint gates clean), unrestricted `pnpm audit` (no advisories), Storybook build and 24 Playwright/axe browser checks (8 Button, 8 Dialog, 8 Tooltip). Tooltip browser cases cover pointer transit/persistence/dismissal, Escape while hovered, keyboard focus and Escape, 320px/200% layout, opaque text contrast >=4.5:1 in sampled themes, reduced/off/full motion, portalled RTL content and all story axe states. Independent UX/architecture and security reviews identified and confirmed fixes for hoverability, Escape, motion, RTL, tokenized timing/spacing and public API accessibility overrides; no remaining confirmed blockers. Storybook-only Vite chunk and Radix `use client` notices remain nonblocking, not measured learner-app bundle sizes; hosted CI pending at this entry.
Next: publish scoped Tooltip PR and verify required hosted checks. M0-003 stays `[~]`: Tabs, Select, Toast, VisuallyHidden, FocusScope and real backdrop/performance acceptance remain. Dialog [PR #6](https://github.com/hyvvs/lyceum/pull/6) merged at `3d5abaa` after Linux-hosted Verify/audit/secret scans passed.

## 2026-11-22 · M0-003 · Accessible Dialog slice underway
Done (on `m0/ui-dialog-storybook`, [draft PR #6](https://github.com/hyvvs/lyceum/pull/6)): added Radix Dialog 1.3.1 (MIT, about 107 KB unpacked) with React/ReactDOM peers, mandatory nonblank visible title/description, portal overlay, 44px semantic close button, opaque floating surface and high-contrast/forced-colors styling using existing tokens. Dialog forces modal focus containment; its public types and runtime guards reject `modal` overrides and unsupported multi-child `asChild` composition, with SSR regressions. Storybook covers default, hover, focus, long, empty, error, loading, disabled, RTL, light, high contrast, 200% text, reduced transparency and reduced motion. Playwright tests verify keyboard Tab/Shift-Tab containment, Escape, focus restoration, close/outside click, mobile scrolling, measured opaque theme text contrast, full-opacity high-contrast/reduced-transparency overlay and axe scans of all Dialog states. Shared axe helper retries only when the Storybook addon is already running axe; actual violations still fail the test.
Verified locally: `pnpm verify` (58 unit tests passed, 1 Windows symlink skip, four package typechecks, lint/boundaries/agentcheck clean), frozen install, unrestricted `pnpm audit` (no advisories), Storybook build, and 16 Playwright browser cases (8 Button + 8 Dialog) pass. Independent UX/architecture and security reviewers confirmed no remaining blockers after fixes to public-API guards, peer metadata and accessibility states. Vite's Storybook-only preview reports large-chunk warnings plus nonblocking `use client` directive notices from Radix's bundled client modules; these are not production app bundle metrics or a browser execution failure. Hosted CI is not yet verified for this branch at this entry.
Next: verify hosted Verify/audit/secret-scan for [PR #6](https://github.com/hyvvs/lyceum/pull/6) and merge only after green. M0-003 stays `[~]`; Tooltip, Tabs, Select, Toast, VisuallyHidden and FocusScope, real backdrop contrast sampling and broader performance acceptance still remain. No learner shell exists yet. Button [PR #5](https://github.com/hyvvs/lyceum/pull/5) merged at `4b5bb01` after hosted green checks.

## 2026-11-22 · M0-003 · Button, Storybook and browser accessibility slice
Done (on `m0/ui-button-storybook`, [draft PR #5](https://github.com/hyvvs/lyceum/pull/5)): added a native semantic React Button with Radix Slot composition, variants, 44px touch targets, focus styles, loading/disabled guards and safe default `type=button`; the `asChild` variant deliberately rejects disabled/loading usage (including at runtime) because child handlers run before the Slot handler. Added theme-aware CSS, Storybook 10.6.8 with a11y addon and runtime theme/transparency/contrast/motion/text-scale globals, Chromium Playwright 1.65.1/axe 4.14.0 tests, and browser steps in the existing Verify CI job. Real anchors navigate to in-page destinations; slotted native buttons verify both child and parent click handlers without misusing anchor actions.
Verified locally: frozen `pnpm install`, `pnpm verify` (boundaries, agentcheck, four package typechecks, 55 unit tests passed / 1 Windows-only symlink skip, Biome clean), unrestricted `pnpm audit` (no known vulnerabilities), Storybook static build, and 8 Playwright/axe browser checks (keyboard, touch target, 200% text, RTL, focus, loading/disabled, opaque light/dark border contrast, links, Slot composition, sampled axe stories) all pass. Hosted Linux CI is not yet verified at this entry.
Dependency decision: runtime `@radix-ui/react-slot@1.5.0` (MIT) and React 19.3.1 peer; dev-only React/ReactDOM, Storybook, Playwright (Apache-2.0) and axe tooling. `@axe-core/playwright`/`axe-core` are MPL-2.0 dev-only: review notices before distributing a Storybook static build, and never bundle axe in the learner app. A pinned pnpm override to `@joshwooding/vite-plugin-react-docgen-typescript@0.9.1` replaces vulnerable `glob`/`minimatch` via `tinyglobby`; no audit suppression. Retest/remove override when Storybook updates its declared dependency. Storybook-only preview triggers a Vite >500 kB chunk warning; this is not a learner-app size measurement.
Next: check hosted Verify/audit/secret-scan for [PR #5](https://github.com/hyvvs/lyceum/pull/5). M0-003 stays `[~]`: Dialog, Tooltip, Tabs, Select, Toast, VisuallyHidden, FocusScope, full story matrix/backdrop contrast, responsive and performance gates are still pending. No web shell or Today dashboard has been built. Renovate app owner authorization remains pending separately.

## 2026-11-22 · M0-003 · Theme foundation started
Done: on `m0/ui-theme-foundations`, added reusable spacing, rem-based type, touch-target, motion and solid-surface CSS tokens to `packages/ui/src/glass.css` without new dependencies; added system-light-mode defaults (including `data-theme=auto`), user high-contrast and transparency-off options, solid no-blur fallback preserving raised/float elevation, stronger light tertiary text, and five token-contract tests. Existing glass level/token names were preserved.
Verified: `pnpm verify` passes 35 tests, all four package typechecks and lint; `pnpm audit` has no known advisories. CSS contract tests pass, but this is only the first slice of M0-003: there are no React components, Storybook, browser contrast or keyboard tests yet. Worst-case backdrop contrast remains unproven; do not claim WCAG AA until browser pixel tests are run.
Decision: user authorized the proposed UI dependency stack in the 2026-11-22 follow-up; versions, licenses and audits must be checked before installation. No new font or imagery was chosen.
Next: merge PR #4 after fresh CI and implement accessible primitives with Storybook/Playwright a11y coverage.

## 2026-11-22 · M0-002 · Boundary checker hardening
Done: merged [M0-001 PR #1](https://github.com/hyvvs/lyceum/pull/1) into main (`1ae8592`). Extended the boundary checker using the existing TypeScript parser: block package imports from apps, deep or relative cross-package imports, forbidden core/gateway dependency edges (including dev/peer/optional dependencies), missing typecheck scripts in packages and apps, and direct nondeterministic calls in core (including computed properties), with source locations and regression fixtures. Source files outside `src` are scanned; source symlinks and escaping export paths are rejected.
Verified: local `pnpm verify` passes 44 tests in 10 files, with one Linux-only symlink fixture skipped on Windows due to OS permission restrictions; four package typechecks, agentcheck, boundaries and lint pass. Full `pnpm audit` reports no known vulnerabilities. Checker also covers `.d.ts` imports and rejects package export targets in unscanned build directories. Added `.gitattributes` for consistent LF checkouts on Windows.
Review decision: user authorized removal of unused exported `systemClock` convenience implementation (its `new Date()` violated the injected-clock invariant); `Clock` interface and `createRng` remain unchanged. [PR #3](https://github.com/hyvvs/lyceum/pull/3) passed all CI jobs and merged into main at `abc3cc0` on 2026-11-22. The existing `@lyceum/ui/glass.css` export needs reconciliation if a future consumer imports it directly; written policy requires index-only imports.
Next: continue M0-003 accessible UI primitives and the Storybook/Playwright quality gates.

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
