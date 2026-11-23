# M0-003 first corrective QA slice — generated Storybook + WCAG axe gate

**Scope:** test-only corrective acceptance coverage, based on owner-approved ADR-0009 and the docs-only [PR #14](https://github.com/hyvvs/lyceum/pull/14) squash merge `36ebd12b5b07471a1e54e18a4c075558c061d2bc`. This QA branch is a **separate draft, not approved to merge**. No public UI interface, dependency, production component, FocusScope helper, or later-milestone work changes. **M0-003 remains `[~]`.**

## Reproducible gate and inventory

Run `corepack pnpm install --frozen-lockfile`, `corepack pnpm verify`, unrestricted `corepack pnpm audit`, `corepack pnpm storybook:build`, and `corepack pnpm test:ui` in that order. The hosted Verify job builds static Storybook before Playwright. The generated `storybook-static/index.json` (not committed) is the only source of browser story IDs; a test-only TypeScript AST check compares **every source `export const`** in the configured `packages/ui/src/**/*.stories.tsx` set with the built index in both directions. Invalid IDs, missing or extra exports, retyped `docs`, missing `test` tags, unsupported source exports, or previously unknown families fail closed. Vitest mutation tests prove missing/phantom/changed cases, a missing *executed* scan and omitted nested open states fail. The seven family sweeps collect **successful scan return values**, not caller-attested IDs. An independent registered Playwright reporter cross-checks **every generated story and required state** against actual passed test stdout at whole-suite completion, so even deleting an entire family's spec fails CI. Browser logs emit `AXE_STORY_CHECKED` per story/state including **incomplete IDs**, followed by `AXE_COVERAGE_VERIFIED` for a fully covered successful run—not merely a Playwright test total.

Generated Storybook index v5: **148 entries = 141 `type: story` + seven `type: docs`**, with **141 matching source-exported primitive stories**. Dynamic family counts at this build:

| Family | Generated and covered IDs | Stable scanned states |
| --- | ---: | --- |
| Button | **23/23** | Visible native Button or slotted link; all 13 previously unscanned variants included |
| Dialog | **14/14** | Real modal open except intentionally disabled trigger |
| Select | **23/23** | 23 closed/mounted states; 22 active open portalled listboxes (disabled remains closed); DialogIntegration opens real Dialog and Select |
| Tabs | **22/22** | Visible tablist and selected panel, all theme/text/RTL variants |
| Toast | **26/26** | Live notices (or actual empty state); nested Dialog+Select and saved Toast both scanned; `TimedShort` and `TimedDefault` hover-pause genuine Radix timers, fast-forward beyond expiry and assert notices still present before/after axe |
| Tooltip | **18/18** | Keyboard focus opens real tooltip except disabled trigger |
| VisuallyHidden | **15/15** | Icon-only accessible-name fixture and each theme/RTL/text variant |
| **Total** | **141/141** | **164 required story/state scans**; existing focused behavior and additional integration scans remain |

This is a **generated-count observation**, not a hard-coded test target: changes to source exports or the generated index alter coverage dynamically or fail the gate. The suite keeps separate keyboard, Toast timer/focus, portalled Dialog+Select, RTL, forced-colors and *real* 200%-text tests. It does not substitute Storybook addon configuration or a DOM-only story inventory for actual axe scans.

## Installed axe rules and positive control

`@axe-core/playwright@4.14.0` resolves installed **axe-core 4.14.1**, exposing 105 total rules. The complete installed WCAG 2.0/2.1/2.2 **level A/AA** tags are:

`wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa`.

No installed rule has a separate `wcag22a` tag. These five tags select **70 tagged rule definitions** versus **69** under the prior four-tag config. The newly included rule is **`label-content-name-mismatch`**, serious impact, WCAG **2.5.3 Label in Name**. A permanent positive-control browser test intentionally gives visible button text `Save` an inaccessible, conflicting `aria-label="Delete"`; it **must detect this violation** (the fixture is test-only and does not enter a Storybook story).

Axe's default analyzer executes **64** of the 70 tagged rules per story; it does **not** run four axe-designated `experimental` definitions (`css-orientation-lock`, `p-as-heading`, `table-fake-caption`, `td-has-header`) or two axe-designated `deprecated` definitions (`aria-roledescription`, `audio-caption`) by default. No rule was disabled or suppressed by this QA change. Each story scan checks the actual *executed* rule-ID set against the installed nonexperimental/nondeprecated rule set, and any observed violation fails CI. The pinned-version tag-unit test fails if a new A/AA tag is added without updating the helper. The six nondefault definitions and unsupported WCAG criteria are **not** claimed as automated passes; enabling experimental/deprecated rules would require an explicit reviewed gate decision rather than silently misreporting the scanner.

## Results, findings and unresolved limits

**Final local verification (2026-11-23):** frozen-lockfile install PASS; `corepack pnpm verify` PASS (boundaries, agentcheck, four workspace typechecks, **95 passed and one expected Windows symlink skip** in 20 Vitest files, Biome clean); unrestricted `corepack pnpm audit` reports **no known vulnerabilities**; `corepack pnpm storybook:build` PASS; complete `corepack pnpm test:ui` **72/72 Chromium PASS**. The independent Playwright reporter confirmed **`AXE_COVERAGE_VERIFIED unique_stories=141 required_states=164 executed_states=164`**. An earlier concurrent local test-runner collision produced missing Playwright trace-file errors; an exclusive re-run passed all tests and retained the trace configuration. No architectural or public-interface changes were made.

The expanded all-story scans produced **zero axe-reported violations** under the 64 default-executed rules, including the newly enabled serious `label-content-name-mismatch` rule. The original defects were **acceptance-gate omissions**, not confirmed defects in runtime components: missing `wcag21a`, 13 omitted Button stories, and two omitted short/default timed Toast stories. Fix: complete tagged rule selection, source/index/scanner parity tests, real state-based scans and clock-stable Toast regression. The deliberate contradictory-label canary correctly produces the serious rule and is asserted as an expected *test-fixture* violation. Test-harness red checks during development (initial inventory module absence, omitted tag, incorrect expectation of experimental/deprecated rule execution, missing test import) were corrected without bypassing the acceptance checks.

**Axe `incomplete`, not `violations`:** actual scans report inconclusive `aria-hidden-focus` on open modal Dialog and nested portal states, `bypass` and `color-contrast` on some portalled Select states, `color-contrast` on selected translucent/tooltip states, and `label-content-name-mismatch` on VisuallyHidden and one icon-only Tooltip fixture. The test logs give precise story/state and incomplete IDs. These are **not silently passed as WCAG certifications**: they need manual AT and contrast/portal review where applicable. An incomplete result is not a confirmed defect, and the QA PR does not dismiss it or disable the rule.

**Not in this first slice:** same-mounted, active Dialog+Select runtime switching across light/dark/high contrast, transparency and motion (separate follow-up QA slice); comprehensive real screen-reader/keyboard combinations; native forced-colors visual signoff across all surfaces; rendered-pixel contrast against original/licensed atmospheric backdrops; and entire-app Glassy Dashboard V5 side-by-side full-glass versus polished solid fallback visual comparison (future M0-017/019). Existing single-sequence portal, focus, zoom and fallback tests remain. Axe alone cannot establish WCAG 2.2 AA certification or M0-003 exit acceptance. No M0-004, M0-017, M0-018, M0-019 or M0-020 implementation belongs in this PR.

**Hosted evidence and independent reviews:** the draft PR description records exact final SHA and three-job CI URLs only after those jobs genuinely pass. Independent read-only UX/accessibility, architecture and security findings are recorded there, separately from formal GitHub reviews. The branch must remain **DRAFT / UNMERGED** pending additional owner approval.
