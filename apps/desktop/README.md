# M0-005 — Tauri v2 desktop shell foundation

This package wraps the **existing** `apps/web` frontend in a local Tauri v2 desktop WebView, preserving its theme, typed worker and existing router. M0-005 is **in development** (`[~]`): a technical foundation, **not** an independently accepted, production-ready desktop app or release.

## Build and test

From the workspace root:

```sh
corepack pnpm install --frozen-lockfile
corepack pnpm web:build
cargo test --manifest-path apps/desktop/src-tauri/Cargo.toml --locked
cargo clippy --manifest-path apps/desktop/src-tauri/Cargo.toml --locked --all-targets -- -D warnings
cargo build --manifest-path apps/desktop/src-tauri/Cargo.toml --locked
corepack pnpm --filter @lyceum/desktop build
node apps/desktop/scripts/native-smoke.cjs
```

The development command is `corepack pnpm --filter @lyceum/desktop dev`. It uses the exact `http://127.0.0.1:5173` dev origin. Production builds use Tauri's **bundled** app origin and a desktop-only, separately restricted CSP; the ordinary browser PWA build retains its original CSP and never bundles native IPC code. The `build` command compiles actual release frontend assets and a native executable, **not** a signed installer. `native-smoke.cjs` launches the actual macOS/Windows executable: on macOS it waits for the renderer's successful native command plus synthetic OS-keychain roundtrip; on Windows it additionally attaches to WebView2 and exercises real renderer IPC, credential operations, app-data path non-disclosure, unauthorized transport denial, child-window denial and remote-navigation denial. [Additive native CI](../../.github/workflows/desktop-native.yml) runs Rust formatting, tests, Clippy, build, ACL checks and this native smoke on macOS and Windows. These checks do not substitute for an actual painted-window startup/performance measurement on the reference device.

## Least-privilege native surface

- Exactly one `main` WebView window, created with explicit navigation and new-window denial hooks. In production, only the bundled Tauri app origin is permitted; in debug only exact `http://127.0.0.1:5173` is permitted. Custom Rust IPC commands **also** check the calling window label and live origin before side effects. Tauri global injection is disabled, local capability permissions are empty and no Tauri plugins, new shell/file permissions or remote access URLs exist.
- `credential_set`, `credential_has` and `credential_delete` are scoped renderer IPC. The mandatory **get operation exists only as `credential_get_native` in Rust**, and does *not* return secret plaintext through JavaScript. Future provider-bound native HTTP authorization construction must use this native-only operation and obtain separate gateway/consent implementation approval; there is **no** provider header injection or secret-bearing network use now. Credential IDs are ASCII [A-Za-z0-9_-], 1–64 bytes, secrets nonempty and ≤16 KiB, keyring errors generic. Real macOS Keychain/Windows Credential Manager backends are enabled; Linux has no enabled backend and **fails safely**. Never put secrets in logs, events, URLs, diagnostics, snapshots or files. Synthetic roundtrip: `LYCEUM_RUN_KEYCHAIN_TESTS=1 cargo test --manifest-path apps/desktop/src-tauri/Cargo.toml --locked real_os_keychain_synthetic_round_trip_when_explicitly_enabled`.
- `app_data_directory` resolves Tauri's application-owned native directory and returns only unit readiness over IPC, never the profile path. It creates only the final app-specific directory component; on a fresh macOS profile it may create the standard `~/Library/Application Support` parent (only under an existing, non-symlink `~/Library`), while Windows requires the OS-provided `%APPDATA%` parent to exist. It rejects symlinks, Windows reparse points and unexpected file types; new Unix directories are created with mode 0700, and existing Unix directories with broader permissions fail closed rather than being chmod'ed through a pathname. Windows inherits the per-user profile DACL; hosted CI verifies the newly created directory owner and rejects broad-principal access ACEs. This command exposes no arbitrary read/write API. A future persistent DB adapter must still open its database file with platform-appropriate no-follow/handle-based protections; returning readiness is not a generic secure-file-open guarantee.
- `native_http_request` takes an explicit *Rust-approved destination ID* rather than arbitrary renderer URLs, with `cancel_http_request` for cancellation. Its only bundled destination is fixed `documentation-example → https://example.com/` with **GET only**. This demonstrates a usable, manually invoked authorized transport, **not** a provider integration, and causes **no automatic network requests**. Additional destinations cannot be added by frontend IPC. Other methods/headers, arbitrary authorization values, raw URL selection, local/unencrypted hosts and redirects fail closed. Fixed HTTPS destination URL, 16 KiB request cap, 256 KiB UTF-8 response cap, max eight concurrent requests, DNS validation/pinning to public addresses, no ambient proxies, connect/total timeouts and generic errors constrain network risk. A future provider implementation requires explicit host/path/credential/consent binding and separate review; a configured local endpoint is **not yet supported**.
- A desktop-only, lazy-imported `@tauri-apps/api` handshake requests `app_data_directory` and writes a **non-secret** readiness flag to the root DOM. The IPC result is unit/void: the resolved path never enters JavaScript, and no error text is exposed. Ordinary web/PWA behavior and CSP are not changed by this import.
- Desktop builds deliberately omit the Vite PWA plugin and the desktop update hook never registers a service worker. This prevents an old cached browser shell from shadowing newly bundled native assets in a persistent WebView profile. Normal browser builds still generate the manifest/service worker and keep the existing update/offline behavior; CI asserts both sides of this build boundary.

## New dependency justification (no Tauri plugins)

| Dependency | Why this is necessary | License / limitations |
|---|---|---|
| `@tauri-apps/cli@2.12.6` | Build and run supported Tauri v2 package | MIT OR Apache-2.0; development-only |
| `@tauri-apps/api@2.12.5` | Official desktop-only renderer-to-native invoke transport | MIT OR Apache-2.0; normal web build excludes it |
| `tauri@2.12.7`, `tauri-build@2.7.6` | Required v2 Rust application runtime and build code generation | MIT OR Apache-2.0; native WebView/toolchains required |
| `keyring@3.6.3` | Native Windows/macOS secure credential stores without new Tauri plugins | MIT OR Apache-2.0; Linux service backend deferred until actual support decision |
| `reqwest@0.12.24` | Native HTTPS transport with no redirects, proxy, unbounded response or unpinned DNS | MIT OR Apache-2.0; single fixed documentation destination |
| `serde@1.0.228` | Serialize a narrow result type across the typed IPC boundary | MIT OR Apache-2.0 |
| `tokio@1.54.1` | Bounded native cancellation and async timeout primitives | MIT; required for select/oneshot/time |
| `serde_json@1.0.149` | Native test-only rejection of unapproved IPC request fields | MIT OR Apache-2.0; dev-only |

The actual locked native graph and Rust advisory/license results are documented in [M0-005 QA](../../docs/qa/m0-005/README.md), including **seven unavoidable MPL-2.0 Tauri transitive licenses** that do **not** satisfy the repository's permissive-only rule without an explicit policy decision. Do not silently suppress the license check. No gateway provider, SQLite, model sidecar, telemetry, updater, OAuth, learner-data writes or download plugin has been added. M0-005 remains `[~]` until all real OS, native IPC, reference-hardware startup and acceptance gates have genuine evidence.
