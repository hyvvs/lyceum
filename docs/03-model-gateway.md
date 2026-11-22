# 03. Model Gateway

The gateway lets the learner power Lyceum with **any** model: cloud keys, OpenAI-compatible endpoints, aggregators, local servers, personal endpoints, and models loaded directly in the app. The engine never knows which one is in use. Code: `packages/gateway`. A working OpenAI-compatible adapter, router, and tests already exist as the starting point.

## 1. Provider support matrix

| Provider family | How it connects | Auth | Milestone |
|---|---|---|---|
| **Anthropic (Claude)** | Native adapter (Messages API) | API key | M2 |
| **OpenAI** | Native adapter (Responses and/or Chat Completions) | API key | M2 |
| **ChatGPT / Claude consumer accounts** | Only via an *official* third-party sign-in flow if the vendor offers one. See section 6. | Official OAuth only | Gated, see ADR-0006 |
| **Google Gemini / Vertex AI** | Native adapter | API key / OAuth | M2 |
| **Azure OpenAI** | Adapter (deployment-based URLs, API version) | Key / Entra ID | M2 |
| **AWS Bedrock** | Adapter (SigV4 signing) | AWS credentials | M2 |
| **OpenRouter** | OpenAI-compatible adapter plus attribution headers and model catalog | API key | M2 (adapter exists) |
| **Any OpenAI-compatible endpoint** (Mistral, Groq, Together, Fireworks, DeepSeek, xAI, custom gateways, LiteLLM, etc.) | OpenAI-compatible adapter (base URL + optional key + custom headers) | Key / none | M0 (exists) |
| **Any Anthropic-compatible endpoint** | Anthropic adapter with custom base URL | Key | M2 |
| **Ollama** | OpenAI-compatible (`/v1`) and native API for model management | none | M0/M2 |
| **LM Studio, llama.cpp server, vLLM, LocalAI, Jan** | OpenAI-compatible adapter | none / key | M2 |
| **Personal endpoints** (home server, company proxy) | Custom base URL, headers, optional mTLS (desktop) | any | M2 |
| **Embedded local runtime (desktop)** | Managed llama.cpp sidecar loading GGUF files | none | M2 |
| **In-browser local runtime (web)** | WebGPU runtimes (WebLLM or Transformers.js) | none | experimental, M7 |

The learner can configure **many providers at once** and route by task tier.

## 2. Core interfaces

Already defined in `packages/gateway/src/types.ts`:

- `ProviderAdapter`: `capabilities()`, `listModels()`, `complete()`, `stream()`, `healthCheck()`.
- `Capabilities`: `streaming`, `jsonSchema`, `jsonMode`, `toolCalling`, `vision`, `reasoning`, `local`, `maxContextTokens`.
- `GatewayError` with codes: `auth`, `rate_limit`, `context_length`, `network`, `invalid_request`, `unsupported`, `provider`, `aborted`. `retryable` for `rate_limit`, `network`, `provider`.
- `ProviderRegistry` and `Routing` (task tier to provider and model, optional fallback) in `registry.ts`.

Additions required in M2:

- `EmbeddingAdapter` (separate interface): `embed(texts, signal)`; default is a **local** embedding model so ingestion works offline and private. Cloud embeddings are optional.
- `VisionInput` content parts (images) for handwriting and diagrams, gated by `capabilities.vision`.
- Tool-calling normalization (`tool` role, call/result parts) gated by `capabilities.toolCalling`.
- `ProviderProfile` persisted config: `{ id, kind, baseUrl, authRef, headers, enabledModels, overrides: Partial<Capabilities> }`. `authRef` points into the key vault; secrets are never stored in this record.

## 3. Task tiers and routing

The engine asks for a **tier**, never a model:

| Tier | Used for | Typical needs |
|---|---|---|
| `fast` | Rewording, hints at level 1 to 2, short feedback, classification, flashcard generation | Low latency, cheap, small local model is fine |
| `standard` | Explanations, Socratic dialogue, item generation, feedback | Good instruction following and structured output |
| `deep` | Open-ended grading, proof checking, curriculum and concept-graph building, verifier second pass, mock-exam assembly | Strongest reasoning available |

