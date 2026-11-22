# packages/profile-math: scoped rules (adds to the root AGENTS.md)

- Subject logic for mathematics lives here and only here. Depends only on `@lyceum/core`.
- `verify` never throws; it returns `unverifiable` when it cannot check. Tools (SymPy via Pyodide in a worker, numeric spot checks) are authoritative over any model opinion.
- Deterministic: seeded generation, reproducible items; record `generator.templateId` and `seed`.
- Pass the profile conformance suite (`docs/04` section 3). Error tags must exist in `errorTaxonomy`.
- Need a core change? Do not make core math-aware; extend the `DomainProfile` interface and ask first.
- Specs: `docs/04`, `docs/07`.
