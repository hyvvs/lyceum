# M0-003 — manual assistive-technology and native forced-colors acceptance sheet

**Prepared 2026-11-24 · Status: BLOCKED / NOT RUN.** No physical supported AT/OS combination was exercised in this coding session; browser role checks, axe, screenshots and **Chromium-emulated forced colors are not evidence of native OS/AT signoff**. M0-003 stays `[~]` and WCAG 2.2 AA/manual release signoff is **outstanding**. This sheet covers the **existing supported primitive and bounded reading-and-controls compositions**, not arbitrary unbounded Dialog content.

## Test environment record — fill from the actual device, never infer

| Run | Candidate supported combination (confirm product support matrix before signoff) | Device / OS version and build | Browser version | AT / screen reader version | Windows native contrast theme | Tester/date and evidence link | Result |
|---|---|---|---|---|---|---|---|
| W-AT | Windows 11 + Edge + NVDA; optionally repeat Chrome/NVDA | **NOT RECORDED** | **NOT RECORDED** | **NOT RECORDED** | n/a | **NOT RUN** | **BLOCKED / NOT RUN** |
| W-FC-D | Real Windows 11 + Edge, **native** Settings → Accessibility → Contrast themes, choose one dark theme | **NOT RECORDED** | **NOT RECORDED** | optional NVDA, record if used | **NOT RECORDED** | **NOT RUN** | **BLOCKED / NOT RUN** |
| W-FC-L | Real Windows 11 + Edge, **native** light contrast theme where available | **NOT RECORDED** | **NOT RECORDED** | optional NVDA, record if used | **NOT RECORDED** | **NOT RUN** | **BLOCKED / NOT RUN** |
| M-AT | macOS + Safari + VoiceOver, **if within agreed supported matrix** | **NOT RECORDED** | **NOT RECORDED** | **NOT RECORDED** | n/a | **NOT RUN** | **BLOCKED / NOT RUN** |
| A-AT | Android + Chrome + TalkBack, **only if within agreed supported matrix** | **NOT RECORDED** | **NOT RECORDED** | **NOT RECORDED** | n/a | **NOT RUN** | **BLOCKED / NOT RUN** |

Use the real **merged UI QA consumer/Storybook** and later the real M0-004 app where relevant; note commit SHA, tested story/route URL, 320×190/256 and normal viewport sizes, keyboard layout, text scaling method, browser accessibility tree and evidence artifact locations. Request explicit supported-combination owner confirmation before treating a candidate row as a release requirement. For Windows, verify `matchMedia('(forced-colors: active)').matches === true` **on the real configured OS**, not via DevTools emulation; record native theme name and capture native visible output. For Android/TalkBack (if supported), record equivalent **touch-exploration/swipe gestures** instead of assuming desktop Tab/Shift+Tab exists.

### Reproducible QA fixture setup for the human tester (instructions, **not executed here**)

1. From repository root run `corepack pnpm storybook` and open the **story iframe**, not the top-level Storybook manager: `http://127.0.0.1:6006/iframe.html?id=qa-runtimepreferences--mounted-dialog-select&viewMode=story`. The **default is `compact`**, which does **not** exercise the supported bounded tall-reading case.
2. In that **iframe's** DevTools console, set the actual supported bounded composition while still at **100%** (no DOM remount or navigation):

   ```js
   window.dispatchEvent(new CustomEvent("lyceum:qa-variant-change", {
     detail: { composition: "tall", copy: "long", options: "long", direction: "ltr" }
   }));
   ```

3. Use only **real keyboard or AT controls** to focus **Open runtime study settings**, press Enter, read the **Study preparation notes** named region, reach **Study topic** Select and open it; note exact speech/visual focus. While the **separately portalled** listbox is open, in the same iframe console apply:

   ```js
   window.dispatchEvent(new CustomEvent("lyceum:qa-preference-change", {
     detail: { textScale: "200%", contrast: "high", transparency: "off", motion: "reduced" }
   }));
   ```

   Check computed `document.documentElement` font-size **32px** from the 16px fixture baseline and that the Dialog/Select instance stayed mounted; **console dispatch is test setup only, not proof of keyboard or AT success**. Independently repeat with real **browser zoom at 200%** and document that setting separately: zoom and the QA text-size switch are **not interchangeable**. Repeat the bounded fixture with `direction: "rtl"` and physical short viewport where possible. **Never switch to `composition: "tall-unbounded"` and label its known red behavior accepted.**
