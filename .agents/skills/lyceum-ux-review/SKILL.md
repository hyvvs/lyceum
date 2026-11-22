---
name: lyceum-ux-review
description: Use for any UI change on the Lyceum repo, or when asked to review a screen or component against the experience bar, accessibility rules, and glass design language. Read-only review.
---

# Lyceum UX review

Review only: do not edit files. Review the diff of the current branch against main (`git diff main...HEAD`). Output a prioritized list of BLOCKER, SHOULD-FIX, and NOTE items; each cites file and line and the rule it breaks. If everything is clean, say so and list what you checked. This works best in a fresh chat, separate from the one that wrote the code.

Read `docs/01-experience-and-quality-bar.md` and `docs/18-design-language-glass.md` first, and use both checklists (docs/01 section 9 and docs/18 section 11).

Check: the single next action is obvious; one focal accent per view; empty, loading, partial, and error states; keyboard-only operation and focus order; screen-reader labels and live regions; contrast measured on every bundled backdrop; reduced transparency, reduced motion, and high-contrast fallbacks look finished; reading and math surfaces use `glass-reading`; tokens and motion presets only; stable layout during streaming; source labels and privacy badges visible; performance budgets; no assets from the reference video. Run Playwright and axe checks if configured and include screenshots or selectors.
