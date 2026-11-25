# M0-004 web shell — draft implementation evidence (2026-11-25)

**Status: DRAFT, NOT ACCEPTED OR MERGED.** Owner Independent Audit #20 authorized development and draft-PR verification A–D, not final acceptance. M0-003 remains `[~]`, M0-004 is `[~]`, manual accessibility signoff is **NOT RUN**, and no M0-005/M0-017+ implementation or public release is authorized.

## Real application and scope

- `apps/web` is a runnable Vite 8/React 19 browser app, **not a Storybook screenshot**. It has typed TanStack Router paths `/` (Today) and `/settings`, a usable 404/error fallback and router-free outer failure fallback, skip link, `main` landmark, keyboard-focusable navigation and route heading focus. The responsive dock changes from left icon capsule to fixed bottom capsule, with tested 200%/320×256 focus clearance. Errors offer Retry and return-to-Today without assuming learner work exists.
- `/settings` has validated device-local theme, opacity and English/Spanish language choices with early `html` paint attributes, localStorage denial fallback and a11y labels; ICU interpolation, one/plural, language changes and English fallback are tested. No learner data, models, tutoring, pseudo-mastery, sync, credentials, telemetry, third-party assets or outbound API calls are introduced.
- **Production Content Security Policy:** the build injects a restrictive app CSP meta tag (`script-src 'self'`, no `unsafe-eval` or inline scripts; `connect-src 'self'`, local workers and disabled objects). The early theme bootstrap is a **separate same-origin `theme-bootstrap.js` asset**, not executable inline HTML, in compliance with `docs/16-security-privacy.md` §7. Local dev HMR is not used as production CSP proof.
- Original **CSS-only atmospheric placeholder** (no reference video imagery) produces layered true translucent overview surfaces and near-opaque `glass-reading` hero; solid/reduced-transparency/high-contrast/native-forced-colors CSS alternatives are provided. No new public UI primitive, global focus scope or event/engine contract is introduced (ADR-0009 unchanged).
- Private `apps/web/src/worker` Web Worker: Zod-validated, versioned `probe/ready/cancel/cancelled/error`, request correlation, bounded concurrency and request IDs, immediate local abort settlement, genuine worker ack, timeout/worker-error/termination cleanup. **Diagnostic transport only; no real tutoring/learning event engine.**
- PWA `vite-plugin-pwa@2.0.0` generated Workbox SW/manifest, original 192/512 PNG icons, static build-asset-only precache, restricted same-origin navigation allowlist (`/`, `/settings`), no runtime/provider/learner-response caches, prompt-only update with no automatic surprise reload. **Security advisory blocker below applies to the build-time Workbox transitives.**

## Actual pinned packages and install

Pre-install exact package/peer/license/Node checks passed. `corepack pnpm install` and subsequent **`corepack pnpm install --frozen-lockfile` passed** on Windows Node **22.20.0**, pnpm **9.15.0**. Current `apps/web/package.json` and `pnpm-lock.yaml` resolve:

| Direct runtime dependencies | Installed version |
|---|---|
| `react`; `react-dom` | `19.3.1`; `19.3.1` |
| `@lyceum/ui` | `workspace:*` |
| `@tanstack/react-router` | `1.170.46` |
| `i18next`; `react-i18next` | `27.2.7`; `18.0.3` |
| `i18next-icu`; **corrected** `intl-messageformat` | `2.7.1`; **`12.1.4`** |
| `zod` | `4.6.7` |

| Direct build/dev dependencies | Installed version |
|---|---|
| `vite`; `@vitejs/plugin-react` | `8.3.8`; `6.3.0` |
| `vite-plugin-pwa` | `2.0.0` |
| `typescript`; `@types/react`; `@types/react-dom` | `5.9.3`; `19.3.0`; `19.0.6` |

No Comlink, extra font/image SDK, telemetry or provider runtime was added; no workspace version substitution was made. Dependencies/peers and actual transitive graph are in the lockfile, including Workbox below. Bundled route size is **measured**, not estimated from registry unpacked sizes.

**Lifecycle-script inspection:** a read-only scan of installed `node_modules/.pnpm/*/node_modules/**/package.json` manifests found **36 distinct installed package/version pairs declaring preinstall/install/postinstall/prepare hooks**. Most declarations are publish-time `prepare` scripts (not proof they executed during a registry install); the only three observed **`postinstall` declarations** were existing `@biomejs/biome@1.9.4` (`node scripts/postinstall.js`) and `esbuild@0.21.5` / `esbuild@0.28.2` (`node install.js`). No declared install/postinstall hook was found on the newly approved direct router, i18n, PWA or ICU packages. This inspection is not a substitute for lockfile integrity, provenance, vulnerability audit or sandbox review; unrestricted audit remains **red**.

## Local exact-code testing

