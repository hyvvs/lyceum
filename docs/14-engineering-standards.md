# 14. Engineering Standards

Complements `AGENTS.md` (the rules) with detail (the how). If you find a conflict, `AGENTS.md` wins.

## 1. Language and compiler settings

TypeScript strict. Enabled in `tsconfig.base.json`: `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`, `verbatimModuleSyntax`, `isolatedModules`. Target ES2022. ESM only. Do not weaken compiler flags to fix an error.

## 2. Code design

- **Ports and adapters:** engine code depends on interfaces; implementations are injected at the edges (apps, tests).
- **Pure core, effects at the edges:** functions take data and return data; side effects live in adapters and use cases.
- **Discriminated unions** for variants (events, stream events, verification results). Exhaustive `switch` with a `never` check.
- **Result handling:** expected failures use typed errors or result types; don't use exceptions for control flow in hot paths. Never throw strings.
- **Immutability:** treat inputs as readonly; return new values.
- **Small modules:** under roughly 300 lines; one responsibility; named exports (default exports only where a framework requires).
- **Naming:** learning vocabulary (`mastery`, `retrievability`, `hintLevel`, `conceptId`) over technical vocabulary. Booleans read as predicates (`isDue`, `hasPrerequisites`).
- **Public API discipline:** each package exposes only what `index.ts` exports; internals stay internal. Breaking an exported type requires updating all call sites and docs in the same PR.
- **Validation at boundaries:** zod parse at I/O boundaries (storage reads, model output, imports, worker messages, user input).
- **Time and randomness:** only through `Clock` and `Rng`.
- **Cancellation:** `AbortSignal` through every async chain that can take more than a few hundred milliseconds.
- **Concurrency:** bounded; use queues; avoid shared mutable state; the engine worker is the single writer to the event store.

## 3. UI standards

- Components live in `packages/ui` with Storybook stories for every state (default, hover, focus, disabled, loading, error, empty, long text, RTL, dark, high contrast, 200% text).
- Accessibility first: semantic elements, labeled controls, focus management, live regions for streamed content (throttled), keyboard shortcuts documented.
- Styling via tokens only (`packages/ui/src/glass.css`); no hard-coded colors, blurs, spacing, or font sizes in app code.
- Animation via the presets in `packages/ui/src/motion.ts` only, using `LazyMotion` (`domAnimation`) and `MotionConfig reducedMotion="user"`; animate transform/opacity (and small-element filter) only; never animate `backdrop-filter` radius; max about 6 blurred layers visible; no nested blur (docs/18 sections 6 and 8).
- State: server/derived state through TanStack Query over the application layer; local UI state with Zustand or component state; no business logic in components.
- Heavy modules lazy-loaded; route-level code splitting; virtualization for long lists.
- All strings through i18next (ICU); no concatenated sentences; plural and gender safe.
- Motion respects `prefers-reduced-motion`.

## 4. Error handling and messages

User-facing errors are written in the tutor tone: say what happened, why if known, and what to do next, with action buttons. Internal error types carry codes; a central mapper translates codes to messages and recovery actions. Unknown errors show a calm generic message plus a "copy diagnostics" action (diagnostics exclude content and secrets).

## 5. Logging and diagnostics

Structured, leveled logs (`error`, `warn`, `info`, `debug`) via a logger port. Never log prompts, responses, learner answers, uploaded content, or keys above `debug`; `debug` is off in production. A local diagnostics panel shows recent errors and provider health. Telemetry is opt-in, anonymous, aggregate, and contains no content (see docs/16).

## 6. Dependencies

Prefer the standard library and small utilities. Before adding: check license (MIT, Apache-2.0, BSD, ISC preferred; flag GPL/AGPL/unknown), maintenance activity, bundle size, security history, and whether it runs in both browser and desktop. Pin versions via lockfile; renovate updates weekly; run `pnpm audit` in CI. Heavy runtime pieces (Pyodide, local inference) are lazy-loaded and isolated in workers.

## 7. Git, branches, reviews

- Trunk-based development; short-lived branches `m<milestone>/<area>-<description>`.
- Conventional Commits. Squash merge. Keep `main` always releasable.
- PRs under about 400 changed lines; one logical change; link the task card.
- Reviews check: correctness, invariants, tests, docs, naming, security, UX checklist (UI), pedagogy checklist (tutor).
- Authors resolve all comments; reviewers re-check after changes; no self-merge on changes touching invariants.

## 8. CI pipeline (stages)

1. Install with frozen lockfile.
2. `pnpm boundaries`.
3. Typecheck.
4. Lint and format check.
5. Unit, property, contract, integration tests.
6. Build web and desktop shells.
7. Playwright e2e (web; desktop on schedule and before release).
8. Accessibility checks (axe).
9. Eval suite (fast deterministic subset on PRs; full nightly).
10. Bundle size and performance budget checks.
11. Security: dependency audit, secret scan, license check.
12. Artifacts: Storybook, coverage, eval reports.

Merging requires all required stages green. Flaky tests are quarantined with an issue and fixed within a week.

## 9. Documentation as code

Specs in `docs/` change in the same PR as behavior. ADRs record significant decisions (template in `docs/adr/0000-template.md`). Public interfaces have doc comments. Keep `docs/STATUS.md` current. Docs must be accurate; wrong docs are bugs.

## 10. ADR process

Write an ADR for: new dependency of significance, architecture or interface changes, algorithm swaps, privacy/security-affecting decisions, and deviations from specs. Format: context, options considered, decision, consequences, and revisit conditions. Status: proposed, accepted, superseded. Humans accept ADRs; agents draft them.

## 11. Feature flags and experiments

A local flag registry (typed, documented, with owners and removal dates). Flags guard unfinished features and gated integrations (for example account-based providers). No permanent flags; remove after rollout.

## 12. Performance engineering

Budgets in docs/01 are tests, not aspirations. Add benchmarks for hot paths (event append, projection fold, retrieval, verification). Profile before optimizing. Avoid main-thread work; use workers. Cache derived and generated content with explicit invalidation.

## 13. Internationalization

All learner-facing text localizable; tutor output language is a prompt parameter (not hard-coded to English); numbers, dates, and units locale-aware; layout supports RTL; math notation conventions (for example decimal comma) configurable per locale and per course materials.

## 14. Release engineering

Semantic versions; signed desktop builds with auto-update (staged rollout, rollback ability); web PWA with versioned service worker and safe update flow; pre-migration automatic backup/export prompt; changelog generated from Conventional Commits and curated.

## 15. Code review checklists

**Engine/gateway:** invariants hold; ports used; validation at boundaries; cancellation; typed errors; no vendor leakage; tests include failures; determinism.
**Tutor/prompts:** constitution intact; hint ladder honored; no flattery; source labels; injection-safe; schema validated; eval scenarios added.
**UI:** UX checklist in docs/01 section 9; performance and a11y verified.
**Security:** secrets, logging, sandbox, supply chain, permissions.
