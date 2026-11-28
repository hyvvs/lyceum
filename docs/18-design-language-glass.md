# 18. Design Language: Glass and Motion

Lyceum's visual identity is **calm, layered glass over a soft, atmospheric backdrop**, with **smooth, springy motion** (Framer Motion, now published as `motion`). The reference is the "Glassy Dashboard V5" video (`docs/design-reference/`). We replicate the *style*, never the assets.

This doc overrides the generic visual direction in `docs/01` section 4. Accessibility, performance, and learning-experience rules in `docs/01` still apply and win over aesthetics whenever they conflict (see section 8).

## 1. Principles

1. **Glass with purpose.** Translucency shows depth and hierarchy: the more important or interactive, the nearer and brighter the layer. It is never decoration on content the learner must read closely.
2. **Legibility beats beauty.** Reading surfaces (tutor text, math, exam items) use near-opaque "reading glass." Overview surfaces (Today, map, library) use true frosted glass.
3. **One focal accent per view.** Like the single blue bar in the reference chart, each screen has exactly one saturated element that says "look here" (the next-best-action, the weakest concept, the primary button).
4. **Calm motion.** Motion explains cause and effect (this came from there, this moved here). Nothing moves for its own sake, and nothing moves while the learner is concentrating on a problem.
5. **Ambient, not busy.** The backdrop is slow and quiet. Chrome recedes during study and exams.
6. **Graceful degradation.** The product must look good and read perfectly with transparency reduced, motion reduced, contrast increased, or on a weak GPU.

## 2. The shell (layout)

```
┌────────────────────────────────────────────────────────────────────────┐
│ (backdrop: pre-blurred image + scrim)                                    │
│  [⌂ Today][▤ Plan][✎ Practice][⛁ Sources][⚙ Models]        ✉ 🔔 🔍 (avatar)│  ← floating pill nav + round buttons
│ ┌──┐                                                                     │
│ │◉ │   canvas: floating glass panels on a 12-col grid, 24px gaps         │
│ │▫ │                                                                     │
│ │▫ │                                                                     │
│ └──┘  ← left dock (capsule)                                              │
└────────────────────────────────────────────────────────────────────────┘
```

- **Top pill nav:** glass pills with icon + label, centered; active pill brighter. **Right cluster:** round glass buttons (notifications with a badge, search/command palette, profile with status dot).
- **Left dock:** a vertical capsule of icon buttons. The active item is a solid bright disc (the shared-element indicator slides between items using a layout animation). Hover shows a tooltip label. Dock icons gently scale on hover (magnify effect limited to neighbors).
- **Canvas:** panels float with generous gaps; no full-width hard bars. Max content width on large screens, centered.
- **Responsive:** below 900 px the dock becomes a bottom capsule bar and the top nav collapses to a title plus the command palette. Panels stack in a single column. Touch targets at least 44 px.

**2026-11-28 prototype-only correction:** The layout sketch above records earlier intent and is **not** an accepted V5/V10 visual target. The owner rejected the earlier oversized, dark marketing-like Today render; the existing production shell remains an **unaccepted fidelity baseline** even though its technical foundation is verified. A separate `m0/visual-v5-v10-reference-prototype` branch explores actual photographic spatial depth, a compact usable learning overview, near-opaque reading, and a **single connected selection+utility-spine SVG geometry** instead of detached selected pills. The selected path is controlled by one interruptible shared spring-coordinate state, with mirrored RTL geometry, keyboard/focus semantics and instant off/reduced-motion paths. The outer grid is **not** width-animated. No library, token semantic or production routing/Today replacement is part of this Draft. Compare [reference limitations and V10 repost observations](design-reference/README.md) and [real rendered QA](qa/m0-005-visual-prototype/README.md); original owner video fidelity, physical performance and owner visual acceptance remain pending.

## 3. Tokens

Implemented in `packages/ui/src/glass.css` (CSS variables and recipes) and `packages/ui/src/motion.ts`. Values are tuned starting points; final values are set by the contrast and performance tests in section 8.

### 3.1 Surfaces (glass levels)

