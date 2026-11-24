# PR #16: tall-body Dialog + separately portalled Select — approval checkpoint

## 2026-11-24 · audit #17 owner-approved consumer proof of concept (newer evidence)

**First exact-head hosted Linux cross-check was RED:** [run
45474734072](https://github.com/hyvvs/lyceum/actions/runs/45474734072)
at `c719ead7405dda1a3db421100c25fb17e5f5ddc2` passed frozen install,
`pnpm verify`, Storybook build, Dependency audit and Secret scan, plus
`AXE_COVERAGE_VERIFIED unique_stories=141 required_states=164 executed_states=164`,
but its full Chromium run **failed 3/88 (85 passed), each on retry**.
Actual natural-keyboard focus existed, but Chromium Linux returned only
**99.7274%** element intersection for Shift+Tab Acknowledge, **99.4673%**
for the initial 100%-scale Select trigger and **99.3253%** for Home-focused
Mathematics. The failure is an acceptance blocker even though fractional
intersection alone does not prove unreadable glyphs. The follow-up adds
**QA-consumer-only** token-based native scroll clearance for focused control
external outlines, an explicit computed outline+scrollport geometry check,
and the existing actual screenshot glyph/focus-ring proof for Home-focused
Mathematics (instead of blanket 100%-row intersection or a lowered ratio).
The remaining strict control geometry, Popper alignment, keyboard paths,
44px targets and all earlier scenarios remain. **New exact-head hosted Linux
Verify is still required; this entry is not a green Linux claim.**

Owner **approved a QA-consumer-specific bounded reading/controls layout and use
of the existing DialogContent.onOpenAutoFocus hook**, but **did not authorize
merging, new Dialog/Select public APIs, dependencies, custom focus ownership,
global positioning observers or a general Dialog CSS redesign**. The
historical findings below remain accurate for the explicitly preserved
`tall-unbounded` variant. The new default QA `tall` variant is an
independently scrollable, semantically labeled reading region plus a separate
labeled controls grid, within the unchanged Radix modal Dialog.

**Consumer layout/focus contract:** `tests/fixtures/runtime-preferences.stories.tsx`
adds an on-open callback that prevents only Radix's *default initial choice*
and focuses the visible `h3#qa-tall-reading-start[tabindex=-1]` reading-start
target, positioned **before** the independently scrollable region in normal
DOM order. The existing Radix trap, nested portal, active Select option,
close-focus restoration and inert lifecycle remain in charge. The heading
has an explicit token-colored inset outline when focused. The reading
`role=region[aria-label="Study preparation notes"][tabindex=0]` has a
token-colored solid `glass-reading` fallback, a native scrolling window
bounded by `max(var(--target-min), min(28dvh, 12rem))`, and all four original
paragraphs without truncation. **Forward Tab** from the heading enters the
reading scrollport (including at 320×190); PageDown/End/Home and pointer wheel
scrolling expose its first and last paragraphs, then Tab moves to Acknowledge, first real
Select, Save, second real Select and the Dialog's own Close control.
At 320×190 and both actual text scales, the matrix also checks the first/last
paragraph's visible intersection and `elementFromPoint` hit target; at 190px
and RTL it activates Close through natural keyboard Tab/Enter and verifies
focus restoration and cleanup. This is paragraph-area hit-testing, **not** a
glyph-by-glyph reading-contrast certification.
**No requirement says these must all fit simultaneously at 320×190/200%.**

`tests/fixtures/runtime-preferences.css` is **test-fixture only**. It
separates `qa-bounded-reading` from `qa-bounded-controls`, uses existing
Lyceum spacing/color/target tokens, and specifically overrides the
short-height **whole-body sticky** CSS for this bounded composition. To
protect naturally focused controls' **external 3px outline plus offset**
from fractional Linux/Dialog scroll clipping, the bounded Dialog alone uses
logical native `scroll-padding-block: var(--space-3)` and its own
buttons/Select triggers use `scroll-margin-block: var(--space-2)`.
These are scroll clearance tokens for this one consumer, **not** hard-coded
popup translations or Radix positioning overrides. It
does not alter `packages/ui/src/glass.css` or any production component.
When the user's preference state reflows an open Select, a fixture-local
`useLayoutEffect` locates the **actual open trigger within that Dialog** and
brings it into view with native `scrollIntoView({block:"center"})`; centering is
based on the native Dialog scrollport, **not a fixed popup offset**, and retains
the trigger's external focus outline after Radix closes its popup. Browser
scrolling may in principle affect its scrollable ancestors, so the regression
also checks that this Storybook page's own scroll position is unchanged. Radix independently
recomputes the portalled popup's top/bottom placement. No listener,
new focus target, popup offset or global positioning service is installed.
The effect is limited to this deliberate preference change; arbitrary
DOM mutations, mobile virtual keyboards and every custom Dialog layout are
**not** claimed to be supported.

**Measured genuine 200% Chromium proof (actual root 32px):**

| State | Previous unbounded screenshot | Approved bounded consumer screenshot |
| --- | --- | --- |
| Keyboard-open 320×256 | [Acknowledge focused offscreen](tall-initial-focus-before.png): y1203.6–1302 | [Reading-start focus visible](tall-bounded-initial-256.png): heading y171.6–218.8; its separate scroll region begins at y230.8 and becomes available through forward Tab |
| Keyboard-open 320×190 | Prior unbounded long-body offscreen initial focus (same root cause) | [Reading-start focus visible](tall-bounded-initial-190.png): heading y71.6–118.8, Dialog scrollTop 100, with native clearance and reading frame beginning y130.8; reachable by forward Tab |
| Open portalled Select live 100%→200% at 320×256 | [Popup/focus entirely offscreen](tall-live-scale-before.png): popup y693–925, last focus y875–919 | [Same-node live popup visible](tall-bounded-live-scale-256.png): Radix popup **and wrapper** y162–243.6, focused Literature y194–238, actual trigger y100.8–154.4 |
| Reading end at 320×256 | Previously all 1,020px reading flowed unbounded before controls | [Last paragraph via internal native scroll](tall-bounded-reading-end-256.png): reading scrollTop 1,157 of max 1,157, frame y91.8–163.4; last text shown with a distinct thicker focus ring |
| ArrowDown at 320×256/200% | Prior hosted Linux at old unbounded head saw 99.0057% option area visible | [Rendered Physics glyph and focus ring](tall-bounded-arrow-focus-256.png): active row y198–242 in the after screenshot; a separate automated actual-pixel test also checks glyph and inset ring visibility before and after live text scaling, without assuming complete list visibility |
| Forced colors and RTL | Native platforms not tested | [Chromium-emulated forced colors](tall-bounded-forced-colors-256.png): selected label and purple system Highlight focus ring readable; [800×256 RTL](tall-bounded-rtl-800.png): right-aligned glyphs and visible final option |

The pixel check now also covers Home-focused **Mathematics** for each 320×190,
320×256 and 800×256 scale/direction matrix case, in addition to the original
ArrowDown Physics checks. It uses the actual Chromium screenshot, checks item text
bounds in **both axes** against its real option scrollport, popup and viewport,
requires hit-testable text, samples **both** contrasting glyph pixels and
background pixels within the selected text box (rejecting an opaque solid
rectangle), samples the defined **inset** focus-ring stroke, and logs exact
subpixel row-edge clipping. This sampled paint evidence is not OCR or
glyph-by-glyph contrast certification. It replaces only the overly
strong 100%-intersection assumption for the fractionally clipped **option rows**;
the End strict visibility and Home actual text/ring proof, 44px option targets,
strict full-control and external-focus-ring visibility, and usability requirement
are retained. This means a marginal subpixel intersection on Linux will be
assessed by actual rendered glyph/ring evidence, not hand-waved as accessible.

**Historical red-first proof is preserved, not skipped:** A separate
Playwright test selects `composition:"tall-unbounded"` and proves that its
original initial Acknowledge focus remains offscreen **and** its open portal
still goes offscreen on live 100%→200% scaling. The two original regression
scenario titles now assert their **authorized accessible behavior** on the
bounded version. `capture-tall.mjs` explicitly targets the historical
unbounded version, with the previous diagnostic-only intervention images
still correctly labeled; `capture-tall-bounded.mjs` creates the actual
new screenshots independently.

**Shared production CSS boundary:** The compact-content short-height
`position:sticky` selector in `packages/ui/src/glass.css` remains in place
because the previous 320×190/256 and long-*description* corrections depend
on it and still have independent tests. It is **not** a supported guarantee
for arbitrary lengthy Dialog bodies. This proof of concept suppresses
that sticky behavior only within its explicitly bounded QA consumer.
Any future production consumer must adopt and validate an intentional
reading/controls pattern; turning this QA fixture into a public layout
contract or revising shared Dialog structure requires separate approval.

**Completed local acceptance (Windows Chromium, 2026-11-24):**
`corepack pnpm install --frozen-lockfile`, `corepack pnpm verify`,
unrestricted `corepack pnpm audit` and `corepack pnpm storybook:build`
all **PASS**; 95 Vitest tests pass with one expected Windows skip, and
**the complete Chromium/Playwright/axe suite passes 88/88 tests**. The
reporter confirms `AXE_COVERAGE_VERIFIED unique_stories=141
required_states=164 executed_states=164`; original default-executed
64-rule axe tests remain enabled, not counted as native accessibility
certification. Both the bounded positive tests and the original
unbounded expected-failure reproduction execute as real keyboard tests;
not one is skipped or quarantined. In the center-aligned live preference
case, focused last option y194–238, popup **and Radix wrapper**
y162–243.6, real trigger y100.8–154.4; after Home/ArrowDown,
Physics glyph y203.2–236.8 is entirely visible despite **0.40625px**
of row-edge clipping. Screenshot sampling confirms **590/2400 contrasting
glyph pixels** and **30/36 inset focus-ring probe pixels**, and
hit-testing reaches the real glyph. These are *local Chromium rendered
pixels*, not evidence of universal contrast or real OS high-contrast.

One intermediate concurrent browser run reported **87 passed, 1 failed**:
the pointer-wheel scenario did not reach the reading region's scroll maximum
after a test-only direct `scrollTop=0` reset immediately following PageDown.
The isolated scenario passed. The test now uses **native Home**, awaiting
zero scroll before a real pointer-wheel action; the subsequent **complete**
suite passed **88/88**, retaining last-paragraph, focus and axe requirements.

**Still pending separate acceptance:** exact-head hosted Linux
Verify/Dependency audit/Secret scan, owner review and a separate merge
decision. Fresh independent read-only **UX, architecture and security**
reviews, plus follow-up reviews of the small final QA changes, reported **no
blockers**; these are not formal GitHub review approvals. No automatic merge
is approved. This proof does **not**
establish native Windows forced colors, manual screen-reader or touch
testing, arbitrary/custom Dialog structure, system visual-viewport
keyboard changes, imagery rendered-pixel contrast or supported-WebView
performance acceptance.
M0-003 remains `[~]`; ADR-0009 is an APPROVED DEFERRAL. The Glassy
Dashboard V5 atmospheric glass and floating-pill identity plus the separate
M0-018/019/020 gates remain mandatory future work.

---

**2026-11-24 · DRAFT / DO NOT MERGE.** This is an investigation and *test-only*
follow-up to the verified correction at `17267585` and its documentation head
`6afb71b`. No new public UI API, production CSS, Radix positioning/focus
contract, dependency, custom focus manager, or global observer has been changed.
The owner authorized test-first investigation and explicitly required a stop
before implementing any structural composition contract or architectural
positioning solution. **That stop condition is now met.**

## Reproduction is real keyboard input, not artificial `focus()`

The QA-only runtime-preferences fixture can now render four genuinely long
study-preparation paragraphs **inside DialogContent's children** (rather than
its short/long `description`), followed by a native Lyceum Button, the first
real Select with ten options, a Save Button, a second real Select and the
Dialog's built-in Close Button. All content stays in the DOM and its native
scrolling flow. QA preference events update actual mounted React state for
100%/200% text, reduced motion, high contrast and opaque surfaces. The test
story is deliberately under `QA/*`, outside the existing `Primitives/*`
141-story/164-state axe inventory.

