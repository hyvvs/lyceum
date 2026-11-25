# apps/web — M0-004 real browser shell (DRAFT)

Runnable local-first Vite/React app with typed TanStack Router paths `/` (Today) and `/settings`, English/Spanish ICU strings, device-local validated appearance preferences, and a private diagnostic Web Worker with cancellation. This is **not a tutoring engine**: it cannot report mastery, sessions, provider connections or learning history that did not occur.

From repository root after `corepack pnpm install --frozen-lockfile`:

```text
corepack pnpm --filter @lyceum/web dev
corepack pnpm web:build
corepack pnpm test:web
corepack pnpm verify
```

`pnpm test:web` builds **nothing**: run `pnpm web:build` first, then Playwright serves the real production app at `http://127.0.0.1:4173` and tests routes, keyboard, axe, worker, install metadata and genuine offline reload. The original Storybook tests remain a **separate** `pnpm storybook:build` then `pnpm test:ui` (141 stories/164 axe states). Set `LYCEUM_CAPTURE_WEB=1` on a screenshot evidence run to regenerate the four real desktop/mobile glass/solid PNGs in `docs/qa/m0-004-web-shell/`.

PWA generated via `vite-plugin-pwa@2.0.0` caches **only the app shell and static assets** (no learner content, providers or runtime API response cache). Updates are opt-in. Original atmospheric CSS imagery is **temporary** for M0-004; the M0-019 licensed imagery pipeline, rendered-pixel contrast, M0-017 final visual fidelity, M0-018 motion and M0-020 WebView benchmarks are separate. See `docs/18-design-language-glass.md` and ADR-0008.

**Approval boundary / blocker:** owner Audit #20 authorized the exact dependency/API scopes (including corrected `intl-messageformat@12.1.4`); the implementation PR remains DRAFT/UNMERGED until a fresh decision. Unrestricted `pnpm audit` currently finds **two moderate build-time Workbox transitive advisories** (glob 11.1.0, minimatch 10.2.6): do **not** ignore, override or substitute packages without explicit separate owner approval. M0-003 real AT, native Windows forced colors and applicable axe-incomplete manual signoff remain outstanding.
