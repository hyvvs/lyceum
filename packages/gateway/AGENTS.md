# packages/gateway: scoped rules (adds to the root AGENTS.md)

- This is the only package that may mention model vendors or wire formats. It depends on no other `@lyceum/*` package.
- Every adapter implements `ProviderAdapter` and passes the shared contract suite (completion, streaming, abort, errors, usage, structured output).
- Map HTTP and transport failures to `GatewayError` codes; never throw strings; honor `AbortSignal` and `retry-after`.
- Keys: never log, never put in errors, events, or exports; keys are bound to their provider's base URL; use the `KeyVault` port.
- No unofficial access to consumer ChatGPT or Claude accounts (ADR-0006). API keys and official flows only.
- Structured output uses the ladder in `docs/03` section 4; quality-critical tasks must not silently fall back to a weak model.
- Verify current provider API details from official docs at implementation time; do not rely on memory.
- Specs: `docs/03`, `docs/16`. Tests use a fake `fetch`; live tests are opt-in via `LYCEUM_TEST_*`.