| Gate | Evidence |
|---|---|
| `corepack pnpm verify` | **PASS**, 24 test files, **106 passed + 1 expected Windows-only skip** (107 total); boundaries, agentcheck, five workspace typechecks and Biome pass. Hosted Linux unit count may differ by running the Windows-only skip. |
| `corepack pnpm storybook:build` / `corepack pnpm test:ui` | **PASS**, existing **88/88 Chromium** tests and **`AXE_COVERAGE_VERIFIED unique_stories=141 required_states=164 executed_states=164`**. Historical unsupported unbounded Dialog test remains preserved as a known-bad case. |
| `corepack pnpm web:build` / `corepack pnpm test:web` | **PASS**, **12/12 actual Chromium app cases** on screenshot evidence run (11 tests + one screenshot-only opt-in in regular CI). Tests cover routes, skip/heading focus, real 320×256 200%-text dock clearance, ICU/prefs, real worker round-trip and cancel ack, PWA manifest/PNG icons, SW/cache exclusion/cleanup, production **offline /settings and Today reload**, actual test-only SW version A→B waiting and consent-driven activation, axe on actual shell/settings/solid and emulated forced-colors/reduced-motion. |
| `corepack pnpm audit` | **FAIL — 2 moderate advisories**, detailed below. This is an **explicit PR/merge blocker**; do not downgrade/ignore. |

**PWA update test scope:** `tests/web/pwa-update.spec.ts` serves a separate copy of the **actual production build**, appends a harmless version B marker to the SW script, triggers a genuine browser install and waiting lifecycle, verifies the open page retains a test-only unsaved in-memory marker before explicit click, then activates/reloads **only on the user action** and removes local test caches/registration. It does **not** prove compatibility between two independently built releases with changed old lazy chunks or actual persisted learner edits; there is no learner data system yet. The real production deep-link offline reload test is separate and passing.

## Measured bundle (Vite 8 production build)

Measured from `apps/web/dist` with Node `zlib.gzipSync` on current emitted files, not package metadata:

| Resource | Minified/raw size | Real gzip |
|---|---:|---:|
| Initial app JS `index` | **459,009 B** | **142,876 B** |
| Initial ICU vendor chunk | **41,196 B** | **12,699 B** |
| Shared CSS | **35,675 B** | **6,606 B** |
| `index.html` (with production CSP) | **1,246 B** | **588 B** |
| Early theme bootstrap `theme-bootstrap.js` | **1,110 B** | **560 B** |
| **Initial route HTML/JS/CSS/bootstrap total** | — | **163,329 B (159.5 KiB)** |
| Worker (loaded separately on Today) | **87,629 B** | **24,087 B** |
| Lazy Settings route chunk | **2,326 B** | **689 B** |

The initial HTML+JS+CSS/bootstrap aggregate is **under the required 250 KB gzip initial-route budget**. Including the separately fetched worker gives **187,416 B** (roughly 183.0 KiB), still below 250 KB; the SW/runtime/cache traffic is separate. No unmeasured server/API data is counted. CSS and minified JS hashes can change with final commits; recheck emitted byte totals before acceptance.

## Actual Lighthouse measurement — local Windows Chrome

Reproduced against a **production Vite preview** on loopback `http://127.0.0.1:4173/`, using Chrome **158.0.8127.37** and Lighthouse **13.6.0**, CLI `--only-categories=performance,accessibility --chrome-flags='--headless --no-sandbox --disable-gpu'`. Desktop additionally uses `--preset=desktop`; mobile uses **Lighthouse emulated mobile throttling/form factor**, not a real phone. Raw reports were generated into ignored local `test-results/lighthouse-desktop.json` / `lighthouse-mobile-simulated.json`; the PR records the measured values.

| Run (UTC) | Performance | Accessibility | FCP / LCP | TBT | CLS |
|---|---:|---:|---|---|---:|
| Desktop, 2026-11-25 00:45:22 | **100** | **100** | **0.2 / 0.2 s** | 0 ms | 0 |
| Mobile **emulation**, 2026-11-25 00:45:34 | **100** | **100** | **0.9 / 0.9 s** | 0 ms | 0 |

These scores describe the **minimal, real shell on this local test environment**, not the eventual learning experience, a physical midrange device, a supported Tauri/WebView, M0-020 performance, or manual WCAG certification. The single-route Lighthouse run does not certify other screens, 200% viewports or native AT/OS modes.

## Actual app screenshots and V5 direction audit

The following are **real running Vite application screenshots** from Chromium, not Storybook fixtures. Generated via `LYCEUM_CAPTURE_WEB=1 corepack pnpm test:web` on 2026-11-25, and visually inspected. Sizes are viewport widths/heights; PNG capture may be full-page height where content scrolls.

