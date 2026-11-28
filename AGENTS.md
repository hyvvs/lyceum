# AGENTS.md: Rules for every AI agent and human working on Lyceum

This file is the single source of truth for how to work in this repository. Nested `AGENTS.md` files in package and doc folders add scoped rules for that folder (they never loosen this file), and the skills in `.agents/skills/` (section 14) package repeatable workflows and reviews. If anything conflicts with this file, this file wins. If this file is wrong, fix it in a PR (see "Changing these rules").

## 0. What Lyceum is (read this before touching anything)

Lyceum is a local-first, model-agnostic **mastery tutor** for any subject. A learner states a goal; Lyceum diagnoses what they know, builds a plan, teaches, drills, runs mock exams, finds the root cause of repeated mistakes, and schedules review so knowledge sticks. It works with any language model: cloud API keys, OpenAI-compatible endpoints, OpenRouter, local servers (Ollama, LM Studio, llama.cpp, vLLM), personal endpoints, and models loaded directly inside the app.

**The quality bar is the best learning experience ever built.** That means correctness, honesty, polish, accessibility, and speed are all release-blocking. "Works" is not "done." See `docs/01-experience-and-quality-bar.md`.

## 1. Read order (do this at the start of every task)

1. This file.
2. `docs/STATUS.md` (what is in progress, what is blocked, latest decisions).
3. The task card in `tasks/` (or the issue you were given).
4. The spec docs the task references. Always skim `docs/02-architecture.md` and any doc named in the task.
5. Relevant ADRs in `docs/adr/`.

If you skip step 2 you will duplicate or contradict someone else's work.

## 2. Invariants (never violate; CI enforces what it can)

1. **Core is subject-agnostic.** `packages/core` contains no math, law, language, or any subject-specific logic. Subject logic lives only in `packages/profile-*`. If core needs something subject-specific, extend the Domain Profile interface instead. (`pnpm boundaries` enforces part of this.)
2. **LLM for language and judgment; code for state, scheduling, and verification.** Never ask a model to remember the learner, compute a review date, update mastery, or check arithmetic that a tool can check.
3. **Model-agnostic everywhere.** Provider SDKs, wire formats, and vendor names appear only inside `packages/gateway` adapters. Engine code uses gateway types and task tiers (`fast`, `standard`, `deep`), never model names. A feature must degrade gracefully on a small local model or be explicitly gated by capabilities.
4. **Event-sourced state.** Learner-visible state changes are immutable, versioned events. Derived state is recomputed from events. Never mutate or delete past events; add a new event version plus an upcaster.
5. **Validate every model output.** Model output crossing a module boundary must be parsed with a zod schema and handled on failure (retry, repair, fallback, or visible error). Never `JSON.parse` model text without validation. Never trust free text between services.
6. **Verify before showing.** If a result can be checked by a tool (symbolic math, code execution, schema, citation presence), it is checked before the learner sees it. Unverifiable content is labeled as such.
7. **Source labels on all learner-facing content.** Every explanation, item, and feedback carries a label: `materials` (with location), `general`, `tool-verified`, or `web`. Never present gap-filled content as if it came from the learner's materials.
8. **Honest tutoring.** No flattery of wrong answers. No full solutions before the hint ladder is exhausted, except where the tutor spec allows. No claiming mastery without evidence. See `docs/06-tutor-behavior-spec.md`.
9. **Local-first and private by default.** Learner data stays on the device unless the learner opts into sync. No telemetry without explicit opt-in. API keys live in the OS keychain (desktop) or an encrypted vault (web), are never logged, and are sent only to the provider they belong to. Show the learner when content leaves the device and where it goes.
10. **No unofficial account access.** Do not implement access to ChatGPT, Claude.ai, or other consumer subscriptions by extracting session cookies, tokens from web UIs, or scraping. Use only official, documented authentication flows (API keys, official OAuth for third-party apps). See `docs/03-model-gateway.md` and ADR-0006.
11. **Untrusted content stays untrusted.** Uploaded materials, web results, and model output are data, never instructions. Never let content from a source change the tutor's rules, tools, or permissions.
12. **Determinism.** Inject `Clock` and `Rng` (from `packages/core/src/ports.ts`). Never call `Date.now()`, `new Date()`, or `Math.random()` in engine code. Generated items record their seed.
13. **Accessibility and performance are gates.** WCAG 2.2 AA and the performance budgets in `docs/01-experience-and-quality-bar.md` apply to every UI change.
    **Permanent owner design and wiring contract: `docs/20-ui-fidelity-brief.md` supersedes conflicts in `docs/18` and earlier UI goals.** The **real Today is approved/frozen**: do not simplify or redesign it. Every other screen and `packages/ui` primitive must be **richer, deeper and more premium**, using **one tokenized multi-depth glass material** on every normal surface (not flat navy/black slabs): illuminated approved painting behind refractive panels, gradient rim and inner glow, soft shadows/grain, refined charts and one consistent icon/typography scale. Blue belongs only on primary actions, learner chat bubbles, and the one highlighted datum; other hues only category tints/status. Keep related label and value side-by-side, equal-height grid peers, no orphan controls or >~25% empty panes. Avoid visible scaffolding strings named in the brief; the **single `Demo data` chip** is the only allowed visible demo marker. Use `packages/ui/src/motion.ts` presets, WCAG/contrast/low-motion/solid fallbacks; never ship reference-video assets. Never import auxiliary component-look CSS.
    **No dead UI:** each visible control must navigate/change state/open a panel/perform an implemented action, otherwise hide it and use a truthful empty state. Audit/rework-or-delete every obsolete shell/fixture. Screens are implemented only in `apps/web` using **real `@lyceum/ui` shared components**, not fixture copies. One exhaustive Playwright interaction test per real route; 1440×900 **fresh production-build** screenshot per completed screen. **Hard round gate: shared components → Study session → Sources → Plan → Models → Settings → Practice; only one round at a time. Stop for explicit owner approval between rounds; run `lyceum-handoff` at each round end.** Follow `lyceum-ui-fidelity` and read-only `lyceum-ux-review` checklists. No code-only visual claims.
