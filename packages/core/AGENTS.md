# packages/core: scoped rules (adds to the root AGENTS.md)

- Subject-agnostic: no math, law, language, or any subject logic. Need something subject-specific? Extend `DomainProfile`.
- Pure and deterministic: no I/O, no `Date.now()`, `new Date()`, or `Math.random()`. Use the `Clock`, `Rng`, `EventStore`, `Storage` ports.
- Only dependency allowed: `zod`. No vendor or provider names anywhere.
- Events are immutable and versioned; add a new version plus an upcaster, never edit an old schema. Derived state must be rebuildable from events.
- Every algorithm records a version string. Parameters have defaults and tests.
- Tests: unit plus property-based (fast-check) for invariants; simulation tests live in `packages/eval`.
- Specs: `docs/05`, `docs/09`, `docs/11`. Run `pnpm verify` before finishing.
