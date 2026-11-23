# M0-003 Select: original Chromium visual and accessibility evidence

Eight **real Chromium viewport screenshots** of the isolated Radix Select Storybook stories, with the popup **open**. The capture checks each required story's theme, transparency, real 100%/200% root font size, that the portalled listbox stays within the viewport, no document horizontal overflow, no nested blur, and that full-transparency really has computed blur while off is solid. This is not a mockup or end-to-end product visual fidelity acceptance.

| Story | Image | Viewport |
| --- | --- | --- |
| Dark fallback | [select-dark.png](select-dark.png) | 800×520 |
| Dark, full frosted glass | [select-dark-full.png](select-dark-full.png) | 800×520 |
| Dark, solid fallback side-by-side counterpart | [select-dark-opaque.png](select-dark-opaque.png) | 800×520 |
| Light | [select-light.png](select-light.png) | 800×520 |
| High contrast | [select-high-contrast.png](select-high-contrast.png) | 800×520 |
| RTL | [select-rtl.png](select-rtl.png) | 800×520 |
| 200% text | [select-double-text.png](select-double-text.png) | 320×256, root 32px |
| Long labels at 200% text | [select-long-double-text.png](select-long-double-text.png) | 320×256, root 32px |

## How to reproduce

1. Checkout this exact branch, run `corepack pnpm install --frozen-lockfile` then `corepack pnpm storybook:build`.
2. Run `corepack pnpm exec vite preview --outDir storybook-static --host 127.0.0.1 --port 6006 --strictPort` in one terminal.
3. In another terminal, run `node docs/qa/select/capture.mjs`. Only a local HTTP preview is accepted.
4. Run `corepack pnpm verify`, unrestricted `corepack pnpm audit`, `corepack pnpm test:ui` and inspect `tests/ui/select.spec.ts`.

## Limits and the mandatory Glassy Dashboard V5 checkpoint

The Select Storybook stage uses a **clearly temporary, token-derived abstract gradient** to make real frosted translucency visually inspectable next to an opaque fallback. It is **not** an original/licensed atmospheric background asset and is not copied from any reference. This scoped component slice verifies no nested blur and a keyboard-accessible, readable popup; it does **not** satisfy M0-017's full visual hierarchy, original/licensed atmosphere, floating pill navigation, left dock, tinted layered cards or rendered-pixel contrast. Full design fidelity must be visually compared with the reference's proportions, layering, lighting and atmosphere in M0-017; motion belongs to M0-018, licensed images and contrast sampling to M0-019, cross-WebView performance to M0-020 (after M0-017 and M0-005). A computed CSS filter and axe success alone are insufficient. Never reuse the original reference video assets.

At 320×256/200%, the menu is constrained to the viewport and individual long option labels wrap inside its scrolling viewport. The long-label screenshot deliberately presses `End` and captures focus on the final **History** option, which may be only partly visible in that short initial viewport. Keyboard `End` reaches the last option, and Playwright exercises selection and focus return. Do not read a cropped viewport screenshot as proof that offscreen items are unavailable.
