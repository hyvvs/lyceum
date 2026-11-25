# M0-017 Stage B2 — reserved reading navigation, evidence and review

**Status: owner-authorized B2 Draft PR candidate only. No merge, milestone completion or release authorization.** Based on protected `main` `cc21572ccee8d42bc7ceea1f33457c2d2c8421d1` and owner-accepted B1 commit `f89f7776b460dcf6a9c8c3847c1323501e005469`. Development branch `m0/glass-stage-b2-safe-navigation`. The B1 branch and its original five RED PNGs remain unchanged. B1 acceptance/B2 approval are explicit owner decisions, not proof of M0-003 or M0-017 completion.

## Architecture and measured fallback rule

- `apps/web/src/router.tsx` retains real Today/Settings routes, native `nav` landmarks, labels and TanStack Router links. Both pill and Dock read the same **app-private** two-destination specification; public PillNav/Dock are **not** implemented. The Dock is moved into `.shell-auxiliary`, outside `.application-frame`; the existing PWA update banner is in the same auxiliary region. No Worker, SW logic, CSP, dependency, public interface, motion, backdrop asset, or fabricated learner state changes.
- Normal desktop preserves the centered top pill, fixed vertical Dock and **logical-inline-start** reading gutter/Dock placement. Native logical properties also place purely decorative hero art on the opposite side of RTL reading. The normal desktop reading frame and update banner reserve actual block space rather than letting banners overlay content.
- Normal mobile (width up to the existing 900px breakpoint) scrolls the **real `.application-frame`** (`overflow-y:auto`) within a viewport-height flex shell. A glass capsule remains in a separate persistent auxiliary row **outside the scrolling frame**, with real 48×48px native links, appropriate safe-area padding, and no fixed mobile overlay or artificial 110px bottom padding.
- `apps/web/src/navigation-layout.ts` measures actual `visualViewport.height`, physical viewport width, computed root font size, Dock height, PWA prompt height, auxiliary padding/gap, header height **and initial frame/main top padding**. Available first-view reading height equals visual height minus the measured reserved block chrome and initial reading insets. Minimum reading height is `max(224 CSS px, 14 × computed root font size)`; the persistent Dock's height is subtracted only when it occupies a **mobile bottom row**, not when fixed in the **desktop inline gutter**. When available height is smaller than this floor, the shell switches to genuine document scrolling and moves the Dock and any update banner **in flow after the footer**. This also covers exceptionally short wide viewports; it uses no device-name/user-agent rules. Both layout modes use the same measured auxiliary padding, preventing mode-history hysteresis.
- The private `ResizeObserver`, root-style `MutationObserver`, window resize and `visualViewport` resize listeners recalculate on changes. No new dependency, global navigation store or focus manager exists. Mode transitions carry over the previous owner scroll offset when practical and **reveal an already focused control only if it moved outside the new visible scroll area**; they never replace focus or change Tab order. Native browser links, skip target, lazy-heading focus, keyboard traversal and route actions remain in charge. Existing translucent, opaque, high-contrast and reduced-motion recipes are retained. A narrowly scoped `forced-colors` system-text treatment prevents Chromium painting the CTA label as an invisible white-on-white inline child; the 320px setup status row wraps rather than expanding document width at enlarged text.

**Actual observed threshold examples from Chromium logs:**

| Condition | Visual viewport | Computed root | Dock row / initial content insets | Usable first-view reading | Minimum | Chosen mode |
| --- | --- | --- | --- | ---: | ---: | --- |
| Normal mobile | 390×844 | 16px | Dock row 66px, frame+main inset 48px, header 60px | **650px** | 224px | Reserved persistent capsule |
| Short mobile at CSS 200% text | 320×256 | 32px | Dock row 66px, inset 48px, header 60px | **62px** | 448px | In-flow |
| Exceptionally short desktop | 1440×260 | 16px | Desktop Dock in inline gutter (0px bottom row), inset 56px, header 84px | **108px** | 224px | In-flow |

These are **CSS px and emulated Chromium viewport observations**. Actual physical virtual-keyboard/safe-area behavior, native browser UI zoom, screen readers and Windows Contrast themes still require qualified human/device checks. The 224px/14-line rule is an explicit B2 engineering safety floor, not a WCAG or device-certified threshold.

## Regression compatibility: original RED remains real

Adapted B1 test only in separate commit `55a1393396590a6c16d11140908868b464c39594`. Original prose/fixture geometry, five configurations, actual wheel scrolling, settled positions, per-line `Range.getClientRects()`, control bounds, nonempty intermediate samples, final action/paragraph and natural Tab/Shift+Tab, and **strict zero-overlap** assertion were not weakened. The test discovers the actual scrolling owner (`.application-frame` or document), wheels within that reading surface, clips to visible scrollports, and permits an offscreen Dock **only** for independently proven `data-navigation-mode="flow"` with a nonfixed native nav reached by keyboard.

