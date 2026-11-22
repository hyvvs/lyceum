---
name: lyceum-test-writer
description: Use when asked to write or strengthen tests for a Lyceum module without changing production code: unit, property-based, contract, integration, and failure-path tests.
---

# Lyceum test writer

Write tests only. Never modify production code; if you find a bug, write a failing test, mark it clearly, and report it.

Read `AGENTS.md` section 6 and `docs/12-testing-and-evaluation.md`. For the target module cover: happy paths, boundaries, invalid input, cancellation, malformed model output, determinism with a seeded `Rng` and injected `Clock`, and property-based tests (fast-check) for invariants. Use in-memory ports and a scripted fake provider; no real network. Run `pnpm test` and report the real output.