At **320×256, actual root 32px (200%)**, the four preceding paragraphs occupy
**1,020px**, with Dialog scrollable extent **1,658px**. Opening is via Tab to
the original Dialog trigger followed by Enter; there is no programmatic focus
in any acceptance test. **Two independent red-first failures**:

| Acceptance requirement | Unmodified PR #16 production behavior |
| --- | --- |
| Visible initial Radix Dialog autofocus | Radix chose the real **Acknowledge study notes** Button but left Dialog scrollTop **0**. Focused button rect **y1203.6–1302.0**, completely outside the 256px viewport. Actual screenshot shows only beginning of reading content, without visible focus. The red regression waits 5 seconds for full visible focus and fails. |
| Same-mounted preference change while Select is open | At 100% text the first Select was reached by **real Tab**, visibly focused, then keyboard-opened. Changing the root to 200% with the **same Select portal node still connected**, then pressing End, left trigger **y933–987**, popup and Radix wrapper **y693–925**, and last focused option **y875–919**. No focused glyph is visible. The red regression waits 5 seconds and fails. |

Both are normal, supported user flows. The first is not caused by the
short-height sticky rule because no Select is open or focused at that point.
The second is not an artificial focus scenario: the same Dialog and portalled
Select are open, text size changes through the real QA React preference state,
and the keyboard remains on a real Radix option. The offscreen popup is a
positioning *consequence of its real anchor leaving the scrollport*, not a
separate `translate`, a change of Radix focus ownership or an inaccessible
name.

