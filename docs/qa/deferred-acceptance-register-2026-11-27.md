# Owner-approved deferred acceptance register — development versus release

**Owner decision: 2026-11-27. Status of every item below: OWNER-APPROVED DEFERRED / NOT RUN.** This is a release-readiness inventory, **not** a replacement for actual case evidence. The [canonical manual accessibility coordination matrix](m0-003-m0-004-manual-execution-coordination-2026-11-25.md) and its [primitive](m0-003-manual-at-forced-colors-acceptance-2026-11-24.md) and [shell](m0-004-manual-accessibility-handoff-2026-11-25.md) source sheets own the per-case steps and eventual actual PASS/FAIL/NOT APPLICABLE evidence.

The owner explicitly accepted the current M0-003, M0-004 and M0-017 *technical implementations as development foundations*, and authorized subsequent technical work (starting M0-005, then M0–M9 in dependency-aware order) without waiting for human testers or participants. This **does not** complete those canonical task cards, waive a supported accessibility defect, prove WCAG conformance or authorize a release. Existing automated Verify, unrestricted dependency audit, secret scan, architectural constraints, tests and independent technical reviews remain mandatory. A confirmed technical or automated defect blocks the affected implementation.

## Accessibility: all 20 original canonical cases

| Original case | Deferred phase | Current status |
|---|---|---|
| AT-01 | Pre-release qualified native/AT | OWNER-APPROVED DEFERRED / NOT RUN |
| AT-02 | Pre-release qualified native/AT | OWNER-APPROVED DEFERRED / NOT RUN |
| AT-03 | Pre-release qualified native/AT | OWNER-APPROVED DEFERRED / NOT RUN |
| AT-04 | Pre-release qualified native/AT | OWNER-APPROVED DEFERRED / NOT RUN |
| AT-05 | Pre-release qualified native/AT | OWNER-APPROVED DEFERRED / NOT RUN |
| AT-06 | Pre-release qualified native/AT | OWNER-APPROVED DEFERRED / NOT RUN |
| AT-07 | Pre-release qualified native/AT | OWNER-APPROVED DEFERRED / NOT RUN |
| AT-08 | Pre-release qualified native/AT | OWNER-APPROVED DEFERRED / NOT RUN |
| AT-09 | Pre-release qualified native/AT | OWNER-APPROVED DEFERRED / NOT RUN |
| FC-01 | Pre-release native Windows Contrast | OWNER-APPROVED DEFERRED / NOT RUN |
| FC-02 | Pre-release native Windows Contrast | OWNER-APPROVED DEFERRED / NOT RUN |
| AX-01 | Pre-release independent human axe-incomplete triage | OWNER-APPROVED DEFERRED / NOT RUN |
| SHELL-01 | Pre-release shell AT/keyboard | OWNER-APPROVED DEFERRED / NOT RUN |
| SHELL-02 | Pre-release shell AT/keyboard | OWNER-APPROVED DEFERRED / NOT RUN |
| SHELL-03 | Pre-release shell AT/theme | OWNER-APPROVED DEFERRED / NOT RUN |
| SHELL-04 | Pre-release shell AT/state | OWNER-APPROVED DEFERRED / NOT RUN |
| PWA-01 | Pre-release real native/AT PWA lifecycle | OWNER-APPROVED DEFERRED / NOT RUN |
| FC-SHELL-01 | Pre-release native Windows Contrast | OWNER-APPROVED DEFERRED / NOT RUN |
| AX-SHELL-01 | Pre-release independent human axe-incomplete triage | OWNER-APPROVED DEFERRED / NOT RUN |
| READ-01 | First eligible real production reading-intensive consumer, before release | OWNER-APPROVED DEFERRED / NOT RUN |

**READ-01 has no eligible production consumer yet.** It remains unexecuted and mandatory; do not claim it N/A, waive it, infer it from short shell cards or use its absence to delay other development. All supported-platform choices must be documented by a qualified lead; an unavailable supported device is not N/A. No emulated colors, automated axe PASS, screenshots or unit tests substitute for qualified actual native evidence.

