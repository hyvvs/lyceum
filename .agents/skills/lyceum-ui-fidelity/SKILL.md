---
name: lyceum-ui-fidelity
description: Use whenever building or changing a visible Lyceum screen or component (layout, glass styling, motion, copy), or when a screen must match the design reference. Forces a screenshot-versus-reference comparison loop with a scored rubric instead of claiming a match from code.
---

# Lyceum UI fidelity loop

The visible UI must match the reference in `docs/design-reference/` as specified in `docs/20-ui-fidelity-brief.md`. Do not rely on adjectives in other docs; the brief's measurements and rubric are the target.

1. **Look first.** View `docs/design-reference/reference-home.png`, `reference-messages.png`, `reference-saved.png`, `reference-transition.png`, and `comparison-today-vs-reference.png`. If you cannot view images, say so and stop. Read `docs/20-ui-fidelity-brief.md` fully, then `docs/18-design-language-glass.md` and `packages/ui/src/glass.css` and `motion.ts`.
2. **Check prerequisites.** A photographic backdrop with structure must exist and be licensed. If it does not, ask the human for one; do not substitute a gradient and proceed.
3. **Build** the screen with `packages/ui` tokens and presets only. Follow the copy rules (no slogans, no taglines, no dev scaffolding in visible UI) and use realistic demo data.
4. **Capture.** Run the app and capture screenshots at 1440 by 900, dark theme, of every changed screen (Playwright screenshot or the project's screenshot script). Include hover and active states where relevant. For motion, record a short capture of a full navigation loop.
5. **Compare.** Put each screenshot beside the matching reference crop. Score the 10-point rubric in the brief section 6 (0 to 2 each) with one line of evidence per criterion. List the top five visible differences.
6. **Fix and repeat** up to three rounds, re-capturing each time. Stop early only at 17 or more of 20 with no zeros.
7. **Report** with before and after screenshots, the final rubric table, and any item you could not meet and why. Never claim "matches the reference" without screenshots. Also run `lyceum-ux-review` for accessibility and contrast before finishing.

Hard rules: never use assets from the reference video; never leave Empty/Synthetic toggles or fixture badges in visible chrome; never use `glass-reading` for dashboards; at most one saturated focal accent per view.