| Level | Use | Fill (dark theme) | Blur | Border | Shadow |
|---|---|---|---|---|---|
| `glass` | Standard panels, cards | white 6 to 8% over dark scrim | 24 px | 1 px white 12% | soft, 24 px blur, black 30% |
| `glass-raised` | Hover, selected, popovers | white 10 to 12% | 28 px | 1 px white 18% | 32 px blur, black 35% |
| `glass-float` | Dock, top pills, dialogs | white 8% + stronger rim light | 32 px | 1 px white 20%, top inner highlight | 40 px blur, black 40% |
| `glass-reading` | Tutor text, math, exam items, long reading | surface 82 to 92% opaque | 16 px | 1 px white 10% | soft |
| `glass-tint-{hue}` | Category cards (subjects, topics, source types) | hue 22 to 30% over glass | 24 px | hue-tinted rim | soft |

Light theme inverts to white-frosted glass over a bright backdrop with dark text; same structure.

### 3.2 Shape, spacing, type

- Radii: 12 (chips), 16 (buttons, inputs), 24 (cards, panels), 999 (pills, dock).
- Spacing scale: 4, 8, 12, 16, 24, 32, 48. Panel padding 20 to 24.
- Typeface: a geometric sans with a friendly feel (Poppins is open-licensed; Inter or similar acceptable) plus a math-capable face for KaTeX; sizes small and tight in chrome (12 to 14 px), generous in reading surfaces (16 to 18 px, 1.6 line height). Text is white at 100 / 70 / 50 percent for primary / secondary / tertiary, and those exact opacities must pass contrast (section 8).
- Numbers use tabular figures and count up on first appearance.

### 3.3 Color

- **Primary accent:** blue (focus bar, primary button, sent bubbles, active states).
- **Semantic:** green (gain, mastered, on track), amber (due, caution), red (risk, error), purple (conceptual/other).
- **Category tints:** the five reference hues (blue, amber, purple, green, red) map to subject areas or topic clusters; the mapping is stored with the subject so colors stay stable.
- Color is never the only signal; pair with icon, shape, or label (mastery map uses pattern as well).

## 4. Core recipe (CSS)

```css
.glass {
  background: var(--glass-fill);
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(140%);
  backdrop-filter: blur(var(--glass-blur)) saturate(140%);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-card);
  box-shadow: var(--glass-shadow), inset 0 1px 0 var(--glass-highlight);
}
```

Always ship the three fallbacks in the same file: `@supports not (backdrop-filter: blur(1px))`, `[data-transparency="reduced"]` (and the `prefers-reduced-transparency` media query where supported), and `prefers-contrast: more`. Fallbacks swap to solid surfaces with the same borders and shadows, so layout and hierarchy do not change.

## 5. Components, mapped to Lyceum

| Reference element | Lyceum equivalent |
|---|---|
| Greeting + stat cards (icon chip, big number, delta pill, sparkline) | **Today:** Due reviews, Overall mastery (range), Days to exam, Streak with grace days; deltas as pills; sparklines for mastery trend |
| Frosted bar chart with one blue bar | **Mastery by topic / weekly progress:** frosted bars; the single blue bar is the biggest lever ("fix this first") |
| "Today" list with colored left markers | **Plan for today:** blocks with colored markers per mode (review, learn, practice, repair) |
| Messages (list, chat, profile) | **Study session:** left = session plan and concept list, center = tutor conversation (learner bubbles in blue, tutor in glass), right = concept panel (mastery, errors, sources). The center uses `glass-reading` |
| Saved (tinted card grid) | **Practice library, Sources, Subjects:** tinted cards per subject/topic with icon chip and tag |
| Profile card with ring | **Learner and concept cards:** mastery ring with uncertainty halo |
| Round icon buttons, badge | Notifications (due reviews, plan changes), command palette, profile |
| Tooltips on dock | Same, with keyboard shortcut hints |