The learner maps each tier to a provider and model in Settings (with sensible auto-suggestions after a readiness test). A single model can serve all tiers. A `fallback` route is used on retryable failure, and **the learner is told** when a fallback is used.

**Rule:** quality-critical tasks (open-ended grading, verification second pass, concept graph building) declare a **minimum capability and certification level**. If the mapped model does not meet it, the app says so and offers choices; it never silently proceeds with a weak model.

## 4. Structured output ladder

Engine code expects validated objects. The gateway provides `generateObject(schema, request)` that tries, in order, what the model supports:

1. **Native schema mode** (`jsonSchema` capability): provider-enforced.
2. **JSON mode** (`jsonMode`): prompt with the schema, parse, validate.
3. **Grammar-constrained decoding** (local runtimes that support GBNF or JSON-schema constraints).
4. **Plain text with delimiters**: instruct, extract, validate.
5. **Repair loop**: on validation failure, send the error back once or twice ("your output failed validation: …; return only corrected JSON"); then fail with a typed error.

Every `generateObject` call returns either a validated value or a `GatewayError`/`ValidationError`; callers decide on fallback. Count and log (locally) repair rates per model; they feed the certification score.

## 5. Streaming, cancellation, retries

- Normalized `StreamEvent`s: `text`, `usage`, `done`. Reasoning/tool events added when needed.
- Every call accepts `AbortSignal`; aborting stops the network request and local generation.
- Retries: exponential backoff with jitter for `rate_limit`, `network`, `provider`; respect `retry-after`; never retry `auth`, `invalid_request`, `context_length` (handle context length by reducing context, see below).
- Timeouts per tier; slow local models get longer limits and show progress.
- **Context management:** the prompt assembler budgets tokens per section (constitution, learner summary, sources, history). On `context_length` errors it drops or summarizes lower-priority sections and retries once.
- **Concurrency limits** per provider to respect rate limits and local hardware.
- **Circuit breaker** per provider: after repeated failures, mark degraded and prefer the fallback for a cooldown.

## 6. Authentication and the account question

The learner wants to connect "ChatGPT accounts directly." Here is the rule, and why:

1. **API keys** (OpenAI, Anthropic, OpenRouter, others) are fully supported and are the main path.
2. **Consumer subscription accounts** (a ChatGPT or Claude.ai login) are *not* an API. Using them from a third-party app generally requires either an official OAuth/partner flow or unofficial methods such as extracting web session tokens or cookies. **Unofficial methods are forbidden** (AGENTS.md invariant 10): they break providers' terms, break without warning, and endanger the learner's account and data.
3. If and when a vendor offers an **official sign-in or delegated-access flow for third-party apps**, implement it as a separate adapter behind a feature flag, using the vendor's documented OAuth with PKCE, minimal scopes, and secure token storage. Before building it, a human must confirm the vendor's current terms (ADR-0006 process).
4. The UI still offers a friendly "Connect your ChatGPT/Claude account" entry that explains the options honestly: use an API key (with a link to how to get one), or sign in if an official flow is available.

Terms and offerings change. **Do not assume anything about a vendor's current policy; check it at implementation time and record the result in the ADR.**

## 7. Key management

| Platform | Storage | Notes |
|---|---|---|
| Desktop | OS keychain (macOS Keychain, Windows Credential Manager, Linux Secret Service) via Tauri | Preferred |
| Web | Encrypted vault in IndexedDB; key derived from a user passphrase (WebCrypto PBKDF2/Argon2 via WASM) or WebAuthn PRF where available; session-only option | Never plain text; never localStorage |

Rules: keys never appear in logs, error messages, exports, event payloads, crash reports, or the UI after entry (show last 4 characters only); keys are sent only to the provider they belong to (enforce by binding `authRef` to a base-URL allowlist per provider profile); export/backup excludes keys by default; "Test connection" never echoes the key; a "panic" action wipes all keys.

