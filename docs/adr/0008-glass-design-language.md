# ADR-0008: Glass design language and Framer Motion

- Status: accepted
- Date: 2026-11-22

## Context
The project lead supplied a reference video ("Glassy Dashboard V5") and wants Lyceum to replicate that UI type: frosted glass panels over an atmospheric backdrop, floating pill nav and icon dock, tinted cards, and smooth Framer Motion animation. Lyceum is also a learning tool where reading, math, and exams demand legibility, and it must run on several webviews and weaker GPUs.

## Options considered
1. **Full glass everywhere:** closest to the reference; risks contrast failures, jank, and distraction during study.
2. **Glass for chrome and overview, near-opaque "reading glass" for text, math, and exams (chosen):** keeps the look and protects learning.
3. **Conventional flat UI:** safest; does not meet the product vision.

## Decision
Adopt option 2. The language is specified in `docs/18-design-language-glass.md` and implemented in `packages/ui` (`glass.css`, `motion.ts`). Animation uses `motion` (Framer Motion) through shared presets with `LazyMotion` and reduced-motion support. Accessibility, performance, and fallbacks are release gates. Backdrops are original or licensed assets, pre-blurred at build time, with measured luminance and an enforced scrim. Reference frames are internal only.

## Consequences
+ Distinctive, polished identity aligned with the reference; clear rules for agents; accessible fallbacks.
- Added engineering cost: backdrop pipeline, contrast sampler, tiered fallbacks, performance tuning per webview (spike M0-020).
- Some platforms (for example WebKitGTK) may default to the reduced-transparency tier.
Revisit if: the M0-020 spike shows glass cannot meet frame budgets on a supported platform, or contrast tests cannot be satisfied on user-provided backdrops without unacceptable scrim strength.
