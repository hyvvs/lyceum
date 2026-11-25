# Audit #23: M0-003 / M0-004 real-device accessibility execution coordination

**2026-11-25 · DRAFT coordination evidence, not an acceptance report.** Audit #23 authorizes **preparation and coordination**, not milestone completion, release, new dependencies, implementation or a new QA-PR merge. **No manual case below has been executed by a qualified person, reviewed, or assigned PASS/NOT APPLICABLE.** Both M0-003 and M0-004 remain **`[~]`**. Current automation results are separate from actual OS/assistive-technology observations.

## Source of truth and exact candidate

- **Test candidate:** merged `main` commit **`1d077c236c920403823a3aa48c6e9c678eb603dd`**, [PR #18](https://github.com/hyvvs/lyceum/pull/18). Actual post-merge [CI 45537512960](https://github.com/hyvvs/lyceum/actions/runs/45537512960): Verify, **unrestricted Dependency audit** and Secret scan **SUCCESS**; Linux **107/107** unit tests, **88/88** Chromium tests, **141 unique Storybook stories / 164 executed axe states**, and **12/12** real production web/PWA/Worker browser cases (one optional screenshot-capture case skipped). These are **automated** results, never manual PASS.
- **Architecture:** accepted [ADR-0009](../adr/0009-defer-standalone-focus-scope.md) retains Radix-owned focus and defers **both public and private new FocusScope helpers**. Accepted [ADR-0010](../adr/0010-m0-004-web-shell-bootstrap.md) retains the **temporary scoped** `workbox-build@7.4.1>glob: 14.0.3` override, with an out-of-range major risk and a mandatory future officially compatible-patch removal/retest trigger. No new dependencies or security waivers under Audit #23.
- **Case-level criteria:** [M0-003 real AT and native Windows test sheet](m0-003-manual-at-forced-colors-acceptance-2026-11-24.md) and [M0-004 web-shell test sheet](m0-004-manual-accessibility-handoff-2026-11-25.md). Use the [M0-003 owner exit-decision audit](m0-003-exit-decision-2026-11-24.md) to enforce the **bounded reading-and-controls Dialog** restriction. Unbounded arbitrary complex Dialogs remain unsupported, not passed.

## 1. Observed preparation versus missing manual resources

**Observed on the shared development workspace host (not established as a tester-operated physical device):** Windows 11 Pro **10.0.26200 / build 26200**; local Chrome executable version **158.0.8127.37**; Edge Stable **141.0.3537.71** appears in current-user AppX package metadata (its interactive executable was not resolved at the standard paths). **No NVDA process** was running, and **no NVDA installation** appeared in the checked common executable locations or HKLM/HKCU uninstall entries; a portable installation was **not** ruled out. The host's physical/remote tester accessibility, actual Edge launch, actual screen reader, Windows native Contrast theme activation and spoken output were **not checked or observed**. The Windows high-contrast registry value alone does not demonstrate native forced colors in an active browser.

**Automated preparation executed, not manual testing:** on the verified merged SHA, `corepack pnpm verify` passed **106 Windows tests + one expected Windows-only skip**, typecheck, lint, boundaries and agentcheck; `corepack pnpm install --frozen-lockfile`, `corepack pnpm web:build` and `corepack pnpm storybook:build` succeeded. The production build generated **13 SW precache entries**. Generated `apps/web/dist/` and `storybook-static/` are workspace artifacts, **not proof that any designated human test machine has the build, tools or OS configuration ready**.

**Precisely missing or unconfirmed:** (1) named **designated human test lead**, separately qualified keyboard/screen-reader operator and independent accessibility reviewer; (2) **lead/owner-approved supported OS/browser/AT matrix** (none located in project instructions, QA docs or currently listed project issues); (3) a **tester-operated Windows 11/Edge/NVDA setup** with verified actual versions and hardware access; (4) activation and capture of **native Windows dark and light Contrast themes** in Edge; (5) OS/browser/AT/tester coverage for optional **macOS Safari/VoiceOver** and **Android Chrome/TalkBack**, if explicitly supported; (6) human per-case speech/focus/visual records, applicable axe-`incomplete` per-node decisions, defect disposition and signoff. **Unavailable ≠ NOT APPLICABLE.**

### Candidate support matrix — decision must come from the designated lead

| Candidate run | Proposed combination (not yet approved as supported) | Lead's support decision / rationale | Human tester & physical/remote device | Execution |
|---|---|---|---|---|
| **W-AT / W-NVDA (priority 1)** | Real Windows 11 + Edge + NVDA + keyboard; optional Chrome/NVDA repeat | **UNCONFIRMED — lead required** | **UNASSIGNED; no actual NVDA run** | **BLOCKED / NOT RUN** |
| **W-FC-D (priority 1)** | Real Windows 11 Edge and a named **native dark** Contrast theme | **UNCONFIRMED — lead required** | **UNASSIGNED; no native theme observation** | **BLOCKED / NOT RUN** |
| **W-FC-L (priority 1)** | Real Windows 11 Edge and a named **native light** Contrast theme where available | **UNCONFIRMED — lead required** | **UNASSIGNED; no native theme observation** | **BLOCKED / NOT RUN** |
| **M-AT / M-VO** | Real macOS Safari + VoiceOver | **UNCONFIRMED — lead required** | **UNASSIGNED; no device/OS access confirmed** | **BLOCKED / NOT RUN** |
| **A-AT / A-TB** | Real Android Chrome + TalkBack | **UNCONFIRMED — lead required** | **UNASSIGNED; no device/OS access confirmed** | **BLOCKED / NOT RUN** |

**Support decision request:** designated lead must sign the matrix above (platforms, versions and exclusions, rationale, tester and reviewer). Only then may a genuinely executed case receive PASS or FAIL; NOT APPLICABLE requires **affirmative documented supported-scope justification**, not lack of devices or staff. A confirmed supported-case defect cannot be relabeled unsupported to avoid remediation.

## 2. Assignment sequence and exact local execution checklist

| Order / responsible role | Deliverable before next step | Present state |
|---|---|---|
| A — **Owner appoints designated test lead** | Named lead confirms supported OS/browser/AT/version matrix and release-bound vs optional platforms, with date | **BLOCKED — owner/lead identity not provided** |
| B — **Lead + IT/device custodian** | Real tester-operated Windows 11/Edge/NVDA + keyboard, native dark/light Contrast themes; version/build and tester availability recorded. Optional supported platforms provisioned separately | **BLOCKED — resource access and tester not confirmed** |
| C — **Qualified AT operator** | Record M0-003 AT-01–AT-09 and M0-004 SHELL-01–04/PWA-01 **actual** keys, speech, focus, screenshot/video; use real support combinations and real 200% browser zoom | **BLOCKED — no human session** |
| D — **Native Windows tester** | Execute FC-01/02 and FC-SHELL-01 in real dark/light OS Contrast themes, short viewports, 200% zoom and opaque fallback; record `matchMedia('(forced-colors: active)').matches === true` **in actual Edge** | **BLOCKED — no native OS theme run** |
| E — **Accessibility lead/reviewer (independent of operator)** | AX-01 and AX-SHELL-01 **rule-by-rule, node-by-node** dispositions for `label-content-name-mismatch`, `aria-hidden-focus`, `bypass`, `color-contrast`; review all evidence and possible defects | **BLOCKED — no manual results/reviewer** |
| F — **Owner** | Review signed supported-platform results and proposed narrow defects; separate explicit M0-003/M0-004 completion decision only after remediation and CI evidence | **BLOCKED — no signoff; both [~]** |

On a **separate clean tester machine/clone** (not merely the shared build host), use PowerShell terminals:

```powershell
git fetch origin main
git switch main
git pull --ff-only
git rev-parse HEAD    # must exactly equal 1d077c236c920403823a3aa48c6e9c678eb603dd
git status --short    # must be clean, or stop and reconcile without discarding changes
node -v               # record; approved baseline v22.20.0
corepack pnpm -v      # record; lockfile pnpm 9.15.0
corepack pnpm install --frozen-lockfile
corepack pnpm web:build
corepack pnpm --dir apps/web preview --host 127.0.0.1 --port 4173 --strictPort
```

Open **`http://127.0.0.1:4173/`** in the actual supported browser **using the qualified tester's real screen reader/keyboard**. Keep server running while testing; do not expose it publicly. Record the production SHA, browser and worker/SW registration state. For the component fixture use another terminal: `corepack pnpm storybook`, then the **iframe** `http://127.0.0.1:6006/iframe.html?id=qa-runtimepreferences--mounted-dialog-select&viewMode=story`; follow the exact **bounded tall** composition/portalled Select preference-change scripts in the M0-003 sheet, **not the default compact variant**. Start with real Windows/Edge/NVDA **only if the lead confirms it supported**.

**Required human traversal:** actual skip link/landmarks and route-heading order; top floating pills/desktop icon dock and mobile capsule with natural Tab **and** Shift+Tab; actual NVDA announcements, names, selected state; bounded Dialog initial visible reading target, readable scroll region, portalled Select, arrows/Home/End/selected-option speech and Escape/restoration; Tooltip and polite/assertive Toast/F8/action timing; VisuallyHidden Button/Tabs; in-place theme/contrast/transparency/motion; **root-font scaling to 32px via fixture** and **independent native browser zoom 200%** (do not conflate); native OS dark/light Contrast themes and explicit visible focus; genuine offline `/` and `/settings` reload, SW A→B waiting, keyboard-reachable consent-only update/no surprise reload/cleanup; axe `incomplete` nodes individually. For any actual Android/TalkBack run, record touch exploration and swipe gestures, not assumed desktop Tab behavior.

**Controlled A→B setup for a human:** use a disposable **copy of `apps/web/dist` outside tracked production source**, served as a local same-origin QA preview, exactly as in `tests/web/pwa-update.spec.ts`. First register and establish control with SW A. Have a separate QA operator append a clearly marked test-only comment to **the copied** `sw.js`, then trigger the browser registration's `update()`; the screen-reader tester must observe the prompt, natural Tab/Enter activation, waiting state and reload **without clicking or activating through DevTools**. Copy-only mutation must never be committed. This tests opt-in SW lifecycle, **not actual persistence of future learner drafts**. Clean up that test origin's registration and caches after capturing evidence. If a second preview or safe test copy cannot be provisioned, **PWA-01 remains BLOCKED / NOT RUN**.

## 3. Per-case execution register — no actual manual outcomes

For each row, append a **separate genuine observation record** in the source case sheet; do not overwrite the known automated evidence. All current results are **BLOCKED / NOT RUN** because the support matrix/tester/session and native OS/AT evidence are unconfirmed. A single failed supported case becomes **FAIL** with issue and reproduction, not a green summary.

| Source case | Manual criterion to record (source sheets have full steps) | Result | Evidence / defect |
|---|---|---|---|
| AT-01 | Bounded Dialog spoken title, on-open reading-start focus, read/scroll and restore | **BLOCKED / NOT RUN** | None |
| AT-02 | Dialog + separately portalled Select, spoken options, arrows/Home/End, return focus | **BLOCKED / NOT RUN** | None |
| AT-03 | Select/Dialog exit, no stale inert or aria-hidden, two Selects + sibling Close | **BLOCKED / NOT RUN** | None |
| AT-04 | Root-font 200%, 320×190/256, separately browser zoom 200%, popup + RTL | **BLOCKED / NOT RUN** | None |
| AT-05 | Actual selected/disabled/long option speech, visible glyph and selected focus | **BLOCKED / NOT RUN** | None |
| AT-06 | Tooltip cue speech, pointer/keyboard, long-hint accessible Dialog alternative | **BLOCKED / NOT RUN** | None |
| AT-07 | Toast polite/assertive speech, F8/actions/timers/Escape and focus restoration | **BLOCKED / NOT RUN** | None |
| AT-08 | VisuallyHidden icon-only Button spoken label, no extra invisible tab stop | **BLOCKED / NOT RUN** | None |
| AT-09 | Button/Tabs names, arrows, selected panel and focus at scale/contrast | **BLOCKED / NOT RUN** | None |
| FC-01 | Real dark/light Windows Contrast themes: Select glyph, option and focus | **BLOCKED / NOT RUN** | None |
| FC-02 | Real Windows forced colors + 200% text, opaque bounded reading/controls | **BLOCKED / NOT RUN** | None |
| AX-01 | Node-by-node axe `incomplete` disposition in primitive/QA consumer | **BLOCKED / NOT RUN** | None |
| SHELL-01 | Skip link/main heading, desktop floating pills/left dock, language, route order | **BLOCKED / NOT RUN** | None |
| SHELL-02 | Mobile dock + natural Tab/Shift+Tab, 200% zoom, short view and safe areas | **BLOCKED / NOT RUN** | None |
| SHELL-03 | Actual theme, contrast, transparency and motion names/readability | **BLOCKED / NOT RUN** | None |
| SHELL-04 | Spoken Today/Settings truthful empty/error/worker state and focus | **BLOCKED / NOT RUN** | None |
| PWA-01 | Real offline route reload and A→B opt-in update prompt/keyboard consent | **BLOCKED / NOT RUN** | None |
| FC-SHELL-01 | Actual Windows native dark/light forced colors in shell/Settings | **BLOCKED / NOT RUN** | None |
| AX-SHELL-01 | Node-by-node shell axe `incomplete` disposition | **BLOCKED / NOT RUN** | None |
| READ-01 | Full long **unfocused** reading reachability under fixed dock/virtual keyboard | **BLOCKED / NOT RUN — genuine reading-intensive consumer not yet implemented** | None; mandatory first-consumer gate |

### Human case record (copy for **each** executed environment × case × relevant node)

| Field | Required actual value |
|---|---|
| Case/run/date/time/time zone and named tester | **UNRECORDED** |
| Owner-approved support matrix revision and reviewer | **UNCONFIRMED** |
| Physical hardware/input and actual OS/build | **UNCONFIRMED** |
| Browser/engine/version and AT/version/voice/interaction mode | **UNCONFIRMED** |
| Commit SHA, exact page or Storybook iframe URL, variant, locale, viewport and zoom/text scaling | **UNRECORDED** |
| Keyboard keys/reading or touch gestures and step-by-step focus order | **NO OBSERVATION** |
| Actual spoken words/timing and visible native pixel/focus/scroll result | **NO OBSERVATION** |
| Per-axe node/rule/selector, manual rationale, and evidence URL | **NO OBSERVATION** |
| Result: PASS / FAIL / NOT APPLICABLE / BLOCKED / NOT RUN | **BLOCKED / NOT RUN** |
| Evidence recording link, consent, defect ID, focused regression and independent reviewer | **NONE** |

**Result rules:** `PASS` only for genuinely observed criteria with attributable human evidence; `FAIL` for real supported defect with reproducible steps and an issue; `NOT APPLICABLE` only with signed lead-supported scope reasoning; `BLOCKED / NOT RUN` for all missing hardware, tools, reviewer or test access. Do not suppress axe or retrofit PASS based on old Playwright screenshots. The historically reproducible **arbitrary unbounded Dialog** is a separate **known unsupported configuration**, not a newly discovered failing supported bounded case.

**Defect triage:** capture exact steps, hardware, version, spoken output and focus/visual evidence; identify `packages/ui` vs `apps/web` vs a particular bounded consumer; propose the **smallest** defensible fix plus an automated regression when feasible; seek owner approval **before** any new dependency, public interface or architecture contract. New genuine results require an **independent accessibility reviewer**. No corrective PR or QA/evidence PR may be merged without new explicit authorization.

**Future design boundaries:** M0-004's CSS atmosphere is provisional; M0-017 still requires distinctive original/licensed atmospheric imagery, fully layered frosted depth, floating pill nav/left icon dock, tinted/rim-lit cards, refined hierarchy and real V5 side-by-side comparison with polished solid/reduced-transparency fallbacks. M0-018 motion, M0-019 imagery/rendered-pixel contrast and M0-020 native WebView performance are independent gated milestones, **not started**. Specifically, the **mobile fixed dock may obscure unfocused reading paragraphs between scroll positions**; before supporting the first real reading-intensive view, observe 100%/200% zoom, long reading scroll through last paragraph, visible focused controls, virtual keyboard and bottom safe-area on an actual supported device. Today's short shell cards cannot certify this.
