# Design reference: "Glassy Dashboard V5"

Frames extracted from the reference video the project lead supplied. **Internal reference only. Do not ship, copy, or redistribute these images, the video, or its background photograph.** Lyceum implements an original design in this style; it uses its own backdrops (see `docs/18-design-language-glass.md` section 9).

- `reference-contact-sheet.jpg`: frames across the whole clip (page transitions Home → Messages → Saved).
- `reference-closeups.jpg`: four close-ups (blur-in transition, Home dashboard, Messages, Saved grid).

## What the reference shows (observed)
1. Full-bleed blurred photo backdrop with a dark scrim.
2. Frosted, dark-tinted glass panels with hairline light borders, large radii, soft deep shadows.
3. Floating top pill navigation (icon + label pills) and a right cluster of round glass buttons (mail, notifications with a red badge, search, avatar with status dot).
4. Left vertical icon dock in a capsule; active item is a bright white disc; tooltip labels on hover.
5. Stat cards: icon chip, label, large value, green delta pill, small sparkline.
6. Chart with frosted white bars and one saturated blue bar as the focal accent.
7. Three-pane messages: list, conversation (blue sent bubbles, glass received bubbles), profile panel.
8. Saved items as tinted glass cards (blue, amber, purple, green, red) with icon chip and category tag.
9. Motion: content blurs in and fades up on page change; cards stagger in; hover lift; dock selection moves smoothly.
10. Typography: geometric sans, small sizes, white at several opacity levels.

Exact blur radii, opacities, and easing curves are not visible in a video; the values in the design doc are our own tuned starting points.
