---
name: lyceum-ux-review
description: Use for any UI change on the Lyceum repo, or when asked to review a screen or component against the experience bar, accessibility rules, and glass design language. Read-only review.
---

# Lyceum UX review

Review only: do not edit files. Review the diff of the current branch against main (`git diff main...HEAD`). Output a prioritized list of BLOCKER, SHOULD-FIX, and NOTE items; each cites file and line and the rule it breaks. If everything is clean, say so and list what you checked. This works best in a fresh chat, separate from the one that wrote the code.

Read `docs/01-experience-and-quality-bar.md` and `docs/18-design-language-glass.md` first, and use both checklists (docs/01 section 9 and docs/18 section 11).

Check the following **owner-controlled permanent list** from `docs/20-ui-fidelity-brief.md` before accepting any UI work:

- [ ] **Today is visually unchanged and approved**; no legacy shell, auxiliary component-look CSS, competing live fixture/screen clone, or user-facing gallery entry. Enumerate all leftover old UI/fixture files and classify rework/wire, dev-only gated or delete.
- [ ] Every normal surface uses **one layered glass** with gradient rim light, inner highlight/glow, subtle grain, soft shadow and appropriate depth; **no flat navy/black slabs** on panes, buttons, inputs, headers, menus or chat bubbles; fallback retains accessible polished hierarchy.
- [ ] The licensed Cole painting is retained; meaningful soft warm-to-cool/window light sits **behind glass** to prevent muddy brown cards. Color discipline: blue only primary CTA, learner chat and **one highlighted data element**; tints/status colors only in their semantic roles.
- [ ] One tokenized type/icon scale, legible big light-to-semibold numerals, small labels; `Algebra 48%` on the same line; consistent icon stroke/size, equal-height grid peers, Today's gutters, <~25% unused panels, no orphaned controls or generic outlines.
- [ ] Mastery ring is truly concentric with rounded ends and soft glow; gradient charts have faint gridlines, balanced data labels/values, one accented bar; polished role-specific primary/secondary/tertiary/icon actions and motion presets from `packages/ui/src/motion.ts`, with reduced-motion/contrast/opacity/200%-text/RTL variants.
- [ ] Visible UI contains none of **“sample”, “QA”, “preview”, “fixture”, “gallery”, “shared components”, “Highlighted”, “Scale: 0–100 %”**. **One `Demo data` chip** is the sole demo marker. Content is believable but never falsely claims real learner outcomes.
- [ ] **Click/keyboard ACTIVATE every visible control** in one Playwright spec per **real route**; state/navigation/action changes, no console exceptions, hidden controls for unfinished features. Screens import real components from `@lyceum/ui` and live in `apps/web`, not test-fixture lookalikes.
- [ ] After **each screen** the developer supplies an inspected **1440×900 production-build launched-app screenshot**, current `pnpm verify`, route Playwright + axe, evidence-based rubric and unresolved differences. **Stop after each round for owner approval**. Order: **shared components → Study session → Sources → Plan → Models → Settings → Practice**. Verify `lyceum-handoff` was run and `docs/STATUS.md` updated.

Reviewers remain **read-only**; report BLOCKER/SHOULD-FIX/NOTE with file:line and evidence, not generic praise. Code-only visual assertions or Storybook-only screenshots do not establish a real production screen.
