# 17. Risks and Open Questions

## Risks

| # | Risk | Likelihood | Impact | Mitigation | Owner milestone |
|---|---|---|---|---|---|
| R1 | Confident wrong answers erode trust | Medium | Critical | Tool-first verification, verifier pass, eval gates, error reporting | M3, M4 |
| R2 | Math assumptions leak into core | Medium | High | Profile contract, boundary checks, early second-domain test | M1, M8 |
| R3 | Small local models too weak for tutoring or structured output | High | High | Readiness test, feature availability table, tool-heavy design, honest messaging | M2 |
| R4 | Pyodide/SymPy too slow or heavy in browser | Medium | High | M0 spike; lazy load; worker; desktop native Python sidecar fallback | M0, M3 |
| R5 | OPFS SQLite performance or browser support gaps | Medium | Medium | M0 spike; IndexedDB fallback adapter behind the Storage port | M0 |
| R6 | Account-based provider access unavailable or against terms | High | Medium | Official flows only; API-key-first UX; ADR-0006 gate | M2 |
| R7 | Web CORS blocks direct provider calls | Medium | Medium | Desktop uses native HTTP; web offers optional local relay and documents per-provider support | M2 |
| R8 | Open-ended grading unreliable | Medium | High | Rubrics, anchors, multi-pass, low-confidence flags, self-assessment fallback | M6 |
| R9 | Readiness estimates miscalibrated | Medium | High | Show ranges, validate against real outcomes, recalibrate | M6 |
| R10 | Concept graph quality from messy sources | High | High | Validation, audit pass, review screen, seed graphs, expert review | M5 |
| R11 | Learners want answers, not effort | High | Medium | Fast path with honesty, explain why effort works, respect autonomy | M4 |
| R12 | Illusion of learning (good in-session, poor retention) | Medium | High | Delayed and transfer checks as success criteria | M6, M7 |
| R13 | Prompt injection via materials | Medium | High | Untrusted-data handling, no side-effect tools, eval scenarios | M5 |
| R14 | Key leakage | Low | Critical | Vault, binding, scanning tests, security review | M2 |
| R15 | Copyright issues with uploaded materials and shared libraries | Medium | High | Private local use, rights checks for sharing, no repo fixtures | M5, M9 |
| R16 | Scope creep delays quality | High | High | Strict milestone gates; non-goals list; one subject deep first | all |
| R17 | Accessibility gaps in math and map UIs | Medium | High | A11y gates; assistive-tech testing; alternative representations | M3, M7 |
| R18 | Local model runtime packaging complexity across OSes | High | Medium | Sidecar approach; start with one OS; hardware detector; clear support matrix | M2 |
| R19 | Dependency or license issues | Low | Medium | Dependency policy, license checks, SBOM | all |
| R20 | Eval judges themselves unreliable | Medium | Medium | Rule-based checks first; judge calibration against human labels | M0, M6 |
| R21 | Glass effects hurt legibility or contrast on busy or user-chosen backdrops | Medium | High | `glass-reading` for text and math, guaranteed scrim, pixel-sampled contrast tests on every backdrop, high-contrast fallback | M0, M7 |
| R22 | `backdrop-filter` and animation jank on weaker GPUs and some webviews (for example WebKitGTK) | Medium | Medium | Pre-blurred backdrops, blur budget, tiered fallbacks, auto-downgrade with notice, M0 performance spike | M0 |

## Open questions (decide early; record outcomes as ADRs)

1. **First course:** Calculus I/II or Linear Algebra? (Recommendation: Calculus I, with Linear Algebra second.)
2. **Local runtime choice:** llama.cpp sidecar versus Rust bindings versus a bundled Ollama-like service (spike in M0).
3. **Web vs desktop priority:** ship the web alpha first, or desktop first (needed for embedded models)? (Recommendation: develop both shells from M0; desktop-first for embedded models, web for reach.)
4. **Vector index:** sqlite-vec versus an in-memory index for typical corpus sizes.
5. **OCR approach:** local OCR engine versus vision-capable model by default.
6. **Math input fallback:** behavior when MathLive struggles with certain notations.
7. **Graph visualization library** for the mastery map at 500+ nodes.
8. **Licensing of Lyceum itself** (open source, source-available, or proprietary) and its effect on dependency choices.
9. **Telemetry:** whether to include any opt-in telemetry at all in v1.
10. **Ethical review** for learning studies (consent, data handling).
11. **Official account-based provider flows:** which, if any, exist at implementation time and under what terms.
12. **Backdrop assets:** commission or license an original set; final typeface choice (Poppins versus alternatives) and its licensing.
13. **Glass on Linux webviews:** acceptable fallback tier or a different renderer for that platform.
