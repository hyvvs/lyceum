# ADR-0004: Gateway ports and task tiers

- Status: accepted
- Date: 2026-11-21

## Context
Learners will connect many provider types. Engine code must not depend on any vendor and must degrade gracefully on weak models.

## Decision
All model access goes through `ProviderAdapter` (types in `packages/gateway`). The engine requests a **task tier** (`fast`, `standard`, `deep`), mapped by the learner to provider and model. Structured outputs use a ladder (native schema, JSON mode, grammar, delimiters, repair). Quality-critical tasks declare minimum capability; the app never silently downgrades. A readiness test certifies models and produces per-feature availability.

## Consequences
+ Vendor independence, honest capability handling, testable via contract suites.
- More up-front design; adapters must normalize streaming, errors, usage, and tool calls.