## What does work without modification

From the initially offscreen Acknowledge control, **ordinary Tab** causes the
Dialog to scroll naturally to **scrollTop 1134**, makes the first Select trigger
fully visible at **y101–155**, and allows opening its separate Radix portal.
End focuses the final option at **y43–87**, with popup **y12–93** exactly aligned
with its Popper wrapper. Shift+Tab returns to a visible Acknowledge control;
Tab moves back to Select. Home/ArrowDown, Escape/visible focus return, 44px
option targets, internal list scrolling, pointer History selection, sibling Save,
second Select, Close, original Dialog-trigger focus return and modal lock cleanup
work in the *separate positive-flow test*. The 320×190 and 800×256
**actual Radix `dir="rtl"`** cases, plus compact/long-description compositions,
were exercised as
separate positive tests. This distinction matters: **the old 900px CSS
pseudo-element / programmatic focus probe overstated the ordinary Tab failure**,
but did not cover invisible *initial* autofocus or a *live* text change while
focus remained in the portalled listbox.

## Before and experimental-only screenshots

The reproducible `capture-tall.mjs` script uses the actual local built
Storybook fixture and real Chromium screenshots. Every image is **320×256**,
at actual 200% root text when captured. The experimental images are *not*
implemented production behavior and are **not claimed fixes**.

