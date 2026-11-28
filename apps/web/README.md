# apps/web — single Today application

The real browser and ordinary Tauri frontend now render **only** the approved dark-glass Today screen at `/`. The previous light hero shell and `/settings` page have been removed; appearance settings now open inside Today's header. Unknown URLs display the not-found state. Plan, Practice, Sources, and Models are visibly disabled until they are implemented as real screens, rather than silently sending the learner to old prototypes. The separate Storybook primitive gallery is **not** a production route or bundle entry.

All headline metrics, mastery bars, and session rows are explicitly **demo data**; there is no tutor session, imported source, provider connection or learner history behind them. The `Start session` action is intentionally a non-operational preview notice.

From the repository root:

```powershell
corepack pnpm --filter @lyceum/web dev --port 5173
corepack pnpm --filter @lyceum/web build
corepack pnpm --filter @lyceum/web preview --port 4173 --strictPort
corepack pnpm test:web
corepack pnpm verify
node scripts/capture-live-today.mjs http://127.0.0.1:5173
node scripts/capture-live-today.mjs http://127.0.0.1:4173
```

The development server serves **current source**; preview serves the **last compiled** `apps/web/dist` production build. `pnpm test:web` requires a current production build, then exercises the application on 4173 in Chromium. Screenshots and browser evidence are saved under `docs/qa/m0-ui-fidelity/screens/`.

**Service worker retirement:** the new web build does **not** bundle `vite-plugin-pwa`, register Workbox, or create a precache. `public/sw.js` is a non-caching retirement worker for prior installed Workbox registrations. The application loads `public/sw-reset-v2.js` to unregister its own legacy root-scoped service worker and delete only `workbox-*`/`lyceum-*` caches. The offline PWA capability is consequently not provided by this build. The migration cannot affect another browser profile until that profile next updates/loads the new application; manually reopening the app online may be needed if an old service worker continues serving a cached page.

The accepted Tauri security architecture, origin/request guards, and native capabilities remain unchanged. No installer or desktop binary was built or released by this web-only integration. Accessibility sign-off with real assistive technology and artwork license verification for external distribution remain separate approvals.
