# M0-003: accessible Tabs — real Storybook screenshot evidence

These seven images come from actual local Chromium rendering of `m0/ui-tabs` Storybook, not generated mockups. The capture script checks theme, transparency, root text scale and absence of page horizontal overflow before saving **viewport-only** PNGs. It checks that the full-transparency story has an actual `backdrop-filter` and that opaque states disable it.

| Story | Image | Viewport and key setting |
| --- | --- | --- |
| Dark, full transparency | [tabs-dark-full.png](tabs-dark-full.png) | 800×520; real blur-capable tablist |
| Dark, solid fallback | [tabs-dark-opaque.png](tabs-dark-opaque.png) | 800×520; no blur |
| Light | [tabs-light.png](tabs-light.png) | 800×520; light solid fallback |
| High contrast | [tabs-high-contrast.png](tabs-high-contrast.png) | 800×520; solid, high-contrast borders |
| RTL | [tabs-rtl.png](tabs-rtl.png) | 800×520; directional layout |
| 200% text | [tabs-double-text.png](tabs-double-text.png) | 320×256; 32px root |
| Long labels at 200% text | [tabs-long-double-text.png](tabs-long-double-text.png) | 320×256; internal tablist scroll |

At 320×256, only the initial viewport is pictured; long labels are **not truncated** but may extend the horizontal scrolling tablist and push the active reading panel below the fold. Playwright separately proves keyboard access to later tabs, tablist visibility, active panel availability, no horizontal document overflow and axe compliance. The screen is not claimed to contain every panel in its first viewport.

## Reproduce

1. On the Tabs branch, install with `corepack pnpm install --frozen-lockfile`, then `corepack pnpm storybook:build`.
2. In one terminal start `corepack pnpm exec vite preview --outDir storybook-static --host 127.0.0.1 --port 6006 --strictPort`.
3. In another terminal run `node docs/qa/tabs/capture.mjs`. The script only accepts a loopback HTTP preview and writes the seven files alongside itself.
4. Run `corepack pnpm verify`, `corepack pnpm audit` and `corepack pnpm test:ui`; the browser regression suite is `tests/ui/tabs.spec.ts`.

## Scope and design obligations

These are **isolated M0-003 component states**, with one tokenized frosted tablist in full-transparency mode beside a deliberately solid readable tabpanel. The Storybook stage itself uses a flat backdrop; a CSS blur capability check does **not** validate actual image-backed contrast or the full product appearance. The Glassy Dashboard V5-inspired atmosphere, layered/tinted panels, floating pill navigation and icon dock, spring motion, licensed original backdrops, rendered-pixel contrast checks and per-WebView performance remain non-negotiable and depend on M0-017 to M0-020 according to `tasks/M0-foundations.md`, `docs/18` and ADR-0008. Do not claim full visual or WCAG acceptance based on these images or axe alone.
