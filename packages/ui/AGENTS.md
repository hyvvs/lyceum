# packages/ui: scoped rules (adds to the root AGENTS.md)

- Visual language: `docs/18-design-language-glass.md`. Tokens and recipes live in `src/glass.css`; motion presets in `src/motion.ts`.
- Use tokens and presets only: no hard-coded colors, blur radii, spacing, springs, or durations.
- Text, math, and exam items sit on `glass-reading`. Every view has one focal accent. Never place text directly on the backdrop.
- Always provide the fallbacks: no `backdrop-filter`, reduced transparency, high contrast, reduced motion. They must look finished.
- Animate only transform, opacity, and small-element filter; never animate `backdrop-filter` radius; at most about 6 blurred layers visible; no nested blur.
- Each component needs Storybook stories for all states (default, hover, focus, disabled, loading, error, empty, long text, RTL, dark, high contrast, 200% text), axe-clean, keyboard operable.
- Never use assets from `docs/design-reference/` (internal reference only). Backdrops must be original or licensed, with a license file.
- Dashboards use true glass (dark, mostly transparent). `glass-reading` is only for tutor text, math, and exam items.

## Permanent owner upgrade contract (2026-11-28)

- **Today is approved/frozen.** Elevate every other shared component and future screen **to Today's finish and beyond**, without simplifying Today or leaving generic styles. The authoritative full brief is `docs/20-ui-fidelity-brief.md`.
- **One optical material across every normal control and surface**: layered neutral glass, depth-based hierarchy, gradient rim light, inner highlight/glow, subtle grain and soft cast depth. No navy/black slabs for headers, cards, learner/tutor bubbles, inputs, actions, menus or popovers. Increase glass opacity for reading or accessibility, do not create a separate flat visual material.
- Keep the approved Cole painting and add actual warm-to-cool/window-like illumination **behind panels**, so transparent glass refracts light rather than rendering as muddy brown. Tunable values belong in `src/glass.css`, never in auxiliary component-look stylesheets or screen-local duplicate recipes.
- Saturated blue is reserved for the primary CTA, the learner's bubble and the single highlighted data element; use category tints and semantic status colors only when meaningful. Polished gradient bar fills, faint gridlines, highlighted-bar bloom, uniform icon stroke/size, and a **concentric rounded mastery ring** are required.
- One tokenized type scale, light-to-semibold big values, restrained labels, **label/value on one line** (`Algebra 48%`); equal-height row peers, coherent gutters, purposeful role-specific buttons/radii, <~25% unused panel space, no orphan actions.
- No visible copy with **“sample”, “QA”, “preview”, “fixture”, “gallery”, “shared components”, “Highlighted”, “Scale: 0–100 %”**. Single `Demo data` chip only; accessibility descriptions may be visually hidden. Do not invent authenticated learning evidence.
- Every visible control must work; otherwise do not show it. Shared primitives are implemented here, screens in `apps/web` import them via `@lyceum/ui`, never screen-local copies or standalone fixture UI. Inventory and retire unused old styles/fixtures. Use `src/motion.ts` presets; test click/keyboard/empty/contrast/reduced-motion/RTL/200% text in real stateful stories and production Playwright per route.
- **Order/approval barrier:** finish and hand off **shared components first**, then **Study session → Sources → Plan → Models → Settings → Practice**, **one screen per round**. Each screen needs a **1440×900 production-build screenshot** and exhaustive real-route interactive Playwright test; run `lyceum-handoff` and wait for owner approval before continuing.
