# M0-017 Stage B1 — production reading-obstruction regression

**Scope:** Owner-authorized, test-first B1 checkpoint against unchanged production code. A failing assertion is expected **only** if actual rendered reading text or a control intersects the real fixed mobile Dock; unrelated test failures are not evidence.

**Baseline:** `cc21572ccee8d42bc7ceea1f33457c2d2c8421d1` (PR #20 squash merge); post-merge hosted run [45555800157](https://github.com/hyvvs/lyceum/actions/runs/45555800157) passed Verify, unrestricted Dependency audit and Secret scan. The baseline provides 111 Linux unit passes, 101 Chromium UI passes, 197 unique primitive stories / 220 axe states and 12 web passes (one optional screenshot-capture skip).

**Fixture and test:** `tests/web/navigation-obstruction.spec.ts` inserts an explicitly labeled, original, test-only extended reading article within the genuine loaded Today screen's main `.screen`. It uses ordinary headings, paragraphs, existing `glass-reading` and action classes, and a functional link to the real Settings route; no learner records, model responses, CSS position overrides or production code are changed. The prose resembles a multi-section learning explanation, with intermediate passages, a final paragraph and an action. It is **not** a production reading-intensive consumer or a substitute for manual READ-01.

**Commands:** `corepack pnpm web:build` then `corepack pnpm exec playwright test --config playwright.web.config.ts tests/web/navigation-obstruction.spec.ts --workers=2 --reporter=list`; repeat unchanged. Existing web regressions must be run separately by passing only the pre-existing spec filenames. `corepack pnpm verify` and `corepack pnpm audit` remain independent gates. This deliberately failing B1 test must not be merged as a green implementation.

**Method:** Five independent Chromium cases: 390×844, 320×256, both sizes at computed 32px root text (200% of 16px) and 390×844 RTL. Wheel scrolling samples actual viewport-clipped `Range.getClientRects()` text-line rectangles, controls, Dock position, scrollY, root font size and direction. Reading is unfocused while scrolling. Separate natural Tab and Shift+Tab traversal checks final action reachability. Nonempty visible text samples at multiple scroll positions prevent empty/footer-only passes. Rectangular overlap shows possible occlusion, not rendered-pixel opacity, speech output, native browser zoom or virtual-keyboard results.

## Actual Chromium results — verified RED, not a passing implementation

Environment: **Windows 11 Pro build 26200**, Node **22.20.0**, pnpm **9.15.0**, Playwright **1.65.1**, Chromium via the existing Playwright runner, production Vite preview at `127.0.0.1:4173`. Test run used the unchanged production build of baseline `cc21572ccee8d42bc7ceea1f33457c2d2c8421d1` (the only changed executable file is the new test). CSS-root font size and `direction` were independently read via `getComputedStyle` in every case; **32px is 200% root CSS text enlargement, not native browser UI zoom**.

| Test | Actual viewport, computed root / dir | Visible-reading scroll samples | Actual line/control overlaps | Representative **paragraph** overlap at scrollY (CSS px) | Screenshot |
| --- | --- | ---: | ---: | --- | --- |
| `mobile-390` | 390×844, 16px / LTR | 6 | **16** | `scrollY=1215`, **126 × 21 px** | [Normal mobile](mobile-390-overlap.png) |
| `short-320` | 320×256, 16px / LTR | 19 | **65** | `scrollY=1722`, **126 × 21 px** | [Short mobile](short-320-overlap.png) |
| `mobile-390-text-200` | 390×844, 32px / LTR | 17 | **38** | `scrollY=3645`, **126 × 43 px** | [200% mobile](mobile-390-text-200-overlap.png) |
| `short-320-text-200` | 320×256, 32px / LTR | 73 | **171** | `scrollY=4551`, **104.11 × 43 px** | [200% short](short-320-text-200-overlap.png) |
| `mobile-390-rtl` | 390×844, 16px / RTL | 6 | **17** | `scrollY=1215`, **126 × 21 px** | [RTL](mobile-390-rtl-overlap.png) |

The actual Dock bounds (CSS viewport coordinates) were `left=132, top=762, right=258, bottom=828` at 390×844, and `left=97, top=174, right=223, bottom=240` at 320×256. Visible content was measured at **initial, intermediate and final** reading positions, not just the footer. At least one nonempty rendered reading line was required per recorded sample, including the sampled paragraph intersecting the Dock. `scrollY` advanced by genuine wheel events and settled before measurement. Both the final paragraph and the real Settings action were reached, and the action was reached by natural Tab, then Shift+Tab and Tab again, **before** the zero-overlap assertion was evaluated.

**Actual assertion output:** all five independent cases failed specifically with `Error: Meaningful visible text lines/controls must not be covered by the Dock`; Playwright reported `5 failed` and exit code **1**, not missing selectors, timeouts, trace errors or fixture errors. Initial exploratory execution detected two too-strict short-viewport end-of-scroll conditions; that **harness** condition was corrected without modifying fixture geometry, production code or the zero-overlap expectation and is not counted as successful defect evidence. Subsequent complete executions, including the final unchanged rerun, yielded **5/5 intentional obstruction assertion failures** with the same per-configuration rectangle counts shown above. Screenshots were captured when an actual **paragraph** (not merely the test fixture title) intersected the Dock.

For reproduction:

```powershell
corepack pnpm web:build
corepack pnpm exec playwright test --config playwright.web.config.ts tests/web/navigation-obstruction.spec.ts --workers=2 --reporter=list
# Repeat the exact same Playwright command; expect exit 1 and five obstruction failures.
```

**Unchanged baseline verification (separate from the intentional RED):** `corepack pnpm verify` passed boundaries, agentcheck, typecheck, **110/110 Windows units plus one expected Windows-platform skip**, and Biome lint; `corepack pnpm web:build` passed with static Workbox generation; the five original production web spec files passed **12/12**, with the separate optional screenshot-capture test skipped; `corepack pnpm audit` returned `No known vulnerabilities found`. The unchanged Storybook build passed; `corepack pnpm exec playwright test --config playwright.config.ts --workers=4` passed **101/101 UI tests**, with `AXE_COVERAGE_VERIFIED unique_stories=197 required_states=220 executed_states=220`. Baseline exact-main hosted CI [45555800157](https://github.com/hyvvs/lyceum/actions/runs/45555800157) separately passed all required jobs with 111/111 Linux units, 101/101 UI, 197 stories / 220/220 axe states.

## Interpretation and bounded B2 correction target

The current mobile Dock is `position:fixed` from `apps/web/src/shell-navigation.css`, placed at bottom center in `apps/web/src/responsive.css`, while `router.tsx`'s `revealFocusedControl` only clears **focused actionable controls**. Genuine unfocused paragraph lines move beneath the real Dock at intermediate wheel positions. No test content is artificially placed, absolutely positioned or forced to overlap.

**B2 must make the unchanged regression GREEN** by reserving a persistent bottom navigation row **outside** the actual reading scrollport, and falling back to in-flow navigation whenever viewport/text/keyboard geometry leaves insufficient reading space. Maintain adequate visible reading area and protect focus, scroll restoration, anchors, virtual keyboard, RTL, safe-area and PWA prompt coexistence. Do not simply extend bottom padding or add a focused-control scroll workaround; those would not eliminate intermediate unfocused-text overlap. Full B2 scope and implementation require **separate owner authorization**. This test is not authority to change production code.

**Detection limitations:** Clipped `Range.getClientRects()` reports rectangular line bounds and Dock intersections; it does not prove per-glyph pixel overlap/opacity, contrast, spoken screen-reader output or future browser zoom. The screenshot documents the real overlay in current Chromium, but this is not a native Windows Contrast, NVDA, Safari VoiceOver, Android TalkBack or virtual-keyboard manual observation. The test-only fixture is not a substitute for a real reading-intensive consumer or READ-01. **M0-003/M0-004/M0-017 remain `[~]`; all 20 canonical manual accessibility cases remain BLOCKED / NOT RUN.** ADR-0009 and ADR-0010 are unchanged, including the Workbox override removal/full retest trigger. Neither B2 implementation nor Stage B merge is authorized.