## 8. Local models

### 8.1 Local servers (any platform)
Ollama, LM Studio, llama.cpp server, vLLM, LocalAI, Jan: connect through the OpenAI-compatible adapter or provider-specific helpers. The app **auto-detects** common local ports on request, lists installed models, and explains setup if nothing is found. Ollama native API is used (when present) to list, pull, and delete models with progress.

### 8.2 Embedded runtime (desktop, "models loaded directly onto the app")
- A **model manager** screen: curated catalog of recommended models by hardware tier, plus "add your own GGUF file" and download by URL or Hugging Face repo.
- Downloads are resumable, show size and disk space, and **verify SHA-256** checksums. Models are stored in the app data directory; the learner can relocate it.
- A **hardware detector** (RAM, VRAM, CPU/GPU, Metal/CUDA/Vulkan) recommends model sizes and quantizations and warns before loading something that will not fit.
- Inference runs in a managed **llama.cpp sidecar** (server mode on a random localhost port with a per-session token, or via Rust bindings). It is exposed to the app through the same OpenAI-compatible adapter. Start/stop, memory use, and logs are visible.
- Supports grammar/JSON-schema constrained decoding for the structured-output ladder (rung 3).
- Multiple models can be installed; one chat model plus one embedding model loaded by default.

### 8.3 In-browser (web)
Experimental WebGPU runtime for small models and for local embeddings. Clearly labeled with expected speed and quality limits. The same adapter interface applies.

### 8.4 Quality honesty for small models
Small local models are often much weaker at tutoring, grading, and structured output. Therefore:
- Run the **readiness test** (section 9) and show results plainly.
- Mark features as **Full / Reduced / Unavailable** per model (for example, "Open-ended grading: Unavailable on this model; use a stronger model or self-check").
- Lean harder on tools and templates (math verification by SymPy does not need an LLM).

## 9. Model readiness test ("certification")

When a model is added or changed, the app offers a 1 to 3 minute **readiness test**: a fixed battery from `packages/eval` run against that model. It measures:

1. Structured-output validity rate and repair rate.
2. Instruction following (constitution adherence on a few mini-scenarios: no flattery, hint-ladder compliance).
3. Domain competence smoke tests (arithmetic/reasoning, subject-specific if a profile is active).
4. Grading agreement with reference scores on a few anchor answers.
5. Latency and throughput.

Output: capability flags, a per-feature availability table (Full/Reduced/Unavailable), recommended tier assignments, and warnings. Results are stored with the model's identity and re-run on request. The same battery runs in CI against reference providers when keys are available.

## 10. Privacy transparency

- Every provider profile has a visible **data destination badge**: "On this device", "Your network", or "Cloud: <host>".
- Before the first cloud send for a subject, show what categories of data will be sent (messages, excerpts of materials, attempts) and let the learner choose "Local models only" mode, which blocks all non-local providers.
- The Models screen shows a local, searchable **usage ledger**: tokens in and out per provider and tier (no content), helpful for self-managing limits.
- Optional **redaction** of names and emails in prompts for cloud providers.

## 11. Testing the gateway

- Unit tests with fake `fetch` (see the existing adapter tests).
- **Contract tests** run the same suite against every adapter: completion, streaming, abort, error mapping, structured-output ladder, usage reporting. Recorded fixtures by default; live mode when `LYCEUM_TEST_*` keys are set.
- Fault injection: slow streams, truncated SSE, invalid JSON, 429 with `retry-after`, mid-stream disconnect.
- Fuzz the SSE and JSON parsers.

## 12. Deliverables by milestone

- **M0:** OpenAI-compatible adapter, registry, routing, tests (done in scaffold).
- **M2:** all native adapters, `generateObject` ladder, key vault (desktop and web), provider management UI, local server detection, model manager and embedded runtime (desktop), embedding adapter, readiness test, privacy badges and local-only mode, contract test suite.
- **M7:** experimental in-browser runtime; any officially available account-based flows (gated, per ADR-0006).