Validation used a **detached clean baseline worktree of production `cc21572...`**, into which the adapted test alone was copied, built and run. `corepack pnpm install --frozen-lockfile` succeeded; the first nested `corepack pnpm web:build` invocation in that isolated worktree failed because the child script's `pnpm` executable was absent from PATH. The equivalent direct `corepack pnpm --filter @lyceum/web build` succeeded. Playwright on the untouched baseline then returned **5 RED, exit 1**, all on `Meaningful visible text lines/controls must not be covered by the Dock`, with original genuine overlaps **16 / 65 / 38 / 171 / 17** (normal 390, short 320, 390/32px, short 320/32px, RTL 390). The detached baseline worktree was removed after verification; the accepted B1 branch was not touched. [Original B1 screenshots and RED details](../m0-017-stage-b-b1/README.md).

## Production Chromium results and historical failures

The **same adapted B1 assertion is GREEN** on B2 in all five cases. Each had **zero** actual Dock/text/control overlap; observed reading samples were 5 (390), 19 (320), 18 (390/32px), 73 (320/32px) and 5 (RTL). The 390/32px view still has sufficient measured space for reserved nav; both short 320 views use real in-flow navigation and prove the Dock reachable by natural Tab. The extra nine layout cases validate persistent geometry, 44px targets, responsive in-flow reachability, skip link, Tab/Shift+Tab, lazy-heading route focus, readable focus ring, scroll/keyboard focus across mode switches, history-independent thresholds, exceptionally short wide fallback, 320px 200% text overflow, desktop LTR/RTL, emulated forced colors, opaque theme and reduced motion. The new genuine **A→B waiting-service-worker** test uses an isolated copy of real built SW assets, asserts banner/frame/Dock separation, unsent-marker persistence before consent and reload **only** after the update click.

**Truthful failure history:** an early focused resize test found that Dock focus remained attached but became offscreen after switching to in-flow mode; B2 now reveals the existing focus without replacing it. First full web-suite run had **25 passed, 1 failed, 1 skipped**: the **existing** 320×640/32px horizontal-overflow assertion detected `documentElement.scrollWidth=325px` versus width `320px`. Diagnosis identified the real setup status chip at `right=324.6px`; wrapping that small-screen row fixed the underlying flex overflow **without changing the assertion or relying on clipping**. A screenshot-grounded reviewer found a real emulated forced-colors setup CTA label visually blank despite its accessible name; limited `HighlightText`/transparent inline-child treatment fixed the rendered screenshot. All three findings were reproduced, corrected inside authorized shell scope, and regression-tested.