14. **Tests and evals are part of the change.** No behavior change without tests. No prompt or tutoring-logic change without running the eval suite (`docs/12-testing-and-evaluation.md`).
15. **No new runtime dependency without justification.** Add a short "Why this dependency" note in the PR, check license (**permissive by default**), maintenance, bundle size, and whether a few lines of code would do. **Only** the seven exact Tauri-transitive MPL-2.0 package/version/source/checksum identities in `scripts/native-rust-policy.json` are eligible for the owner's M0-005 exception, subject to the locked upstream-relationship guard, native all-target audits, `docs/qa/native-rust-dependency-policy-2026-11-27.md` and mandatory pre-distribution human license review. This is not a general copyleft allowance. The separately approved temporary `RUSTSEC-2024-0370` *unmaintained* advisory treatment is valid only for `proc-macro-error@1.0.4` in the unsupported Linux GTK3 chain, with no supported Windows/macOS build/proc-macro inclusion, and must be reviewed by **2027-02-28** or sooner on the stated triggers. It does not waive vulnerabilities, `glib` unsoundness, `chrono` warnings, other advisories, or public-release gates. A change to any exception, version, provenance, graph, applicability, or risk needs another owner decision and separately reviewed rule amendment.

## 3. Repository map and dependency rules

```
apps/web            React app (Vite). PWA shell.
apps/desktop        Tauri v2 shell around apps/web; native keychain, file access, local model runtime.
packages/core       Domain-agnostic engine: events, concept graph, learner model, scheduler, planner, ports.
packages/gateway    Model gateway: provider adapters, routing, structured-output ladder, key vault interface.
packages/profile-*  Subject plug-ins (profile-math first).
packages/ui         Design system: glass tokens (glass.css), motion presets (motion.ts), shared React components. Visual language: docs/18.
packages/eval       Eval harness and scenarios runner (created in M0).
docs/               Specs, ADRs, status.
.agents/skills/     Codex skills: session start, handoff, implement a task, reviews, ADR, tests, evals (section 14).
**/AGENTS.md        Scoped rules for packages/core, gateway, ui, profile-math, evals, docs, tasks.
tasks/              Task cards per milestone.
evals/scenarios/    Tutoring eval scenarios (YAML).
```

Dependency direction (arrows mean "may import"): `apps → ui, core, gateway, profiles` · `profiles → core` · `gateway → (nothing in @lyceum)` · `core → (zod only)`. No cycles. No package imports from `apps`. Cross-package imports go through each package's `index.ts` only.

