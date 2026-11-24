# PR #16: tall-body Dialog + separately portalled Select — approval checkpoint

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
