---
name: lyceum-adr
description: Use when a significant decision needs recording on the Lyceum repo: a new dependency, architecture or interface change, algorithm swap, privacy or security decision, or a deviation from a spec. Drafts an ADR for a human to accept.
---

# Draft a Lyceum ADR

1. Copy `docs/adr/0000-template.md` to the next free number (`docs/adr/NNNN-short-title.md`; ADR-0007 is reserved for the local-runtime decision from task M0-009).
2. Fill context, options considered (with pros and cons), decision, consequences, and the conditions that would make us revisit it. Cite specs and spike results; no invented facts.
3. Set Status to `proposed`. Only the human lead sets `accepted`.
4. Add a one-line entry to the decision log in `docs/STATUS.md`.
