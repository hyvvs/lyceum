# ADR-0006: Provider account policy (ChatGPT / Claude consumer accounts)

- Status: accepted (policy); implementation gated
- Date: 2026-11-21

## Context
Learners want to "connect their ChatGPT account directly." Consumer subscriptions are not APIs. Third-party access typically needs an official delegated-access flow; unofficial approaches (session cookies, scraped tokens, reverse-engineered endpoints) violate vendor terms, break unpredictably, and put learner accounts and data at risk.

## Decision
1. Support **API keys** for all major vendors as the primary path.
2. **Never** implement unofficial access to consumer subscriptions.
3. Implement an account-based adapter **only** when the vendor documents an official third-party sign-in or delegated-access flow, and only after a human verifies the vendor's current terms and records the result here.
4. Such adapters use standard OAuth with PKCE, minimal scopes, secure token storage (same vault rules as keys), and sit behind a feature flag.
5. The UI explains the options honestly ("Use an API key" with setup help; "Sign in" where officially supported).

## Consequences
+ Safe, honest, durable. - Some learners expect "just log in with ChatGPT"; we provide clear guidance and OpenAI-compatible/local alternatives instead.

## Verification log
(Add dated entries when checking vendor offerings and terms; none yet.)
