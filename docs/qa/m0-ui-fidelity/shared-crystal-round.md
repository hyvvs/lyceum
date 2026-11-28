# Shared glass components — Round 1 evidence and owner approval gate

**Date:** 2026-11-28 · **Branch:** `m0/ui-fidelity` · **Only implemented round:** shared primitives, charts, icon and optical material. This is **not** a new production screen or a user-facing gallery. The next screen, Study session, is **not started**; stop for explicit owner approval.

## Current-source screenshots (1440 × 900, rendered in Chromium)

| Rendered surface | Screenshot | Origin / purpose |
|---|---|---|
| Shared data cards, chart and plan | [crystal-shared-overview-1440x900.png](screens/crystal-shared-overview-1440x900.png) | Compiled **development-only Storybook** assembly of real `@lyceum/ui` exports on 6006; not a product route |
| Shared navigation, form, menu and status | [crystal-shared-controls-1440x900.png](screens/crystal-shared-controls-1440x900.png) | Same real shared components, test-only assembly |
| Shared chat, ring, loading and empty states | [crystal-shared-feedback-1440x900.png](screens/crystal-shared-feedback-1440x900.png) | Same real shared components, test-only assembly |
| **Approved real Today** | [crystal-shared-today-production-regression-1440x900.png](screens/crystal-shared-today-production-regression-1440x900.png) | **Fresh `apps/web` production build launched on port 4173**, actual `/` route |

[Exact response/error/provenance JSON](screens/crystal-shared-round-evidence.json). Captured by `node scripts/capture-crystal-shared-round.mjs` after `pnpm storybook:build` and `pnpm --filter @lyceum/web build`. All four URLs returned HTTP 200 without browser page errors. The Storybook-only images are **not claimed to be production screens**; there is deliberately no extra production route. The owner-approved Today image is from the actual production bundle, not Storybook.

**Today preservation check:** Python Pillow RGB diff between the [original 1440 × 900 production Today](screens/live-today-production-1440x900.png) and new compiled screenshot shows **486 changed RGB pixels out of 1,296,000**, bounding box **(231, 447) through (316, 459)**. This is the previously prohibited visible `sample subjects` caption changing to `learning areas`. Header, dock, card layout, artwork, icon drawing and major painted areas remain pixel-identical. `apps/web/src/icons.tsx` now re-exports the **exact same SVGs** from the actual shared `@lyceum/ui` `Icon` module, eliminating the duplicate implementation.

## File-by-file inventory and work completed

[Full surviving legacy UI and fixture disposition](shared-round-inventory.md) records all actual app screens, 26 shared component modules with stories, style owners, non-rendered worker/IPC contracts, dev-only fixtures and historical removals. The unused licensed alternate interior photo and orphaned README were deleted; the user-approved Cole WebP is retained unchanged. No auxiliary component-look stylesheet exists or is imported. No extra user route was created.

Material changes are owned by `packages/ui/src/glass.css`: neutral layered depth (inner sheen, soft rim, subtle grain, cast shadow, translucent neutral underlay) and an **opt-in** warm-to-cool luminous layer behind future non-Today screens, plus tuned high-contrast, forced-color, auto-light and reduced-opacity fallbacks. `packages/ui/src/motion.ts` presets remain the time source. Buttons now distinguish focal blue, refractive glass secondary, text-only tertiary, icon, and semantic-danger roles. Shared charts use gradient fills, quiet gridlines, one blue highlight, and side-by-side `Algebra 48%` labels. The MasteryRing now has true concentric centers, rounded progress and uncertainty caps, larger separation and a soft glow. The empty-state card supports an actual secondary composable DialogTrigger **within the panel**. The shared icon set was centralized in `packages/ui/src/icon.tsx` and the approved Today uses that same export.

Active shared assemblies visibly use only one `Demo data` chip and genuine learner-facing phrases, never internal scaffolding. Every active assembly action changes React state, form content, selection, popover/dialog state, or notice. The actual production `/` route has a new exhaustive action-loop Playwright test, `tests/web/today-interactions-exhaustive.spec.ts`; planned unavailable sections remain disabled **only in the owner-approved Today**, not as advertised working navigation. Changing those visible elements would alter approved Today and requires owner direction.

## Verification results

- `pnpm verify`: **PASS**, including boundaries, agent-file validity, typecheck, **509 Vitest tests passed / 1 historical skip**, deterministic evaluation **29/29 executable rules passed** (30 qualitative scenarios incomplete), and lint.
- `pnpm storybook:build`: **PASS** compiled real shared-component stories.
- `pnpm --filter @lyceum/web build`: **PASS** actual production app.
- `pnpm test:web`: **7/7 PASS** — actual `/` route incl. full enabled-control interaction loop, appearance/localization/panels and no runtime errors.
- `pnpm test:ui`: **134 PASS / 1 historical skip**, with **465 indexed primitive stories and 503/503 required accessibility states executed**, no reported tagged rule violations. **Some axe checks remain incomplete** (`color-contrast`, `bypass`, `label-content-name-mismatch`) and require manual verification; this is not a WCAG certification.
- Independent **read-only** `lyceum-ux-review` examined earlier screenshots/source and identified original issues with mismatched chart height, halo spacing, flat opacity fallback, auto-light, forced colors, duplicated icons, and an orphaned Dialog action. These were corrected and screenshots regenerated. **The independent follow-up re-review could not finish because the image retrieval connector returned `AioRpcError`.** The final screenshots were inspected locally and all Playwright suites passed, but **no independent final visual sign-off** is claimed. No human owner visual approval has occurred.

## Provisional owner rubric — shared components, not a new screen

| # | Criterion from `docs/20` | Provisional /2 | Evidence / remaining limitation |
|---|---|---:|---|
| 1 | Retained painting + directional light | 2 | Cole asset retained, warm/cool optical field visible behind component assembly |
| 2 | Same multi-depth glass, not flat slabs | 2 | Shared sheen/grain/rim/underlay and readable opaque variants verified in compiled screenshots |
| 3 | Grid, equal heights and gutters | 2 | Data overview chart and plan match heights; 24px gutters |
| 4 | Real controls | 2 | Stateful assembly interactions and exhaustive production route 7/7 |
| 5 | Coherent icons | 2 | Same shared SVG family (22px/1.7 stroke) for actual Today and components |
| 6 | Believable content / one demo chip | 2 | No forbidden visible development words in 3 current assemblies |
| 7 | Focused blue and meaningful category/status tints | 2 | One blue data bar; neutral other bars; blue learner bubble/primary |
| 8 | Alignment and reading contrast | 1 | Paired chart data and concentric ring; physical compositor contrast not independently signed off |
| 9 | Role-specific finish, density | 1 | Better hierarchy; feedback/empty-state panel still has some unused space |
| 10 | Motion, reduced motion and performance | 1 | Shared motion tokens and state tests; no verified GPU motion/FPS budget yet |
| **Total** | **Self-assessed, not owner acceptance** | **17/20** | Threshold reached provisionally; owner review remains mandatory |

## Stop gate and remaining limitations

No Study session, Sources, Plan, Models, Settings or Practice production route was built this round. This work cannot prove the future screens will look premium; each must be designed with these real shared components in `apps/web`, then tested and captured **from its own launched production route**, **one screen per round**, pausing for owner approval. The reference-grade material still needs measured hardware compositor performance, contrast review of all backgrounds, screen-reader/forced-colors sign-off and final owner visual judgment. No service-worker, provider or backend contract was changed and no real learner progress is implied.
