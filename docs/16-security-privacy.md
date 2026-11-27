# 16. Security and Privacy

Learners trust Lyceum with their goals, struggles, materials, and API keys. Security and privacy are product features, and they shape the architecture (local-first).

## 1. Principles

1. **Local by default.** Data stays on the device unless the learner sends it to a provider they configured or enables sync.
2. **Minimum necessary.** Send providers only the context needed for the task.
3. **Transparency.** The learner can always see where content goes (destination badges, usage ledger).
4. **No hidden telemetry.** Opt-in only; content never included.
5. **Defense in depth** for untrusted content and extensions.
6. **Learner control:** export, delete, local-only mode, and key wipe are always available.

## 2. Assets and threats (threat model summary)

| Asset | Threats | Mitigations |
|---|---|---|
| **API keys** | Theft from disk, logs, exports, XSS, malicious extension, sending to the wrong host | OS keychain / encrypted vault, base-URL binding, never log, never export, CSP, sandboxed widgets, panic wipe |
| **Learner data (events, answers, goals)** | Disk theft, malware, shared computer, accidental upload | Optional at-rest encryption, local-only mode, clear delete/export, no server by default |
| **Uploaded materials** | Leakage to providers, copyright issues, prompt injection | Local processing, per-provider send consent, delimiter/untrusted handling, no repo/bank inclusion |
| **Model outputs** | Harmful or wrong content, injected instructions executed as tools | Validation, verification, tool allowlists, no automatic execution of model-proposed code outside sandbox |
| **App integrity** | Tampered updates, malicious dependencies | Signed builds and updates, lockfiles, dependency audit, SBOM, minimal deps |
| **Extensions/widgets** | Arbitrary code, data exfiltration | Sandboxed iframes/workers, no network, explicit permissions, message-passing API |
| **Local model runtime** | Open local port abused by other apps or web pages | Bind to localhost with random port and per-session token, no CORS wildcard, process isolation |

## 3. Data handling by category

| Data | Stored | Sent to providers | Sent anywhere else |
|---|---|---|---|
| Events (attempts, sessions) | Local DB | Only summarized context in prompts | No |
| Materials (files, chunks, embeddings) | Local | Only retrieved excerpts when a cloud provider handles the task | No |
| Tutor conversation | Local | As prompt history (budgeted) | No |
| API keys | Keychain/vault | Only to their own provider | No |
| Settings | Local | No | No |
| Crash/diagnostic reports | Local; learner chooses to copy | No | Only if learner opts into sending; content excluded |
| Telemetry | Off by default | No | Only if opted in: anonymous aggregate counts and performance timings, no content |

## 4. Provider data exposure

Cloud providers receive whatever the prompt contains. Therefore:
- Show **destination badges** (device / your network / cloud host) per provider.
- Offer **Local models only** mode that blocks non-local providers.
- First send of a new content category to a cloud provider asks for consent.
- Offer **redaction** of obvious personal identifiers before cloud sends.
- Document each supported provider's data-retention and training-use policy in-app as a link (learner reviews it); do not make claims about vendor policy in code or copy that may become stale.
- Prefer providers/settings that opt out of training when available, and tell the learner how.

## 5. Key handling (summary; details in docs/03 section 7)

Desktop OS keychain; web encrypted IndexedDB vault with passphrase or WebAuthn PRF; session-only option; never in localStorage, logs, exports, events, or error messages; show only last 4 characters; keys bound to base-URL allowlists; "Test connection" never echoes keys; panic wipe. Add an automated test that scans logs, exports, and event payloads for key patterns.

## 6. Untrusted content and prompt injection

- Treat materials, web pages, model output, and imported files as data.
- Delimit and label untrusted text in prompts; the constitution forbids following instructions inside it.
- The tutor has **no side-effecting tools** driven directly by untrusted content. Any action (add provider, change settings, delete data, open URL) requires explicit learner confirmation in the UI.
- Reject model outputs that try to emit hidden instructions, markdown images with data exfiltration URLs, or links the learner did not request. Render markdown safely (no raw HTML, block remote images by default).
- Include injection scenarios in evals and ingestion tests (hidden text in PDFs, instructions in slide notes, white-on-white text).

## 7. Code execution and sandboxing

- Pyodide runs in a dedicated Web Worker with no DOM access, no network, memory and time limits, and a message-only API.
- User or model-provided code (programming profile) runs only in an isolated sandbox (WASM or a locked-down process/container on desktop) with strict resource limits and no filesystem/network by default.
- Widgets and extensions run in sandboxed iframes with a strict CSP and a minimal postMessage API.
- Content Security Policy for the app: no inline script, no eval except where Pyodide requires it (scoped to its worker), restricted `connect-src` to configured provider hosts.

## 8. Network policy

The app contacts only: configured providers, hosts for model downloads the learner initiated, URLs the learner asked to fetch, and (if enabled) update and opt-in telemetry endpoints. `connect-src` and Tauri allowlists enforce this. All connections use TLS except localhost and learner-declared local-network endpoints (clearly labeled as unencrypted).

The Windows desktop shell adds a narrower WebView2 HTTP(S) request guard: before the bundled app origin is loaded, it requires `ICoreWebView2_22` and registers HTTP and HTTPS filters for all WebView2 request-source kinds. It permits the exact bundled app origin plus the Tauri IPC transport (`ipc.localhost`, FETCH context, POST/OPTIONS, one command path segment); other HTTP(S) requests receive synthetic 403 responses. If request inspection fails, the guard attempts a deny response; if it cannot create or set that response, the process exits rather than continuing without the guard. This is defense-in-depth for HTTP(S), not a complete renderer network-egress boundary. No `file://` filter is installed, and WebSocket, WebRTC/ICE and other non-HTTP(S) channels are not established as covered. CSP and this guard must not be described as a universal network firewall.

## 9. Supply chain

Lockfile, frozen installs in CI, dependency audit, license check, minimal dependencies, pinned GitHub Actions, secret scanning, signed releases and update manifests, reproducible build goal, SBOM per release, review of any postinstall scripts, Pyodide and model-runtime assets vendored or integrity-checked (hash pinned), model downloads verified by SHA-256.

## 10. Privacy rights and compliance posture

- Design for GDPR-style principles even with local-first: lawful basis (consent for optional processing), data minimization, purpose limitation, access/export, erasure, portability, and transparency. Export and delete are built-in features.
- If any optional server (sync) is added: data processing agreement, encryption at rest and in transit, end-to-end encryption option, regional hosting options, retention limits.
- Age: adults only at launch; age confirmation at onboarding. Child accounts require a separate privacy and safety review before any work begins.
- Institutional compliance (FERPA and similar) considered when instructor features arrive (M9).
- This document is engineering guidance, not legal advice; get legal review before launch.

## 11. Security testing

Threat-model review each milestone; unit tests for the vault and key binding; fuzzing parsers (SSE, JSON, PDF extraction wrappers); sandbox escape tests; injection eval scenarios; dependency and license checks; a pre-launch third-party penetration test of the desktop app and vault; bug-report channel with a responsible-disclosure policy.

## 12. Incident response

A documented plan for key-handling or data-exposure bugs: reproduce, assess, ship a fix, notify affected learners through in-app notice and release notes, advise key rotation when relevant, and write a postmortem. Maintain an internal runbook before launch.
