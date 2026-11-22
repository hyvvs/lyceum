# M2 Model gateway: task cards

Roadmap reference: M2. All code in `packages/gateway` (plus UI cards in apps). Reuse the existing `types.ts`, `registry.ts`, and OpenAI-compatible adapter.

### [ ] M2-001 Adapter contract suite
Depends on: M0 · Context: docs/03 section 11
Requirements: reusable suite (completion, streaming, abort, error mapping, usage, structured output) taking an adapter factory plus a fixture server; recorded fixtures; live mode behind `LYCEUM_TEST_*`.
Acceptance: existing OpenAI-compatible adapter passes; suite documented for adapter authors.

### [ ] M2-002 `generateObject` structured-output ladder
Depends on: M2-001 · Context: docs/03 section 4
Requirements: ladder implementation (native schema, JSON mode, grammar hook, delimiters, repair loop); zod-driven; typed `ValidationError`; repair-rate and validity counters (local, no content).
Acceptance: fuzz tests with invalid/partial JSON; works against fake models exhibiting each failure mode.

### [ ] M2-003 Anthropic adapter
Depends on: M2-001 · Requirements: Messages API incl. streaming, system prompts, usage, vision (capability flag), structured output via supported mechanism or ladder, custom base URL, error mapping.
Acceptance: contract suite green; browser/desktop transport notes documented. Verify current API details from official docs at implementation time.

### [ ] M2-004 OpenAI adapter (native)
Depends on: M2-001 · Requirements: current official API surface chosen and justified in the PR; streaming, structured outputs, vision, usage; error mapping.
Acceptance: contract suite green. Verify current API details from official docs at implementation time.

### [ ] M2-005 Gemini/Vertex, Azure OpenAI, Bedrock adapters
Depends on: M2-001 · Requirements: one adapter per card or sub-PR; auth variants (key, OAuth, SigV4 signing in a small audited module); region/deployment configs.
Acceptance: contract suite green per adapter (fixtures); credentials only through the vault.

### [ ] M2-006 OpenRouter and compatible-provider presets
Depends on: existing adapter · Requirements: presets (base URL, headers, capability hints) for OpenRouter, Groq, Together, Fireworks, Mistral, DeepSeek, xAI, LM Studio, vLLM, llama.cpp server, LocalAI, Jan; model catalog fetch for OpenRouter; capability override UI contract.
Acceptance: preset data validated by tests; connect-and-list-models smoke tests with fixtures.

### [ ] M2-007 Ollama integration
Depends on: M2-001 · Requirements: native API for list/pull/delete with progress and cancellation; OpenAI-compatible chat path; auto-detection of default port; helpful setup errors.
Acceptance: works against a real local Ollama in a manual test script and against fixtures in CI.

### [ ] M2-008 Key vault (desktop + web)
Depends on: M0-005, M0-004 · Context: docs/03 section 7, docs/16 section 5
Requirements: `KeyVault` port; Tauri keychain implementation; web encrypted IndexedDB vault with passphrase and WebAuthn PRF option; session-only mode; base-URL binding enforced at call time; panic wipe; last-4 display.
Acceptance: unit and integration tests; automated scan that keys never appear in logs, events, exports, or errors; security review passed.

### [ ] M2-009 Routing, fallback, circuit breaker, concurrency limits
Depends on: existing registry · Context: docs/03 sections 3 and 5
Requirements: tier routing with fallback announcement events; per-provider concurrency and rate-limit handling; retry with jitter honoring `retry-after`; circuit breaker; minimum-capability gates for quality-critical tasks.
Acceptance: fault-injection tests (429, mid-stream disconnect, slow stream); fallback is never silent.

### [ ] M2-010 Embedding adapter and local embeddings
Depends on: M0-004 · Requirements: `EmbeddingAdapter` port; local default model via ONNX/Transformers.js (web) and native option (desktop); batch and cancel; dimension metadata.
Acceptance: deterministic embedding tests; offline operation; speed benchmark recorded.

### [ ] M2-011 Embedded llama.cpp runtime (desktop)
Depends on: M0-009, ADR-0007 · Context: docs/03 section 8.2
Requirements: managed sidecar (start/stop/health, random port, session token), model manager (catalog, add GGUF, download with resume and SHA-256 verification), hardware detector and recommendations, grammar/JSON-schema constrained decoding hook, memory/log visibility.
Acceptance: end-to-end test on at least two OSes; resource cleanup on exit; corrupted download is rejected.

### [ ] M2-012 Model readiness test (certification)
Depends on: M0-010, M2-002 · Context: docs/03 section 9
Requirements: fast battery (structured output, instruction following, anchor grading, latency) producing capability flags and Full/Reduced/Unavailable per feature plus tier recommendations; results stored as events (`model.readiness_tested`).
Acceptance: reference models yield stable results across runs; weak models degrade features honestly.

### [ ] M2-013 Provider management UI
Depends on: M0-003, M2-006, M2-008, M2-012 · Context: docs/01 section 2 (Models)
Requirements: add/test/remove providers, capability display, tier routing editor, data-destination badges, local-only mode, usage ledger, local server detection, model manager screen, friendly error states.
Acceptance: UX checklist passed; a11y clean; Playwright flow for adding a local and a cloud provider.

### [ ] M2-014 Account-flow investigation (gated)
Depends on: none · Context: ADR-0006
Requirements: a human-led investigation of any officially documented third-party sign-in flows from major vendors; record findings and terms in ADR-0006's verification log. **No code until the human approves.**
Acceptance: ADR updated with dated findings and a go/no-go per vendor.