| Actual capture | Evidence path and mode |
|---|---|
| Desktop dark, full frosted glass, **1440×900** | [desktop-full-glass.png](m0-004-web-shell/desktop-full-glass.png) |
| Mobile dark, full frosted glass, **390×844** | [mobile-full-glass.png](m0-004-web-shell/mobile-full-glass.png) |
| Desktop high-contrast/opaque, **1440×900** | [desktop-high-contrast-solid.png](m0-004-web-shell/desktop-high-contrast-solid.png) |
| Mobile fully opaque, **390×844** | [mobile-opaque.png](m0-004-web-shell/mobile-opaque.png) |

**Visual comparison to `docs/18`, ADR-0008 and supplied Glassy Dashboard V5 contact sheet:** preliminary shell has an original atmospheric CSS backdrop, centered floating pill nav, left rounded icon dock (bottom mobile), layered translucent overview cards, a near-opaque reading hero, subdued one-focal-accent treatment and deliberately solid/high-contrast variants. **Incomplete:** real V5 photographic atmosphere and licensed asset pipeline; richer panel/tinted analytics hierarchy, exact side-by-side full rendered composition/refinement (M0-017); prescribed shared-element/motion choreography (M0-018); original/licensed backdrops with **rendered-pixel contrast across all backgrounds** (M0-019); supported Windows/macOS/Linux WebView GPU/frame/performance gates (M0-020). The CSS atmosphere is a clearly labeled **temporary M0-004 placeholder**; no supplied reference image or video asset was copied.

## Independent read-only reviews (not formal GitHub approvals)

- **Architecture:** found an early worker cancel/ready race, failed-client retry and lazy route heading-focus gaps. Corrections settle local abort immediately, announce a cancellation acknowledgment **only if received**, recreate a failed worker, and focus the lazy route heading once mounted. Added worker race/timeouts/termination and real 320×256 focus-clearance regressions. No new public cross-package API.
- **UX/accessibility:** examined all four actual PNGs, docs/18 and supplied V5 contact sheet; found **no confirmed remaining blocker for this constrained draft scaffold**. The fixed mobile dock can obscure **unfocused** setup text at an intermediate scroll position, but keyboard-focused controls are tested as reachable/clear and the document scrolls. The 320×256 test covers representative controls via programmatic focus and a real Enter navigation, **not exhaustive natural Tab/Shift+Tab**, every OS/AT announcement, RTL or portal permutation; no broad accessibility certification is claimed.
- **Security:** independently confirmed no third-party provider/telemetry paths, a static-only SW cache and separate honest cancellation acknowledgment. Found the **two moderate Workbox transitive advisories below** (still BLOCKED), an early inline appearance script (now **externalized** with production CSP) and a standard PNG hex signature flagged by detect-secrets (now checked with **the same eight numeric signature bytes**, without weakening the secret scanner). The final hosted CI result, not read-only review, remains the authoritative exact-head verification.

## Supply chain: unrestricted audit blocker and next owner decision

**FAIL: 2 moderate vulnerabilities, not waived.**

1. `vite-plugin-pwa@2.0.0` → `workbox-build@7.4.1` → **`glob@11.1.0`**: GHSA-3g3m-2fjr-6pw4, patch **>=14.0.2** (outside Workbox's declared glob `^11` contract).
2. Same path → `glob@11.1.0` → **`minimatch@10.2.6`**: GHSA-g3hv-75wg-m249, patch **>=11.0.1** (outside glob11's `^10` contract).

These are **build-time transitive packages**, not imported into the learner app, but the user's unrestricted dependency audit and release-quality requirement still make them blockers. Security read-only review found **no in-range compatible upstream fix** for the exact owner-approved Workbox chain. **No override, package substitution, audit suppression or severity waiver is applied.**

**Owner approval required for remediation:** (A) wait for compatible upstream Workbox fix, or (B) explicitly authorize and separately test a narrow supported fork/override into patched glob/minimatch versions with peer compatibility, SW precache/frozen install, actual offline A→B browser coverage and unrestricted audit. Default: **leave draft PR red/unmerged, no waiver**.

## Outstanding real-world signoff

- **M0-003 remains `[~]`**. The existing [manual AT/native Windows forced-colors test sheet](m0-003-manual-at-forced-colors-acceptance-2026-11-24.md) stays **BLOCKED / NOT RUN** on actual supported assistive-technology/browser/OS combinations, Windows native contrast themes and node-specific axe `incomplete` dispositions. Chromium forced-colors emulation and Lighthouse/axe 100 scores are **not** substitutes.
- The historically failing arbitrary unbounded Dialog remains **UNSUPPORTED**; ADR-0009 retains the accepted standalone focus-scope **deferral**, not implementation. Confirmed failures in supported cases demand focused regression/fix.
- M0-004 is **`[~]` DRAFT implementation only**. Explicit new owner merge/acceptance permission is required; no M0-005 or M0-017–020 implementation or public release.
