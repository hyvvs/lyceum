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

## 2026-11-28 · V10 navigation reference and visual-prototype evidence status

**The owner rejected the previous Lyceum Windows screenshot and all assistant-created schematic/mockup baselines.** They are not fidelity targets. The required primary sources are **the complete, original owner-supplied Glassy Dashboard V5 and Glassy Sidebar V10 videos**, inspected continuously and sequentially, including interruptions and reverse transitions. The resumed workspace contains **only the two derivative V5 sheets above**; neither full original video is available as an attachment or source file. Consequently, **the full-speed original V5 transition study, exact original V10 verification and true two-video side-by-side comparison are BLOCKED / NOT RUN**. None of the stills permits measured timings, easing, blur, typography or material equivalence.

An independently obtained **public, unverified 5.34-second Glassy Sidebar V10 repost** was examined sequentially for an *interim* interaction prototype, but has **not** been authenticated as the owner's original. Source (view only; never committed): `https://ttanon.com/@paulcodes4/video/7711257600326716693`. The working copy and sampled frames are excluded from Git. Observed in that repost, *not verified against the owner's original*:

| Approximate repost playback position | Visual observation | Design inference / explicitly unverified |
| --- | --- | --- |
| 0.4 seconds | Narrow, translucent icon rail with a compact bright selection | Exact collapsed width, blur, lighting, spring and hover behavior unknown |
| 1.6 seconds | Rail begins expanding, its icons separate from newly revealed labels | Continuity of every original intermediate frame is unverified |
| 2.2 seconds | Expanded tinted navigation body and a single white utility spine physically joined to a white active navigation row | White connected shape should be one continuously morphing surface, not a separate pill plus unrelated strip |
| 3.3 seconds | Highlight follows navigation activation without a disconnected round-pill jump | Exact original damping/stiffness/selection focus/interrupt behavior unknown |
| 4.3 seconds | The active bright connection appears to move to a different row while the vertical spine remains attached | Reverse, burst-input, reduced-motion, keyboard and RTL semantics are original Lyceum engineering requirements, not claims about the video |

**V5 only from the existing user-derived still sheets:** outdoor-lit interior scene, full-bleed photographic depth, frosted floating panels, compact icon rail, calm center top controls, changing dashboard/messaging/saved-card compositions. Source sheets do not prove continuous V5 playback or any motion timing. Exact comparisons around the owner-requested ~1.2s, ~2.8s and ~4.6s are **not made**.

**Separate visual Draft prototype (not rollout):** `m0/visual-v5-v10-reference-prototype` implements an opt-in shared interruptible SVG-connected rail and 12 working isolated Storybook states. Evidence, human acceptance gaps, two genuine full-speed platform-renderer recordings, fallback snapshots and licensed local *substitute* photography are indexed at [M0-005 visual QA](../qa/m0-005-visual-prototype/README.md). Source imagery and public V10 repost are **not** shipped. This is a **reference-inspired technical prototype**, *not* exact authenticated video fidelity, a new production shell, or owner aesthetic approval.

## 2026-11-28 · New directly supplied V5-style example and owner redesign instruction

**After the historical availability note above**, the owner supplied a new video attachment, a **576×1024, 30 fps, approximately 5.67-second** portrait-format video displaying the on-screen title *Glassy Dashboard V5*. Its 170 frames were decoded for direct sequential inspection; sampled positions around 1.2 seconds, 2.8 seconds and 4.6 seconds were inspected along with the other frames. The video shows an interior-image desktop background, subtly bordered translucent window-like panels and a compact left icon rail. Between approximately 1–2 seconds it displays a dashboard/chart composition; around 2.8–3.6 seconds a message-oriented composition; around 4.2–5 seconds a multicolumn saved-content composition. These are **observations of the new user upload**, not authenticated original-owner asset or animation-easing measurements. The clip also contains a title and code-video overlay; neither is a Lyceum UI target. The attachment is **not copied into Git**, and no video frames, code or wallpapers are reused.

The owner explicitly clarified that the clip demonstrates the desired **liquid-glass optical quality and calm fluid transition character, NOT an exact layout or structure to reproduce**, and rejected the then-current working prototype as generic AI-styled UI. The redesign brief therefore emphasizes legible organized work surfaces, hierarchy, restrained glass edges and depth, smooth interruptible route/selection transitions and a genuinely usable responsive learning workspace. It eliminates synthetic vanity metrics, arbitrary bright card colors, gratuitous chips and index labels, repetitive boxed panels, and decorative icon overload from empty/working states. An authentic verified pair of original V5/V10 complete source assets and the formal owner side-by-side acceptance comparison **remain unavailable/not completed**; the newer example should not be mislabeled as either authenticated original.
