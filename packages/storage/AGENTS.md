# packages/storage: scoped rules (adds to root AGENTS.md)

- In-memory storage is an injected, per-instance adapter, never a singleton.
- Only import the public `@lyceum/core` entry point; no package deep imports.
- Keep the in-memory adapter free of network, filesystem, browser persistence, telemetry, and credential interfaces.
- Use existing canonical `LyceumEventSchema` for read and write; never change event semantics or versions here.
- Validate JSON envelopes at the runtime boundary; never disclose learner values or IDs in errors.
- Events are append-only during ordinary operation. User-requested deletion is a future dedicated capability; do not simulate it by appending fake events.
- Tests use synthetic data and reusable public-interface contract suites. SQLite/native/WASM/OPFS and migrations are M0-007, not this task.