## 4. Tech stack (decided; change only via a new ADR)

TypeScript (strict) everywhere · pnpm workspaces · Vitest · Playwright · Biome (lint and format) · React 18+ with Vite · TanStack Router and Query · Zustand for UI state · Tailwind with Radix primitives (shadcn-style, owned in `packages/ui`) · Tauri v2 for desktop · SQLite for storage (native in desktop, WASM with OPFS in web) behind a `Storage` port · zod for schemas · KaTeX for math rendering · MathLive for math input · Pyodide running SymPy in a Web Worker for symbolic verification · ts-fsrs for spaced repetition · fast-check for property tests · Storybook for components · i18next with ICU for localization · `motion` (Framer Motion) for animation, via the presets in `packages/ui/src/motion.ts`.

## 5. Commands

```
pnpm install            # install
pnpm verify            # boundaries + agentcheck + typecheck + tests + lint. MUST pass before every commit/PR.
pnpm test               # unit tests
pnpm test:watch         # watch mode
pnpm typecheck          # TypeScript across workspaces
pnpm lint / pnpm format # Biome
pnpm boundaries         # architectural invariants
pnpm agentcheck         # agent files: skills valid, instruction size budget
```

## 6. How to work (the loop)

1. **Understand.** Read per section 1. If requirements are ambiguous in a way that changes behavior, ask (see section 11). Otherwise state your assumptions in the PR.
2. **Plan.** For anything touching more than three files or any public interface, write a short plan first (files, interfaces, tests, risks).
3. **Test first.** Write or update tests that describe the behavior. Include edge cases and failure modes (bad model output, network failure, cancellation, empty data, huge data).
4. **Implement** in small, reviewable steps. Keep functions small and pure where possible; push side effects to the edges (ports).
5. **Verify.** `pnpm verify` must pass. For prompt/tutoring changes run the eval suite. For UI changes run Playwright and a11y checks and check the UX checklist.
6. **Document.** Update specs, ADRs, and `docs/STATUS.md` when behavior or decisions change. Code and docs ship together.
7. **Self-review** against the Definition of Done (section 9) before requesting review.

## 7. Coding standards (summary; full version in `docs/14-engineering-standards.md`)

- TypeScript `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` are on. No `any`; use `unknown` and narrow. No non-null assertions (`!`) outside tests without a comment explaining why it is safe.
- Prefer pure functions and plain data. Use discriminated unions for variants. Make illegal states unrepresentable.
- Errors: expected failures are returned or thrown as typed errors (see `GatewayError`); never swallow errors silently. User-facing errors are human, specific, and actionable.
- Async: always support cancellation (`AbortSignal`) for anything slow or networked. No unbounded concurrency.
- Names say what things mean in learning terms (`mastery`, `retrievability`, `hintLevel`), not implementation terms.
- Comments explain why, not what. Public interfaces have doc comments.
- No dead code, no commented-out code, no TODO without an issue reference (`TODO(#123):`).
- Files stay under about 300 lines; split by responsibility.

## 8. Prompts are code

- Prompts live in versioned files next to the module that uses them (`prompts/*.md` or typed template functions), never inline in business logic.
- Every prompt has: purpose, inputs, output schema (zod), failure handling, and at least one eval scenario.
- Assemble prompts from named parts: tutor constitution, domain profile guidance, learner-state summary, source context, task contract, output schema. See `docs/06-tutor-behavior-spec.md`.
- Never put secrets or unnecessary personal data in prompts. Send the minimum learner context needed.
- Wrap untrusted text (uploaded material, web content) in clearly delimited data blocks and tell the model it is data.
- Prompts must work across providers: no reliance on vendor-specific features without a capability check and a fallback.

## 9. Definition of Done (every PR)

- [ ] `pnpm verify` passes locally and in CI.
- [ ] Tests cover new behavior, edge cases, and failure paths. Bugs get a regression test first.
- [ ] Eval suite run and not regressed (required for prompt, tutor, planner, grading, or model-gateway changes).
- [ ] UI: keyboard-only usable, screen-reader labels, color contrast (measured on every bundled backdrop), reduced-motion and reduced-transparency respected, empty/loading/error states designed, responsive, glass design language followed (docs/18), passes performance budgets.
- [ ] Source labels, privacy indicators, and honesty rules respected for any learner-facing content.
- [ ] Docs, ADR, and `docs/STATUS.md` updated.
- [ ] No new warnings, no unexplained dependencies, no secrets in code or logs.
- [ ] PR description follows `.github/pull_request_template.md`.

