# Tooltip PR #7 — visual and accessibility acceptance evidence

Captured 2026-11-23 on Windows Chromium from the built Storybook preview for `m0/ui-tooltip-storybook`. These are screenshots of the **real opened Tooltip** on Lyceum's Storybook solid fallback surface, not design mockups or screenshots of the future learner app.

## Storybook captures

| State | Evidence | Viewport and checked globals |
| --- | --- | --- |
| Dark | [tooltip-dark.png](./tooltip-dark.png) | 800×520; dark, standard contrast, 100% text |
| Light | [tooltip-light.png](./tooltip-light.png) | 800×520; light, standard contrast, 100% text |
| High contrast | [tooltip-high-contrast.png](./tooltip-high-contrast.png) | 800×520; dark, high contrast, 100% text |
| 200% text | [tooltip-200-percent-text.png](./tooltip-200-percent-text.png) | 320×640; dark, standard contrast, 200% text (32px root) |

The capture script verifies the named Storybook globals and that the tooltip is visible before saving PNGs. To reproduce from the PR branch, first run `corepack pnpm install --frozen-lockfile` and `corepack pnpm storybook:build`. Start `corepack pnpm exec vite preview --outDir storybook-static --host 127.0.0.1 --port 6006 --strictPort` in one terminal. In another terminal, run `node docs/qa/pr-7/capture.mjs` from the repository root. Stop the preview when finished; do not run concurrent Storybook/Playwright preview servers.

## Visual inspection against `docs/18-design-language-glass.md`

The light/dark states have a calm floating panel, token-based rounded borders, distinct tooltip/trigger hierarchy and legible foreground. High contrast adds the strong outline without blur; the tooltip remains opaque in all shown states. At 200% text on a 320px screen, both tooltip and trigger text wrap visibly without horizontal clipping. The UI contains no copied reference imagery or third-party font asset. CSS computed values in the capture probe included opaque dark `rgb(29, 42, 60)` with white text, and light `rgb(228, 235, 245)` with dark text; `backdrop-filter` was `none`.

This is **component-level solid-fallback evidence** only. It does not establish photographic-backdrop pixel contrast, transparency-full rendering across backdrops, a completed app navigation hierarchy, performance/frame budgets, or macOS/Safari/WebKitGTK behavior. M0-019 contrast sampling and M0-020 cross-platform performance remain separate gates. An isolated Tooltip cannot demonstrate the full view's single focal accent or dock.

## Reproducible review findings and dispositions

| ID | Finding / reproduction | Disposition |
| --- | --- | --- |
| T7-01 | Default Radix `TooltipTrigger` renders a `<button>` without `type`; inside `<form>` it implicitly submits. Reproduce via `renderToStaticMarkup` of a form wrapping a Tooltip trigger. | **Fixed in this PR** by a safe `type="button"` default in Lyceum's trigger wrapper; added SSR regression in `tooltip.test.ts`. `asChild` consumers must still use semantic, non-submitting child controls. |
| T7-02 | A CSS test initially used Storybook's explicit Full motion setting, which was reapplied on open and took precedence over simulated OS reduced motion. | Corrected test setup to remove Storybook's override *after* mounting, then checked real `prefers-reduced-motion: reduce`; test passes. No product motion rule was weakened. |
| T7-03 | Prior browser reflow test covered standard tooltip text at 320×640/200% only; the long-text variant at 320×256/200% had not been exercised. | Exploratory browser probe found the tooltip fully within viewport; permanent Playwright regression now checks its vertical/horizontal bounds. The Storybook document may scroll vertically, which is acceptable. |
| T7-04 | Public controlled `<Tooltip open={true}>` can remain visible after Escape if its owner ignores `onOpenChange(false)`. | **Nonblocking API contract**: Escape dismissal is verified for uncontrolled or correctly controlled use; consumers controlling `open` must honor `onOpenChange`. No claim that an unresponsive controlled parent can be overridden. |
| T7-05 | Hover tooltip alone is not available to touch-only users, nor to keyboard users on a disabled trigger. | **Integration constraint**: never put essential instructional content only in a tooltip. Use visible text or an explicit accessible hint action when building the app shell. |
| T7-06 | Storybook preview emits large tooling-chunk and Radix `use client` directive notices. | Nonblocking for the current browser-only Storybook build; no learner-app bundle-size or future RSC conclusion inferred. |

## Verification and review provenance

Run from the repository root: `corepack pnpm verify`, `corepack pnpm audit` (no severity filters), `corepack pnpm storybook:build`, and `corepack pnpm test:ui`. After the regression fixes the local results were **63 unit tests passed, one Windows symlink fixture skipped, 26 Playwright/axe tests passed**, four package typechecks green, and **no known audit vulnerabilities**. The 26 browser cases comprise eight Button, eight Dialog and ten Tooltip cases; Tooltip covers keyboard focus, 650ms pointer-on-tooltip persistence, Escape while focused/hovered, RTL portal, narrow 200% layout, OS and explicit reduced motion, computed opaque contrast (at least 4.5:1 in sampled themes) and all Storybook axe states. Captures were reproduced with `node docs/qa/pr-7/capture.mjs`.

Two **internal read-only coding-agent reviews**, one UX/accessibility and one architecture/security, examined the exact original GitHub PR diff (`origin/main...69bdf39`) independently. Their findings are addressed above; their reports are **not formal GitHub pull-request reviews**. On 2026-11-23, GitHub's PR API returned `reviews: []` (zero submitted formal reviews). The initial PR head `69bdf39` passed all three hosted checks in [run 45013631993](https://github.com/hyvvs/lyceum/actions/runs/45013631993); new evidence and regression commits require a **fresh hosted CI run for their latest SHA** before acceptance. PR #7 must remain a draft and **must not be merged without the user's explicit approval**.