| State | Red production behavior | Diagnostic-only intervention |
| --- | --- | --- |
| Dialog first opens via keyboard | [Initial focus offscreen](tall-initial-focus-before.png), y1203.6–1302, scrollTop 0 | [Scroll-only focus-event experiment](tall-initial-focus-diagnostic-only.png), same selected Acknowledge Button y143.6–242, scrollTop 1060 |
| Open Select, then live 100%→200% | [Portal and option offscreen](tall-live-scale-before.png), popup y693–925, focused last option y875–919 | [One-shot trigger `scrollIntoView` experiment](tall-live-scale-diagnostic-only.png), trigger y188.4–242, popup and wrapper y12–180.4, focused option y130–174 |

The first experiment is an **ephemeral capture-script listener**, outside any
production component. The second calls `scrollIntoView({block:"nearest"})`
**once** on the actual trigger after reflow. It does not translate the popup,
change focus, hide text or shrink controls. Both help identify mechanisms,
but no production subscription/timing/consumer contract exists to activate
them reliably at the right points.

## Ownership and alternatives considered

1. **Let Radix own Popper, use native trigger scrolling.** This is best for an
   already-focused trigger when the user actually presses Tab; the browser
   scrolls the Dialog and Radix's popup moves with its positioning wrapper.
   Installed Radix FocusScope **1.3.1** intentionally invokes
   `element.focus({preventScroll:true})` for initial autofocus, so opening a
   long Dialog may select an offscreen target. A small scroll-only callback in
   the existing Dialog would fix that *one* focus event without taking over
   Radix's target or restoration. It **cannot solve the second failure**:
   after 100%→200%, focus remains in the independently portalled option, so
   no Dialog focus event occurs to scroll the displaced trigger. Watching
   resize/reflow, synthesizing new scroll events, or coordinating an open
   portal with its now-offscreen trigger is a new positioning responsibility;
   it should not be slipped into this QA PR.