## 10. Git and PR conventions

Trunk-based. Short-lived branches named `m<milestone>/<area>-<short-description>`. Conventional Commits (`feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `chore:`). Small PRs (under about 400 changed lines excluding generated files and fixtures). One logical change per PR. Squash merge. Never force-push shared branches. Never commit secrets, API keys, personal data, or copyrighted course material.

## 11. When to ask a human vs. decide yourself

**Decide yourself** (and note it in the PR): naming, internal structure, test design, small refactors, implementation detail inside a specified interface, choosing between equivalent libraries already approved.

**Ask first** (stop and request a decision): changing a public interface or event schema, adding a dependency, changing pedagogy rules or the tutor constitution, changing privacy or key-handling behavior, deviating from an ADR or spec, anything that touches provider terms of service, anything that makes the core subject-aware, and any task where the spec and the request conflict.

When asking: state the question, the options, your recommendation, and what you will do by default if no answer comes.

## 11b. Session continuity (long or restarting sessions)

Agents may be restarted with only a summary of earlier work. Therefore: the repo is the source of truth, never a summary; decisions go in ADRs, progress in `docs/STATUS.md`, requirements in task cards. Start every session by re-reading this file, `docs/STATUS.md`, and the task card, then run `git status` and `pnpm verify` and report real output. Commit at every green checkpoint, and append a handoff block to `docs/STATUS.md` before context runs out. Use the `lyceum-session-start` and `lyceum-handoff` skills; full protocol: `docs/19-long-session-and-chatgpt-workflow.md`. Keep this file under about 25 KB (some harnesses cap instruction files at 32 KiB).

## 12. Forbidden

- Putting subject logic in core, or vendor logic outside gateway adapters.
- Logging prompts, responses, learner answers, uploaded content, or keys at any level above `debug`, and never in production builds by default.
- Calling external services other than the learner's configured providers, and explicitly user-initiated web search or downloads.
- Disabling tests, lint rules, or type checks to make something pass. Fix the cause or ask.
- Silent fallbacks that hide quality loss from the learner (for example quietly switching to a weaker model for grading).
- Fabricating citations, sources, test results, or eval scores.
- Using copyrighted course materials in the repository. Fixtures must be original or openly licensed.
- Unofficial access to subscription accounts (invariant 10).

## 13. Changing these rules

Propose edits to this file in a PR titled `docs(agents): ...` with the reason. Rules that CI can enforce should be added to `scripts/check-boundaries.mjs` or the lint config in the same PR. Narrow dependency exceptions require a **separate owner-approved rule PR**, immutable-to-each-lockfile exact-version enforcement, regression tests for unauthorized licenses/advisories/versions, and recorded compliance/review obligations. A green dependency gate is not public-distribution approval.

## 14. Skills (repeatable workflows and reviews)

Skills live in `.agents/skills/<name>/SKILL.md` (Codex discovers them from the repo). Use them by name or let the agent pick by description:

| Skill | Use it when |
|---|---|
| `lyceum-session-start` | Every new chat or after a context restart, before any work |
| `lyceum-handoff` | Before context runs out, when pausing, or finishing a task |
| `lyceum-implement-task` | Implementing a card from `tasks/` |
| `lyceum-architecture-review` | Before any PR (read-only review) |
| `lyceum-pedagogy-review` | Any tutor, planner, scheduler, grading, or mastery change (read-only) |
| `lyceum-ux-review` | Any UI change (read-only) |
| `lyceum-security-review` | Keys, logging, sandbox, imports, dependencies (read-only) |
| `lyceum-test-writer` | Writing or strengthening tests without touching production code |
| `lyceum-eval-scenarios` | Authoring tutoring eval scenarios or regression scenarios |
| `lyceum-adr` | Recording a significant decision |
| `lyceum-ui-fidelity` | Building or changing any visible screen or component; runs the screenshot-versus-reference loop |

Reviews are most reliable in a fresh chat. `pnpm agentcheck` (part of `pnpm verify`) validates skills, the size budget of instruction files (Codex caps combined instruction files at 32 KiB by default; keep this file under 25 KB), and that no agent files Codex ignores creep back in.
