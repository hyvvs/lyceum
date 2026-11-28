# Shared-components-only round — surviving UI and fixture inventory

**2026-11-28 · branch `m0/ui-fidelity` · scope: shared primitives and live-route regression, NOT Study session.** The owner-approved dark-glass Today remains the only production route. Decisions below are made **per surviving file or coupled file pair**. The shared component's TypeScript and story are a single real primitive plus a **development-only** verification surface, not competing implementations. The owner-controlled permanent brief is [`docs/20-ui-fidelity-brief.md`](../../20-ui-fidelity-brief.md).

## Actual product surface — retain, wire, do not create a duplicate

| File | Decision and reason |
|---|---|
| `apps/web/index.html`, `src/main.tsx`, `src/router.tsx` | **PROTECT** real boot and single `/` route; not a Storybook entry. |
| `apps/web/src/today.tsx`, `src/today-dashboard.tsx` | **PROTECT** approved Today composition and all existing actions. Only remove forbidden visible development wording, not its visual design. |
| `apps/web/src/today-shell.css`, `src/today-dashboard.css` | **PROTECT** approved Today layout, backdrop and pixel treatment; must not inherit incompatible future screen styles. |
| `apps/web/src/icons.tsx` | **WIRE** compatibility re-export of the same actual `Icon` SVGs from `@lyceum/ui`; eliminates a parallel icon implementation without changing Today's SVG artwork. |
| `apps/web/src/settings.tsx`, `src/preferences.ts`, `src/i18n.ts`, `src/use-document-title.ts` | **WIRE/RETAIN** real Today appearance/localization/state infrastructure; no extra route and no fake setup screen. |
| `apps/web/src/desktop-native.ts` | **RETAIN** actual guarded Tauri IPC bridge; not a UI shell; native config unchanged. |
| `apps/web/src/worker/client.ts`, `src/worker/protocol.ts`, `src/worker/engine.worker.ts` | **RETAIN AS TESTED NON-UI ENGINE TRANSPORT**, not rendered or bundled by `/`; no fake controls or current user-facing calls. An independently approved real Study session may later wire its typed transport. Deleting this nonvisual architectural contract would discard validated cancellation/security behavior. Its unit test `client.test.ts` remains. |
| `apps/web/src/desktop-native.test.ts`, `error-screen.test.tsx`, `i18n.test.ts`, `preferences.test.ts`, `worker/client.test.ts` | **RETAIN** live/infra regression coverage, not alternate UI. |
| `apps/web/public/theme-bootstrap.js`, `sw-reset-v2.js`, `sw.js`, icons | **RETAIN** real appearance/bootstrap and previous worker retirement; no parallel visual app. |

## One real shared component library — upgrade and test, never fork

All listed paths are under **`packages/ui/src/`**. Every `*.stories.tsx` below renders its **matching real TypeScript export** and stays behind Storybook's separate development server. Styling for the new optical material is owned only by `glass.css`; existing `morphing-rail.css` remains the one dedicated SVG geometry skin, not a rival theme. The `*.test.ts*` files in the same folder are unit/integration checks, not UI shells.