**Hosted security scan correction:** the first Draft PR exact-head [run 45574800345](https://github.com/hyvvs/lyceum/actions/runs/45574800345) at B2 commit `3de3ca4ee01cb0921837067ee78b718f11692642` passed Dependency audit but failed Secret scan. Local reproduction with the same `detect-secrets==1.5.0` command located one **hex-high-entropy false positive**: the literal public main Git SHA in `tests/web/navigation-obstruction.spec.ts`'s console-only `baseline` metadata, **not a secret**. The exact SHA remains in this QA documentation; the redundant metadata now gives a textual reference to the QA evidence. An identical unrestricted local scan then reported **zero suspected findings**; no CI rule, exclusion, scanner baseline or lockfile was modified. The original B1 fixture, tests and strict overlap assertion are unchanged. The first hosted failure remains historical, not PASS; require three green jobs on the corrected PR head.

**Final local verification on the B2 working tree (prior to Draft PR):** frozen install PASS; `corepack pnpm verify` PASS (110 Windows unit passes, 1 expected Windows-only skip, boundary/agent/type/lint PASS); Vite production build + static Workbox PASS; full production browser **27 passed, 1 optional screenshot capture skipped**; `corepack pnpm storybook:build` PASS; full Chromium `corepack pnpm exec playwright test --config playwright.config.ts --workers=4` **101 passed**, with `AXE_COVERAGE_VERIFIED unique_stories=197 required_states=220 executed_states=220`; unrestricted audit `No known vulnerabilities found`. Final production **initial-route gzip 163,719 bytes** (HTML 589 + ICU 12,671 + entry JS 143,557 + CSS 6,902), within the **250,000-byte budget**; dedicated Worker adds **24,045** gzip bytes, **187,764** bytes including Worker. Hosted PR exact-head CI is a **separate, mandatory gate**, not substituted by earlier main CI. No supported platform/manual accessibility case is completed by these browser checks.

### Genuine B2 screenshots (separate from unaltered B1 RED images)

All are Chromium captures of the **real built application**, not Storybook or reference-video assets:

| Condition | Screenshot |
| --- | --- |
| Initial normal mobile / persistent capsule | [Initial](mobile-initial.png), [persistent row while scrolling](mobile-persistent-row.png) |
| Extended genuine wheel-reading fixture at intermediate positions | [390×844](mobile-390-reading.png), [390×844/32px](mobile-390-text-200-reading.png) |
| Short viewport in-flow and real focus | [320×256](short-320-in-flow-navigation.png), [320×256/32px](short-320-text-200-in-flow-navigation.png), [reading](short-320-text-200-reading.png) |
| RTL | [RTL reading](mobile-390-rtl-reading.png), [RTL high-contrast/opaque](rtl-opaque-forced-colors.png) |
| Native focused navigation link | [Keyboard focus ring](keyboard-focus.png) |
| Actual waiting service-worker update | [Reserved prompt](pwa-waiting-reserved.png), [In-flow prompt](pwa-waiting-in-flow.png) |
| Desktop existing visual direction | [Desktop LTR](desktop-preserved.png), [Desktop RTL](desktop-rtl.png) |

Additional captures: [short normal reading](short-320-reading.png) and [short in-flow navigation](short-in-flow.png). References above are relative to this README. All B2 PNGs were recaptured after the RTL/forced-colors/focus fixes.

### Reproducible commands

```powershell
corepack pnpm install --frozen-lockfile
corepack pnpm verify
corepack pnpm --filter @lyceum/web build
corepack pnpm exec playwright test --config playwright.web.config.ts tests/web/navigation-obstruction.spec.ts --workers=2
corepack pnpm exec playwright test --config playwright.web.config.ts --workers=2
corepack pnpm storybook:build
corepack pnpm exec playwright test --config playwright.config.ts --workers=4
corepack pnpm audit
# Opt-in evidence recapture (otherwise tests write no screenshot files):
$env:LYCEUM_B2_CAPTURE='1'
corepack pnpm exec playwright test --config playwright.web.config.ts --workers=2
Remove-Item Env:LYCEUM_B2_CAPTURE
```

## Independent read-only checks and remaining boundaries

An independent architecture/security code reviewer identified mode-dependent padding hysteresis, an exceptionally short wide viewport case and focused-control visibility after transition. These were fixed; new tests cover the behavior. The separately launched UX reviewer did not initialize, so the architecture/security reviewer was independently tasked with a **separate screenshot-grounded UX/accessibility review**. It inspected all 16 PNGs, identified the high-contrast CTA rendering defect, and later confirmed the corrected CTA, RTL art separation, responsive reading/Dock geometry, focus ring and PWA prompt without a remaining confirmed B2 screenshot blocker. Reviews were read-only, not qualified human native AT testing or formal GitHub approvals.

**Known limits:** Browser rectangle sampling is not native pixel-based contrast or screen-reader proof. The root 32px scale is CSS text enlargement, **not** browser UI zoom. Viewport resizing is not a physical software keyboard. The temporary CSS atmosphere is not the final V5 licensed imagery/fidelity milestone. Desktop contains two intentional semantic navigation landmarks with duplicate Today/Settings keyboard destinations; B3 must reassess the final public nav design without disabling keyboard access. No new FocusScope/focus trap/store/dependency, SW change or privacy/CSP change. ADR-0009 and ADR-0010 (including the Workbox override removal/full retest trigger) remain in effect.

**BLOCKED / NOT RUN:** all 20 manual M0-003/M0-004/READ-01 cases, real Windows 11 Edge NVDA and native dark/light Windows Contrast, applicable axe `incomplete` manual dispositions and physical/native browser zoom, supported macOS VoiceOver/Android TalkBack matrix, owner/independent reviewer signoff. M0-003, M0-004 and M0-017 remain `[~]`. No M0-017 milestone completion, WCAG certification, final V5 acceptance, public release, Stage B merge, B3–B5, M0-005 or M0-018–020 authorization.

**Proposed B3, subject to separate owner authorization:** implement only bounded public `PillNav` and `Dock` presentational semantic primitives in `packages/ui` using existing tokens/Tooltip/native nav attributes/refs/children; compose the same two application-owned routes in `apps/web`, retain keyboard naming/aria-current and reconcile duplicate landmarks/stops; add fail-closed Storybook and axe inventory states and dedicated navigation/RTL/short-height focus regressions. No Today glass/card migration, tokens, dependencies or focus scope under B3 without explicit new scope.
