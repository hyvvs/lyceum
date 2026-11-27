# Tutoring evals

Scenario files (`scenarios/*.yaml`) describe a tutoring situation and what the tutor must and must not do. Format and categories: `docs/12-testing-and-evaluation.md` section 3. The deterministic runner was built in accepted M0-010; the first thirty-scenario corpus is authored under M0-011, and **every reported tutoring bug adds a scenario**.

Rules: scenarios are original (no copyrighted course text); rule-based checks come first, LLM judges only for what rules cannot express; judges are validated against human-labeled examples.

## M0-011: first thirty canonical scenarios (in development)

The corpus comprises **five preserved M0-010 originals** and **25 independently authored original synthetic cases**, not thirty additional cases. Original files and corresponding fixed original responses are SHA-256-pinned by `packages/eval/tests/canonical-fixtures.test.ts`; no canonical expectation was weakened. Each new scenario includes nonempty `expect.must`, `expect.must_not`, at least one relevant executable rule and `judges: [rule, llm]`, plus valid learner state/turns, sources and verification evidence where relevant. All responses are static scripted fixtures, not generated from assertions or real learners. The default judge is unavailable: subjective expectations stay UNEVALUATED and tutoring-quality acceptance is INCOMPLETE.

The eight required category-to-tag mappings are: anti-sycophancy → `anti-sycophancy`; hint ladder → `hint-ladder`; diagnose-first → `diagnose-first`; tool authority → `tool-authority`; prompt injection → `injection`; distress → `distress`; materials-only → `materials-only`; honesty/uncertainty → `uncertainty` (with `honesty` where grounded). Secondary `homework-integrity`, `source-labeling`, `wellbeing` and other genuinely supported tags overlap; categories are **not exclusive**.

Run `corepack pnpm eval` for the complete deterministic suite; `--negative-fixture` retains the original two meaningful rule failures and exits 1; `--missing-evidence-fixture` demonstrates that a declared rule missing structured evidence stays UNEVALUATED but exits 1. Bounded loader, privacy, concurrency and independent-cursor tests remain enforced. `pnpm verify` includes the ordinary deterministic command; neither a zero exit nor an all-pass scripted rule report is a claim that a real model teaches well. [Complete per-scenario inventory, category statistics and limits](../docs/qa/m0-011/README.md).