| Component file | Story file | Decision / production contract |
|---|---|---|
| `avatar.tsx` | `avatar.stories.tsx` | **REWORK** through shared neutral-glass rim, consistent 20px SVG icon when supplied; decorative state, no fake click action. |
| `bar-chart.tsx` | `bar-chart.stories.tsx` | **REWORK** gradient bars, one blue highlight, faint gridlines, adjacent label/value, visually hidden scale/highlight metadata. |
| `button.tsx` | `button.stories.tsx` | **REWORK** one blue primary, glass secondary with accessible rim, text-only ghost, semantic danger; real native click/link/loading semantics. |
| `chat-bubble.tsx` | `chat-bubble.stories.tsx` | **REWORK** learner blue glass only, tutor neutral translucent reading glass; streamed status and actual speaker label. |
| `chip.tsx` | `chip.stories.tsx` | **REWORK** restrained category/status tint, otherwise neutral glass, not a fake button. |
| `dialog.tsx` | `dialog.stories.tsx` | **REWORK** portalled optical rim and reading depth, preserve actual Escape/focus/scroll behavior. |
| `dock.tsx` | `dock.stories.tsx` | **REWORK** shared floating surface, consumer-provided real navigation links; current Today uses this exact export. |
| `empty-state-card.tsx` | `empty-state-card.stories.tsx` | **REWORK/WIRE** truthful empty state; actual primary callback and composed in-card `accessoryAction` slot so no orphan buttons. |
| `glass-card.tsx` | `glass-card.stories.tsx` | **REWORK** neutral optical card, rim, shadow and hover lift, not opaque slab. |
| `glass-panel.tsx` | `glass-panel.stories.tsx` | **REWORK** depth variants of same glass material, not separate finishes. |
| `input.tsx` | `input.stories.tsx` | **REWORK** optical field and real accessible editable input, no inert visual mimic. |
| `list-row.tsx` | `list-row.stories.tsx` | **REWORK** actual semantic button/link callback, restrained status tint and clear selectable state. |
| `mastery-ring.tsx` | `mastery-ring.stories.tsx` | **REWORK** concentric SVG arcs, rounded caps, soft glow and same-line label/value; explicit opt-in unique blue highlighted datum. |
| `morphing-rail.tsx` | *No standalone story* | **RETAIN/REWORK VIA TOKENS** spring-driven connected selection and `morphing-rail.css`; not mounted on real Today; no second production dock. Its `morphing-rail.test.ts` remains. |
| `pill-nav.tsx` | `pill-nav.stories.tsx` | **REWORK** common glass pill wrapper; consumers supply working routes/state. |
| `popover.tsx` | `popover.stories.tsx` | **REWORK** translucent framed popover with real focus trap/return and Escape, shared motion and collision behavior. |
| `round-icon-button.tsx` | `round-icon-button.stories.tsx` | **REWORK** native accessible 20px icon controls, no decorative inert buttons. |
| `segmented-control.tsx` | `segmented-control.stories.tsx` | **REWORK** real radio choice/checked state, same glass with pill selected depth. |
| `select.tsx` | `select.stories.tsx` | **REWORK** real Radix option state, portalled reading-depth glass with **no nested compositor blur**. |
| `skeleton-loader.tsx` | `skeleton-loader.stories.tsx` | **REWORK** quiet layered placeholder, not a disabled fake action. |
| `stat-card.tsx` | `stat-card.stories.tsx` | **REWORK** equal-height real card, adjacent quiet label/big value, trend and subtle semantic delta. |
| `tabs.tsx` | `tabs.stories.tsx` | **REWORK** proper focus/selection/panel roles with glass selected state; no nonfunctional navigation. |
| `tint-card.tsx` | `tint-card.stories.tsx` | **REWORK** meaningfully tinted category card within the one optical material. |
| `toast.tsx` | `toast.stories.tsx` | **REWORK** real dismissal/timer/keyboard and single-depth glass notification. |
| `tooltip.tsx` | `tooltip.stories.tsx` | **REWORK** real hover/focus hint with glass rim and accessible label. |
| `visually-hidden.tsx` | `visually-hidden.stories.tsx` | **RETAIN** essential invisible a11y primitive; cannot be a visible card. |
| `icon.tsx` | *Covered by real component assembly* | **CENTRALIZE** exact previously approved SVG paths into `@lyceum/ui`, 22×22 viewBox, 1.7 stroke; remove app-owned duplicate. |
| `index.ts`, `motion.ts`, `glass.css`, `morphing-rail.css` | — | **RETAIN/REWORK** single source for exports, time/preset, optical recipes, and rail geometry; no independent component-look stylesheet. |

## Remaining development-only fixtures and old-UI disposition

| Exact files | Decision |
|---|---|
| `.storybook/main.ts`, `.storybook/preview.tsx`, `.storybook/preview.css` | **RETAIN, GATED BY DEV SERVER ONLY**; cannot be reached via production TanStack routes, does not modify real app. |
| `tests/fixtures/m0-ui-fidelity-shared.stories.tsx`, `tests/fixtures/m0-ui-fidelity-shared.css` | **REWORK DEV-ONLY** interactive assembly of real `packages/ui` exports, with one `Demo data` marker, no alternate production renderer. Useful to catch missing shared styling without creating a real gallery route. |
| `tests/fixtures/runtime-preferences.stories.tsx`, `tests/fixtures/runtime-preferences.css` | **RETAIN DEV-ONLY** real Dialog/Select context+portal regression harness including independent focus/RTL/zoom, no production route. |
| `tests/fixtures/assets/sunlit-room-licensed-pexels-27051764.jpg`, `tests/fixtures/assets/README.md` | **DELETE** unused competing historic photo + its orphaned provenance index; source search showed zero runtime imports. |
| Historical `tests/fixtures/m0-005-reference-prototype.*`, `m0-017-v5-composition.*`, `m0-017-b5-composition.*`, `native-visual-qa/*`, separate app shell CSS | **ALREADY DELETED** by preceding commit `58adf32`. No current imports or alternate user routes remain. |
| Rejected auxiliary component-look stylesheet | **NEVER PRESENT** in current tracked/untracked tree at audit; no import added. Do not introduce it. |

## Non-rendering test and release evidence

`tests/ui/*.spec.ts` are development-only primitive accessibility/interaction tests; the new `tests/ui/crystal-shared-round.spec.ts` covers real shared assembly. `tests/web/live-today.spec.ts` and `tests/web/today-interactions-exhaustive.spec.ts` cover the **only real production route `/`**. `scripts/capture-crystal-shared-round.mjs` captures dev-only primitives separately from the actual compiled production Today regression at 1440×900, explicitly labeling their sources in JSON. No future screen is implemented before owner approval.

**Scope restriction / known debt:** all old primitive story *test copy* may still contain historical training/debug terms; these are protected dev-only diagnostics not shipped to application `/`. The active three shared component assembly screens and real production Today do **not** visibly show the prohibited words. The old worker transport is architectural non-UI code, not an orphan UI control. Future screen components, their controls, and screenshots are deliberately absent until their approved rounds.