**Exit from deferral:** a named qualified accessibility lead and independent reviewer approve the supported OS/browser/AT matrix, execute the *original* cases with real devices (including real Windows 11 Edge/NVDA/physical keyboard, native dark/light Contrast themes, actual browser zoom and text scale), record spoken/focus/visual/axe-incomplete observations, fix confirmed supported defects and sign genuine per-case results in the canonical source sheets. READ-01 additionally requires a real reading-intensive consumer. Resolve all 20 and outstanding V5 visual/per-WebView/performance gates before release; never automatically translate this register into PASS.

## Human pedagogical research: separate acceptance requirement

| Requirement | Current status | Exit from deferral |
|---|---|---|
| M0-012 actual 5–10-adult moderated formative study, real findings and independently reviewed findings-driven updates to docs/06 and docs/11 | **OWNER-APPROVED DEFERRED / NOT RUN** | Human investigator/moderator/reviewer/custodian appointed; institutional, ethics, privacy and provider terms approved; actual information/consent finalized; secure storage, retention/deletion and withdrawal arrangements; mandatory human-controlled synthetic-only rehearsal; separately authorized voluntary recruitment and participant consent; real moderated sessions, analysis, findings review and owner acceptance |

The accepted [M0-012A preparation package](../research/m0-012a/README.md) is **not** an executed study. Its [participant information and consent draft](../research/m0-012a/02-information-consent.md) is **NOT approved for human use**. No recording, model/provider processing, recruitment, results or real data are authorized by this development deferral. Individual-level study data must remain private, never committed.

## M0-005 physical reference-device acceptance (added 2026-11-27)

| Actual acceptance evidence | Deferred phase | Current status |
|---|---|---|
| Real supported **reference-device** first-painted themed-window startup under the original **2.5-second** budget, with cold-start/sampling protocol and genuine native visibility | Dedicated pre-release physical native desktop performance validation | **OWNER-APPROVED DEFERRED / NOT RUN** |
| Independent qualified supported native desktop accessibility, actual WebView visual/keyboard/contrast and OS keychain/privacy evaluation on the owner-selected reference environments beyond automated platform CI | Dedicated pre-release native user and device validation | **OWNER-APPROVED DEFERRED / NOT RUN** |

These are **additional physical acceptance obligations**, not replacements for the original 20 canonical cases or a license/security/compilation test. The 2026-11-27 Windows local Tauri window screenshot and process-to-window-handle observation are **actual technical evidence**, but **not** evidence of first painted pixels under 2.5 s on the designated reference device. Actual macOS/Windows hosted native build and automated OS-keychain test results, real command correctness and advisory/permission reviews **must still pass as technical gates**; never label failing/unrun CI as approved hardware deferral. See [desktop technical QA](m0-005/README.md). No newly created case is marked PASS or N/A.

## Sequencing and accountability

- **Development readiness:** A dependent technical task may start when the upstream *implemented and automated-verified technical foundation* actually suffices for its interfaces. Incomplete human/manual evidence is tracked here and is **not** a technical dependency block; any missing real API, prototype, architecture decision, security permission or automated regression **is** still a blocker to the affected task.
- **Task status:** Keep incomplete original cards `[~]` and separately record technical foundation acceptance. Do not mark a task or milestone `[x]` merely because manual or human-study gates were deferred. Owner approval to develop is not authorization to claim completion.
- **Release readiness:** Every outstanding deferred case and actual human study needs real qualified evidence, review and explicit release-gate closure. The applicable product quality bar and licensing, contrast, perf, security and accepted ADR requirements remain binding.
- **Audit:** Before each roadmap-stage release readiness decision, revisit this register and the canonical source records. Update individual statuses only from real reviewed evidence, not an automated test or a new implementation branch.
