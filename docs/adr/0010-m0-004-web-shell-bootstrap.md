# ADR-0010: M0-004 local-first web shell bootstrap

- Status: proposed
- Date: 2026-11-25
- Deciders: project owner (Audit #20 authorized scope A–D; this ADR still requires separate human acceptance)

## Context

M0-004 is the first **real browser application** over the previously merged seven primitive families. The approved [M0-003 sequencing exception](../qa/m0-003-exit-decision-2026-11-24.md) permits M0-004 **development and draft-PR verification only** despite M0-003 remaining `[~]`; it does not waive manual AT, native Windows forced-colors, applicable axe `incomplete`, WCAG 2.2 AA or release/merge gates. The original [web shell task card](../../tasks/M0-foundations.md) requires a real Vite/React/TanStack Router entry, offline installable PWA, worker bootstrap/cancellation, accessible error boundary, theme, browser tests and measured Lighthouse. Architecture remains local-first, with no invented learner progress or provider integration.

## Options considered

1. **Owner-approved Vite + typed TanStack Router + i18next/ICU; native Web Worker and generated PWA (chosen for the draft):** meets required tooling and typed navigation, uses the smallest app-private worker contract without Comlink, offers generated static cache revisions. Costs: build-time Workbox tree, new package/license/security review, and testing of SW updates.
2. **No router/PWA plugin, handwritten history/SW:** fewer dependencies but violates the declared router architecture and increases offline update/cache invalidation risk. Not adopted.
3. **Comlink or a shared cross-package worker API:** more indirection before a real tutoring engine consumer, contrary to owner limit. Not adopted.

## Decision

Independent Audit #20 explicitly authorized these **exact runtime pins** in `apps/web`: `react@19.3.1`, `react-dom@19.3.1`, `@lyceum/ui@workspace:*`, `@tanstack/react-router@1.170.46`, `i18next@27.2.7`, `react-i18next@18.0.3`, `i18next-icu@2.7.1`, **`intl-messageformat@12.1.4` (corrected from 12.2.1)** and `zod@4.6.7`. Build tools `vite@8.3.8`, `@vitejs/plugin-react@6.3.0`, `vite-plugin-pwa@2.0.0`, existing TypeScript `5.9.3` and existing React type versions may be reused. Exact registry versions, licenses, peers and Node 22.20.0/pnpm 9.15.0 compatibility were confirmed before installation; no other runtime package was added.

The browser app has typed `/` and `/settings` routes, English/Spanish ICU strings with English fallback, validated device-local theme/language/transparency preferences, early paint application on `document.documentElement` (including independently portalled controls), native focus/landmarks and truthful not-configured surfaces. App-only worker messaging is a versioned Zod-checked `probe/cancel/ready/cancelled/error` diagnostic transport; **it is not a tutor, mastery engine, storage protocol or public `@lyceum` contract**. PWA manifest and SW are generated with a bounded static app-shell precache and no runtime caching of learner or remote data; update activation is user-controlled to avoid surprise reloads. The app uses a **temporary original CSS-generated backdrop** only, pending M0-019. The full V5 visual comparison, motion work, licensed imagery/rendered-pixel contrast and target WebView performance remain independently gated M0-017–M0-020 work.

## Consequences and security limitation

- Positive: real accessible and keyboard-operable routes, local themes and localization, repeatable worker cancellation, production offline reload, measured app bundle and browser/a11y gates without changing `packages/core` or `packages/ui` exports. Existing Storybook gate remains intact.
- **BLOCKED — dependency audit:** the **exact approved** `vite-plugin-pwa@2.0.0` resolves `workbox-build@7.4.1` → `glob@11.1.0` → `minimatch@10.2.6`. Unrestricted `pnpm audit` reports **two moderate vulnerabilities**: [GHSA-3g3m-2fjr-6pw4](https://github.com/advisories/GHSA-3g3m-2fjr-6pw4) and [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249). Patched glob **>=14.0.2** is outside Workbox's `^11` range, and patched minimatch **>=11.0.1** is outside glob11's `^10` range. No unreviewed override, package substitution, audit ignore or waiver is authorized. **The draft PR must not merge with this red unrestricted audit.** Request owner choice: wait for compatible upstream Workbox patch; approve separately a narrow, compatibility-tested patched fork/override plus new lock and full Linux precache/offline verification; or revise the approved PWA contract.
- Manual screen-reader/Windows native forced colors and relevant axe `incomplete` dispositions are **NOT RUN**, not replaced by Chromium emulation/automation. M0-003 remains `[~]`; M0-004 is `[~]` while implementation is in progress.
- No M0-004 acceptance/merge, public release, certification, M0-005 or M0-017+ implementation is authorized by the A–D decisions. Human ADR acceptance and a **fresh explicit M0-004 merge decision** are still required.

**Revisit triggers:** at M0-004 acceptance/merge decision, at manual M0-003 accessibility signoff, before any public release, or when Workbox/peer/security advisories change. Confirmed supported-consumer accessibility defects require focused fixes and regression tests.