2. **Only stick an intended control region, not the entire body.** The current
   short-viewport CSS sticks the whole `.lyceum-dialog__body` while it
   contains an open/focused Select. That succeeds for a compact body but
   cannot hold the first Select at the viewport edge when its entire containing
   body extends beyond the scrollport. Targeting an arbitrary ancestor of the
   Select via generic CSS `:has` is fragile: an unrelated reading section may
   still be in that same ancestor, and the sticky element cannot escape its
   containing block. A robust sticky controls region would require **a
   defined DOM/layout boundary** (or a new Dialog subcomponent/slot) rather
   than a selector guessing at the consumer's structure. This is a
   **structural composition contract**, outside the current permission.
3. **Explicit complex-Dialog consumer layout with accessible fallback.**
   This is the **recommended separate owner decision**. Keep Radix ownership
   and the current public primitives, but define and test an intentional
   reading region with accessible overflow, a distinct controls region, and a
   clear initial reading/focus policy using the existing Dialog hooks. For a
   reading-first dialog, explicitly review a **visible static reading-start
   heading** as the initial Radix focus target (rather than silently focusing
   a Button after the full reading section); this proposed consumer behavior
   is **not** implemented or authorized yet. In
   very short heights, both reading and control areas must remain reachable
   through visible keyboard focus, mouse/touch scrolling and the Close
   action; do not demand all items fit simultaneously. The design must also
   handle two active Select triggers sequentially, their portalled popup
   collision measurements, live 100%/200% text, RTL, reduced motion,
   high-contrast/solid surfaces, and actual viewport changes. Introducing
   that contract or a private helper is expressly **not authorized in PR #16**.

**Smallest proposal for approval:** authorize a *consumer-specific* bounded
reading/controls layout for complex Dialog contents (no new public primitive,
dependency or focus manager by default), with a documented **visible
reading-start** initial-focus target and real same-mounted preference-reflow
behavior. Require a fresh
red/green browser matrix and independent UX/architecture/security review of
the exact proposed layout before authorizing any production change. If that
layout cannot preserve Radix placement and the existing APIs, return to the
owner with a separately scoped architecture proposal rather than adding a
global overlay/positioning manager.

No broad Dialog restructuring, arbitrary popup translation, fixed pixel
offset, forced scroll that skips reading, `forced-color-adjust:none`, text
truncation, smaller targets or new focus ownership is justified by the
evidence. **Current recommendation: DO NOT MERGE PR #16.**

## Acceptance boundaries

The previously corrected emulated forced-colors screenshot and pixel
assertions, compact short-height focus, Radix popup/wrapper alignment,
long-`description` reflow, same-mounted runtime preference checks, real
64-rule axe scans and the **141/141 primitive stories / 164/164 required
states** remain separate regressions and must not be weakened. Current
new tall-body acceptance adds **two intentionally failing tests** while
this architecture decision is pending; a red hosted Verify is an honest
signal, not permission to disable them. Full gates and exact-head CI results
are recorded on draft PR #16 after execution.

**Local Windows validation (2026-11-24):** frozen `corepack pnpm install
--frozen-lockfile` **PASS**; `corepack pnpm verify` **PASS** (95 Vitest passes,
one expected platform skip; boundaries, agentcheck, types and lint clean);
unrestricted `corepack pnpm audit` **PASS**, no known vulnerabilities;
`corepack pnpm storybook:build` **PASS**. The **full** `corepack pnpm test:ui`
intentionally exits nonzero: **84 Chromium tests pass, exactly 2 new tall-body
acceptance cases fail** with the measured offscreen initial-focus and
live-reflow errors above. Its reporter still prints
`AXE_COVERAGE_VERIFIED unique_stories=141 required_states=164 executed_states=164`.
No original test or axe rule was disabled, skipped, or weakened.

Chromium geometry/keyboard automation is not native Windows forced-colors or
human screen-reader signoff. Original/licensed-image rendered-pixel contrast
and M0-019, M0-018 motion and M0-020 WebView performance remain distinct
gates. **M0-003 stays `[~]`; ADR-0009 remains an APPROVED DEFERRAL**,
not an implemented FocusScope. Glassy Dashboard V5 atmospheric glass, pill
navigation, left dock, tinted cards, rim lighting, typography and polished
solid fallbacks remain mandatory at M0-017, not implemented here.
