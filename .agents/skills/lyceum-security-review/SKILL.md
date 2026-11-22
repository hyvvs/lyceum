---
name: lyceum-security-review
description: Use for changes touching API keys, the key vault, logging, telemetry, file import, prompt-injection exposure, sandboxes, widgets, or dependencies on the Lyceum repo. Read-only review.
---

# Lyceum security review

Review only: do not edit files. Review the diff of the current branch against main (`git diff main...HEAD`). Output a prioritized list of BLOCKER, SHOULD-FIX, and NOTE items; each cites file and line and the rule it breaks. If everything is clean, say so and list what you checked. This works best in a fresh chat, separate from the one that wrote the code.

Read `docs/16-security-privacy.md` and `docs/03-model-gateway.md` sections 6 and 7 first.

Check: key handling (vault, base-URL binding, never in logs/exports/events/errors); logging of sensitive data; prompt-injection exposure (sources are data; no side-effecting tools driven by untrusted content); sandbox boundaries for Pyodide, code execution, and widgets; network allowlists and CSP; new dependencies (license, maintenance, postinstall scripts); telemetry (opt-in, no content); update and download integrity (checksums, signatures). Run the dependency audit and secret scan if configured and report real results.
