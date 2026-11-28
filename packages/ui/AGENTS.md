# packages/ui: scoped rules (adds to the root AGENTS.md)

- Visual language: `docs/18-design-language-glass.md`. Tokens and recipes live in `src/glass.css`; motion presets in `src/motion.ts`.
- Use tokens and presets only: no hard-coded colors, blur radii, spacing, springs, or durations.
- Text, math, and exam items sit on `glass-reading`. Every view has one focal accent. Never place text directly on the backdrop.
- Always provide the fallbacks: no `backdrop-filter`, reduced transparency, high contrast, reduced motion. They must look finished.
- Animate only transform, opacity, and small-element filter; never animate `backdrop-filter` radius; at most about 6 blurred layers visible; no nested blur.
- Each component needs Storybook stories for all states (default, hover, focus, disabled, loading, error, empty, long text, RTL, dark, high contrast, 200% text), axe-clean, keyboard operable.
- Never use assets from `docs/design-reference/` (internal reference only). Backdrops must be original or licensed, with a license file.
- Dashboards use true glass (dark, mostly transparent). `glass-reading` is only for tutor text, math, and exam items.