4. Toast: use genuine **Primitives/Toast** stories **Default**, **Foreground**, **Action**, **ErrorAction** and **TimedShort** for announce/priority/timer/action checks; use actual `VisuallyHidden`, Button, Tabs, Tooltip and Select stories for their respective cases. On the later actual M0-004 shell, **separately** evaluate skip link/landmarks/dock/route focus and opaque fallbacks. QA fixture navigation is not a substitute for full shell signoff.

## Repeatable test steps (one observed record per environment and case)

**Result codes:** `PASS` (observed, reproducible, evidence linked), `FAIL` (actual supported-consumer defect: file issue, focused fix + regression test), `NOT APPLICABLE` (with justification), `BLOCKED / NOT RUN` (missing device/AT or no actual execution). Do not turn a missing observation into PASS. For every case capture **actual announcements, spoken accessible names, keyboard sequence, visible focus, screenshot/recording, issue ID, tester and date**.

| ID | Manual action and expected observable outcome | Required evidence | Current result |
|---|---|---|---|
| AT-01 | Keyboard-activate a real Dialog. Initial focus visibly lands on an **intentional, in-viewport reading-start target**, not on an offscreen control; SR announces Dialog role, accessible title and context. Tab/Shift+Tab reaches the **independently scrollable labeled reading region** and controls naturally; use actual SR **browse/reading commands**, PageDown/End/Home and scroll to read its full text (Tab alone does not read paragraphs). Close returns to opener. | SR speech transcript + focus screenshot at normal and short viewport | **BLOCKED / NOT RUN** |
| AT-02 | In that Dialog open a **genuine separately portalled Select** from its trigger using only the keyboard. Use Tab/Shift+Tab in the **surrounding Dialog**, then Enter/Space to open Select and arrows, Home/End, selection and Escape **inside the open listbox**; record Radix's actual Tab behavior rather than assuming Tab cycles through option items. SR announces Select label, expanded state, item accessible names and **focused/selected option**. Focus returns to trigger on Select close, remains inside Dialog until Dialog close, then restores to external opener. | Exact key sequence, SR speech, focus snapshots before/after | **BLOCKED / NOT RUN** |
| AT-03 | Close Select/Dialog by selection, Escape and explicit Close. Verify **no stale `inert` or `aria-hidden`** on formerly background elements, no trapped/hidden-focus guard in SR traversal, and keyboard reaches page controls again. Repeat with two Selects in sequence and a sibling Close control. | DOM inspection + tab order + SR traversal log | **BLOCKED / NOT RUN** |
| AT-04 | At **actual QA-controlled 200% text scaling** (verify 32px computed root when 16px is base), with real 320×190 and 320×256 CSS viewports, focus ring/glyph/control remain visible and no text/controls become unreachable. Change 100%→200% **while the separately portalled Select is open**; selected/focused item names remain readable, popup anchor reachable. Repeat RTL and **separately** native browser zoom 200%; record which scaling mode, as they differ. **Do not run the historically unsupported unbounded composition as an acceptance PASS.** | Scale computed value; browser zoom value; native screenshots/video showing ring, focus, popup, reading scroll | **BLOCKED / NOT RUN** |
| AT-05 | NVDA/VoiceOver read the accessible text for **every actual Select item** including selected and highlighted options; sighted keyboard user can distinguish selected/focused without color alone. Test disabled item semantics, long labels and scrolling. | Speech log, visible selected/focus screenshots, contrast notes | **BLOCKED / NOT RUN** |
| AT-06 | Tooltip: keyboard focus and pointer hover expose the cue; SR reads the cue/description with a sensible name. Long hint uses an **accessible Dialog alternative** with readable full text, Escape and focus restoration; no inaccessible nonfocusable scrolling tooltip. | Actual speech, keyboard/pointer sequence, visual focus, full content | **BLOCKED / NOT RUN** |
| AT-07 | Toast: trigger **Default (polite)** and **Foreground (assertive)** separately; SR announces correct priority **without unnecessary interruption or duplication**; observe whether assertive interrupts current speech. Use F8, Tab, Action/ErrorAction controls, Escape and origin restoration; verify TimedShort expiry and focus/hover pause. If F8 conflicts with AT/browser shortcuts, record conflict and test an equivalent discoverable accessible path; no assumed exact identical spoken utterance. | SR speech/timing sequence, action and focus observations, shortcut conflicts | **BLOCKED / NOT RUN** |
| AT-08 | A real icon-only Button with a `VisuallyHidden` **text span** has a complete spoken accessible name, without an extra invisible tab stop or lost visible focus. Do **not** claim that `VisuallyHidden` itself exports a heading/landmark API. | SR button list and actual spoken name, keyboard order | **BLOCKED / NOT RUN** |
| AT-09 | In existing Button and Tabs stories, all button states and Tab triggers are keyboard operable, clearly labeled with a visible focus ring; arrow navigation and selected-panel relationship are announced by AT. Check disabled state, 200% scaling and native forced colors. | Actual keys, tab/aria announcements, focus and selected state screenshots | **BLOCKED / NOT RUN** |
| FC-01 | Under **real Windows native forced colors**, verify selected Select text glyphs, active option outline/background, meaningful status and focus ring in two contrast themes; use system Canvas/CanvasText/Highlight colors without forced-color-adjust suppression. No monochrome block masking labels. **App toolbar/dock is future M0-004 shell scope; mark NOT APPLICABLE for current primitives and revisit on the actual shell.** | OS build, native contrast theme name, native screenshot/pixel inspection | **BLOCKED / NOT RUN** |
| FC-02 | Real native Windows forced colors + 200% text and reduced/off transparency: opaque `glass-reading` surfaces in the **bounded QA consumer**, Button, Tooltip and Dialog remain **readable with clear hierarchy** and visible focus; no translucent text over backdrop. **Actual app math and shell backdrop must be checked later when implemented**, not fabricated from placeholders. | Native screenshots of contrast themes and solid fallback; user-visible defects | **BLOCKED / NOT RUN** |
| AX-01 | Manually disposition each **applicable** axe `incomplete`: `label-content-name-mismatch` (icon/visible label vs spoken name), `aria-hidden-focus` (modal guards/focusable descendants), `bypass` (Storybook isolated portal vs **real shell** skip link/landmark) and `color-contrast` (translucent/occluded content, icons). Link each specific node/rule and human pass/fail/not-applicable justification; rerun affected axe + keyboard/SR path for fixes. **No blanket suppression.** | Four-category node-by-node triage log with evidence/issue IDs | **BLOCKED / NOT RUN** |

## Finding and signoff log (blank until real execution)

| Date | Tester | Device/OS/browser/AT and exact versions | Case ID | Observed speech/visual result | Status | Evidence artifact | Issue / regression PR |
|---|---|---|---|---|---|---|---|
| — | — | **No real device run recorded** | — | **No observed result** | **BLOCKED / NOT RUN** | — | — |

**Acceptance rule:** the human lead reviews and signs actual supported-platform evidence, per-node axe incomplete dispositions, and defects/resolutions. **Any confirmed supported-consumer failure requires focused fix plus regression tests; never waive or rename it unsupported simply to mark M0-003 complete.** The known historical *arbitrary unbounded* complex Dialog remains **UNSUPPORTED**, not certified by these bounded-case passes. This sheet and the approved M0-004 development sequencing exception do **not** authorize M0-003 `[x]`, public release or WCAG certification.

**Outstanding signoff (2026-11-24):** R2 actual AT/announcement and manual axe triage **BLOCKED / NOT RUN**; R3 real Windows forced-colors/readable opaque fallback **BLOCKED / NOT RUN**; manual acceptance owner decision **PENDING**.