New Lyceum-specific glass pieces: **Next-best-action hero card** (largest panel, the screen's focal accent), **hint ladder control** (a segmented glass stepper), **confidence slider**, **mastery map nodes** (glass orbs sized by exam weight, ringed by mastery, pulsing only when at risk), **exam mode frame** (see section 7).

## 6. Motion spec (Framer Motion / `motion/react`)

Library: `motion` (React). Use `LazyMotion` with `domAnimation` (and `m` components) to keep the bundle small; wrap the app in `MotionConfig reducedMotion="user"`. Presets live in `packages/ui/src/motion.ts`; **components import presets and never hard-code springs or durations.**

| Interaction | Behavior |
|---|---|
| **Route/page change** | `AnimatePresence mode="wait"`. Enter: fade in, rise 12 px, un-blur from 8 px to 0 (the reference's blur-in), 350 to 450 ms ease-out. Exit: fade, rise 8 px, blur 6 px, about 200 ms. |
| **Staggered cards** | Children enter after the page with 40 to 60 ms stagger (capped at 400 ms total), each: fade, rise 16 px, scale from 0.98. |
| **Hover** | Cards lift `y: -4` with the `snappy` spring and gain `glass-raised`. Buttons brighten, no layout shift. |
| **Press** | Scale 0.98 with the `snappy` spring. |
| **Dock/pill active indicator** | Shared-element `layoutId` disc slides between items with the `smooth` spring. |
| **Tooltips** | Fade and 4 px slide, 120 ms, 300 ms hover delay. |
| **Charts** | Bars grow from the baseline, staggered 50 ms; highlighted bar settles last with a small overshoot. Numbers count up (about 600 ms) once. |
| **Chat** | New message: fade and rise 8 px. Streaming text appends **without reflow jumps** (reserve line height, no per-token animation). |
| **Mastery map** | When a concept's mastery rises, its ring animates to the new value; a brief soft glow marks real gains (once). |
| **Dialogs and sheets** | Scale from 0.96 plus fade with `smooth` spring; backdrop dims, not blurs more. |
| **Skeletons** | Soft shimmer on glass, disabled under reduced motion. |
| **Exam mode** | Chrome fades out smoothly; no ambient motion inside. |

**Presets (starting values):**
- `spring.snappy`: stiffness 420, damping 34, mass 0.9 (hover, press, small movements).
- `spring.smooth`: stiffness 260, damping 30 (shared elements, dialogs).
- `spring.gentle`: stiffness 140, damping 24 (large panels, backdrop shifts).
- `ease.out`: cubic-bezier(0.16, 1, 0.3, 1); `ease.inOut`: cubic-bezier(0.65, 0, 0.35, 1).
- `duration`: fast 0.15, base 0.25, slow 0.45.

**Motion rules**
1. Animate only `transform`, `opacity`, and (sparingly) `filter` on small elements. Do not animate `width/height/top/left`, and do not animate `backdrop-filter` blur radius (animate the layer's opacity instead).
2. Layout animations (`layout`, `layoutId`) only for the dock indicator, tab underlines, and reordering lists; not for text-heavy content.
3. Every animation has a reduced-motion equivalent (instant or simple fade). Test with `prefers-reduced-motion`.
4. No motion during active problem-solving except feedback (a correct/incorrect response gets a subtle, brief indication).
5. No more than about 12 simultaneously animating elements; stagger caps apply.
6. Respect the frame budget (60 fps on the reference device); a motion that drops frames is removed or simplified.

**Working visual Draft qualification:** JS `requestAnimationFrame` modifies the path's internal SVG geometry and opacity from `spring.smooth` state; this is a deliberately **opt-in technical exception** to the usual compositor-only transform rule for a small single connected navigation shape, needed to test true geometric morphing. It is not a shipping approval: reference-device main-thread cost, Paint/Composite tracing and dropped-frame counts must be independently measured under M0-020 before rollout. Do not use the Draft's 25 fps evidence recordings to claim the product renders at 60 fps; the recording encoder/frame sampler does not measure actual UI rendering throughput.

## 7. Learning-aware restraint

- **Study session:** the reading column and workspace use `glass-reading` (near-opaque). Math always renders on a high-contrast surface.
- **Exam mode:** minimal chrome, solid or near-solid surfaces, backdrop dimmed and desaturated, no ambient animation, no tooltips popping.
- **Focus toggle:** one key (for example `F`) dims the backdrop and hides the dock and nav; entering and leaving uses a slow `gentle` transition.
- **Feedback moments** (correct, incorrect, mastery gain) are brief and informative, never celebratory spam. Celebrate only real gains (a repaired weakness, a retention milestone) with a single soft glow and one line of text.
- **Tutor tone and visuals match:** calm, precise, no confetti.

## 8. Accessibility and performance guardrails (GATES)

1. **Contrast is measured on the worst case.** For every bundled backdrop and each theme, compute text contrast against the lightest and darkest regions behind each glass level. All text must meet WCAG 2.2 AA (4.5:1 body, 3:1 large and UI) using the actual rendered fill, not the nominal one. Tokens carry a minimum scrim so it holds on any backdrop, including user-provided images (section 9). An automated test samples the rendered pixels in Playwright.
2. **User controls** in Settings, honored everywhere: Transparency (Full / Reduced / Off), Motion (Full / Reduced / Off), Contrast (Standard / High), Backdrop (image / gradient / solid). System preferences (`prefers-reduced-motion`, `prefers-contrast`, `prefers-reduced-transparency`) set the defaults.
3. **High-contrast theme = solid surfaces** with strong borders, no blur, no transparency.
4. **Blur budget.** `backdrop-filter` is expensive. Rules: at most about 6 blurred layers visible at once; never nest blurred layers inside each other; large panels use lower blur radius; static backdrops are **pre-blurred in the image asset** so panels need only a light blur; do not blur over video or animated content; avoid `will-change` except on actively animating layers.
5. **Engine support tiers.** Detect capability and measure. Tier A (full glass): modern Chromium, Safari, WebView2, WKWebView. Tier B (reduced): WebKitGTK on Linux or low-power devices, automatically falling back to the "reduced transparency" look. Tier C (no `backdrop-filter`): solid surfaces. The app auto-downgrades if frame times exceed a threshold and tells the learner in Settings (never silently altering meaning).
6. **Focus visibility:** strong focus rings (2 px accent plus offset) visible on every glass level.
7. **Text over imagery** is never placed directly on the backdrop; it always sits on a glass level that meets contrast.
8. **Performance budgets** from `docs/01` section 6 apply, plus: first paint of the shell with backdrop under 1 s warm; backdrop images under 400 KB (WebP/AVIF) per size variant with responsive sources; idle GPU use near zero when nothing animates.

## 9. Backdrop system

- **Original assets only.** The reference's photograph is not used. Ship a small set of original or properly licensed backdrops (calm interiors, landscapes, abstract gradients), each with a documented license.
- **Pre-processing pipeline:** at build time, produce light and dark variants, responsive sizes, a pre-blurred version, and a measured luminance map used by the contrast system.
- **User backdrops:** the learner can pick a local image. The app analyzes luminance, applies an automatic scrim to guarantee contrast, and warns if the image is too busy. Images stay on the device.
- **Cheap alternatives:** animated-free mesh gradients and solid color options for low-power devices and for those who prefer minimal visuals.
- **Time-of-day and focus variants** are optional later enhancements; never required.
- **Subject theming:** each subject may pick a backdrop and tint hue, so switching subjects feels distinct while staying coherent.

## 10. Implementation plan

1. **M0-017:** `packages/ui` glass tokens, recipes, fallbacks (starting point exists in `glass.css`), Storybook with theme, backdrop, transparency, motion, and contrast controls.
2. **M0-018:** Motion presets and primitives (`PageTransition`, `Stagger`, `HoverLift`, `SharedIndicator`, `CountUp`), reduced-motion handling (starting point exists in `motion.ts`).
3. **M0-019:** Backdrop pipeline and contrast sampler test.
4. **M0-020:** Spike: glass performance on reference devices and on each webview (WebView2, WKWebView, WebKitGTK); produce tier thresholds.
5. Then build shell, dock, pill nav, and the Today screen as the first full demonstration of the language (part of M0-004 and M4).

## 11. Review checklist (used by the `lyceum-ux-review` skill)

- [ ] One clear focal accent per view.
- [ ] Reading and math surfaces use `glass-reading` and pass contrast on every bundled backdrop.
- [ ] Reduced transparency, reduced motion, and high contrast all look finished, not broken.
- [ ] Motion uses presets only; transform/opacity only; no layout thrash; stagger caps respected.
- [ ] No nested or excessive blur layers; frame times within budget on the reference device.
- [ ] Focus rings visible on all glass levels; keyboard flows intact through the dock and pills.
- [ ] No assets from the reference video or any unlicensed imagery.
