# 20. UI Fidelity Brief (read this before touching any screen)

Supersedes the vague parts of `docs/18-design-language-glass.md`. Where docs/18 and this brief disagree, **this brief wins**. The reference is `docs/design-reference/` (internal reference only; never ship its images). The first Today screen missed the reference; `docs/design-reference/comparison-today-vs-reference.png` shows how.

## 1. What went wrong (the six misses)

1. **One giant milky panel.** The reference is *many separate floating panels* with gaps between them. A single near-white container is a card, not glass.
2. **Fill is far too opaque and light.** Reference glass is a **dark, mostly transparent** fill (white at about 6 to 10 percent over a dark scrim) with blur, so the backdrop shows through. Ours reads as frosted plastic.
3. **No real backdrop.** Glass needs something to blur: a **photographic scene with structure** (window frames, horizon, warm light, objects). A flat teal gradient gives glass nothing to refract, so it looks fake.
4. **Empty and decorative.** Half the panel is blank and the hero is a clipped decorative sphere that does nothing. The reference is *dense*: stat cards with numbers and sparklines, a chart, a list. Density with hierarchy is what makes it feel premium.
5. **Slogan copy.** "Return to an idea.", "A library, before it fills up.", "Find your next step, without the noise." is the exact tone of generic AI-made UI. The reference uses plain labels and numbers.
6. **Dev scaffolding in the product UI.** The Empty/Synthetic toggle, "Synthetic fixture" badge, and Reset button must not be in the visible chrome.

"Calm" in our docs means *quiet and uncluttered*, **not empty and not pale**. "Legibility beats beauty" applies to long reading text only, not to dashboards.

## 2. The target, measured (Today screen at 1440 by 900, dark theme default)

**Backdrop**
- Full-bleed photographic image, warm dusk or similar, with visible structure. Pre-blurred slightly (about 6 to 10 px) at build time, plus a scrim of about `rgb(8 10 16 / 0.40)`.
- It must be an image we have rights to (license-free photo with a checked license, or a generated image we own). **Never** the reference video's photo. If no image is available, stop and ask the human for one; do not substitute a gradient and call it done.

**Glass panels** (see `packages/ui/src/glass.css`; tune, do not replace)
- Fill: white 6 to 8 percent. Blur 24 to 32 px with `saturate(140%)`. Border 1 px white 12 to 18 percent. Inner top highlight 1 px white 14 percent. Radius 24. Shadow: 0 12px 32px black 30 percent.
- Text on glass: white 100 / 72 / 52 percent. Body 13 to 14 px, labels 12 px, stat values 28 to 32 px semibold, title 22 to 24 px.
- `glass-reading` (near-opaque) is **only** for the tutor text column, math, and exam items, never for dashboards.

**Shell**
- **Top pill nav** centered: Today, Plan, Practice, Sources, Models. Pills are glass-float, icon + label, active pill brighter. **Right cluster:** three 40 px round glass buttons (search/command, notifications with a red badge, settings) plus an avatar with a green status dot.
- **Left dock:** a 56 px-wide capsule of icon-only buttons, vertically centered, 24 px from the left edge. Active item = a 40 px solid white disc with a dark icon, animated with a shared-element slide. Tooltip label on hover. No second "rail", no tab that merges into a white strip, no workspace card inside the dock.

**Today layout** (12-column grid, 24 px gaps, panels float with visible backdrop between them)
- Row 0: greeting "Good evening, {name}" (22 px) with a one-line subtitle; on the right a segmented control (Week / Month / Term) and an Export button.
- Row 1: **four equal stat cards**: icon chip, label, big value, delta pill (green/red), 24 px sparkline. Lyceum content: Due reviews, Overall mastery (range, for example 62% ± 8), Days to exam, Streak (with grace days).
- Row 2, left 2/3: **Mastery by topic** panel with frosted bars (white about 40 percent) and **exactly one saturated blue bar** (`#3b82f6`) for the biggest lever. Right 1/3: **Today's plan** list: time, title, colored left marker by mode (review, learn, practice, repair), small avatar-style chips optional.
- The **Next best action** is the single focal accent: a primary blue button on the plan panel or a wide card in row 1. One saturated element per view.
- Empty space inside a panel: at most about 25 percent.

**Other screens** (same language, different layouts)
- Study session = the reference's Messages: three panes (session plan | tutor conversation with blue learner bubbles and glass tutor bubbles | concept panel). Center pane uses `glass-reading`.
- Sources and Practice library = the reference's Saved: grid of **tinted glass cards** (blue, amber, purple, green, red) with icon chip and category tag.

## 3. Copy rules (tone guide applied to UI)

- Labels are nouns and numbers: "Due reviews", "12", "Days to exam", "21". Buttons are verbs: "Start session", "Review 12 cards".
- **No taglines, no slogans, no poetic fragments, no sentence-style headings with trailing periods, no "without the noise" phrasing.**
- Greeting is "Good evening, {name}". Subtitles state facts ("3 topics need attention before your exam").
- Empty states are plain and actionable: "No goal yet. Create one to get a plan." with a button.
- Microcopy never explains the design ("Synthetic fixture · no learner data", "Examples only").

## 4. Demo data and developer tools

- Use realistic **demo data** for dashboards (names, numbers, trends) so the UI looks like the real product. Mark it with one small "Demo data" chip in the top bar at most.
- Developer toggles (Empty/Synthetic, Reset, fixtures) live in a hidden dev panel opened with `Ctrl+Shift+D`, not in the visible UI.

## 5. Motion (verify by recording, not by reading code)

Page change: content fades in from a blur and rises 12 px, cards stagger in (40 to 60 ms), hover lifts cards 4 px, dock indicator slides between items, bars grow from the baseline, numbers count up once. Use `packages/ui/src/motion.ts` presets. Record a screen capture of a full navigation loop and compare it with the reference clip frame by frame.

## 6. Scoring rubric (agents must score themselves with evidence)

Score each 0 to 2 (0 miss, 1 partial, 2 matches). **Pass = 17 or more of 20, with no zeros.**

| # | Criterion | Check |
|---|---|---|
| 1 | Photographic backdrop with depth | Structure visible through panels |
| 2 | Glass fill dark and mostly transparent | Backdrop clearly shows through each panel |
| 3 | Multiple separate panels, visible gaps | No single container holding everything |
| 4 | Top pill nav and right round buttons | As specified |
| 5 | Icon-only dock capsule, white active disc | No extra rail, tooltips work |
| 6 | Dense, real-looking data | Stat cards with sparklines, chart, plan list |
| 7 | One focal accent | Single blue bar and primary button, nothing else saturated |
| 8 | Typography and contrast | Sizes per section 2; contrast measured on the backdrop |
| 9 | Copy and cleanliness | Passes section 3; no dev scaffolding visible |
| 10 | Motion | Blur-in, stagger, hover lift, shared-element dock, count-up, reduced-motion fallback |

## 7. Process (see the `lyceum-ui-fidelity` skill)

Never claim a match from code. Capture screenshots at 1440 by 900 (dark theme), place them beside the reference crops, score the rubric, list the top five differences, fix, and repeat up to three rounds, then report before/after screenshots with scores. If you cannot view images, say so and stop.
