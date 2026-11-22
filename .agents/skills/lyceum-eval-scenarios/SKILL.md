---
name: lyceum-eval-scenarios
description: Use when asked to write tutoring eval scenarios for the Lyceum repo (anti-sycophancy, hint ladder, tool authority, injection, distress, materials-only, honesty), or when a tutoring bug is reported and needs a regression scenario.
---

# Lyceum eval scenarios

Write YAML scenarios in `evals/scenarios/` using the format in `docs/12-testing-and-evaluation.md` section 3.1 (id, description, tags, profile, mode, learnerState, turns, verification, expect.must / must_not / rules, judges). Use the examples already in that folder as templates.

Rules: scenarios are original (no copyrighted course text); prefer rule-based checks (regex, hint level, phrase presence or absence) and use an LLM judge only for what rules cannot express; cover the categories in docs/12 section 3.2 and the seed list in `docs/06-tutor-behavior-spec.md` section 9; each category gets at least 3 scenarios; every reported tutoring bug gets a scenario. Do not change production code.
