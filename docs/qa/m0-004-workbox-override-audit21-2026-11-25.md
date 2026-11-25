# M0-004 Audit #21: bounded Workbox dependency remediation

**Status: local security and functional experiment passed; PR #18 remains DRAFT, UNMERGED and NOT ACCEPTED.** This supplements, but does not replace, [the original Audit #20 web-shell evidence](m0-004-web-shell-evidence-2026-11-25.md). The owner explicitly approved only the reversible dependency experiment, not M0-004 merge, vulnerability waivers, other overrides or a new PWA architecture. M0-003 and M0-004 both remain in progress. Hosted exact-head evidence is maintained on [PR #18](https://github.com/hyvvs/lyceum/pull/18).

## Baseline and official release check

- Starting draft head: **86bca66076fef803217535de4943e1ae571767c3**; hosted run [45522307683](https://github.com/hyvvs/lyceum/actions/runs/45522307683) had Verify and Secret scan green, unrestricted Dependency audit red for two moderate build-time transitives.
- Npm registry check on 2026-11-25: official workbox-build stable/latest **7.4.1**, with no newer stable/in-range patched release. Its declared glob dependency is **^11.0.1**; approved vite-plugin-pwa **2.0.0** remains unchanged. The vulnerable old resolution was workbox-build 7.4.1 -> glob 11.1.0 -> minimatch 10.2.6.
- Baseline production output was built before override on Node **22.20.0**, pnpm **9.15.0**, Vite **8.3.8**. Captured baseline service-worker SHA-256: **c8d75b103f950ffe841aa3a64b6f9dda0238d385f0c87f04c5f1044e9fd1f122**; the SW contained **13** declared precache entries representing **10** distinct same-origin static asset URLs. Duplicate entries for both icons and the manifest were identical in the original plugin-generated SW; this experiment neither adds nor eliminates them.

## Authorized change and actual installed graph

The single new root pnpm override selector is **workbox-build@7.4.1>glob: 14.0.3**, affecting only Workbox's named glob edge. It deliberately crosses Workbox's declared semver-major range; this is **not** official upstream compatibility support.

~~~text
apps/web
  vite-plugin-pwa@2.0.0
    workbox-build@7.4.1
      glob@14.0.3   [targeted override only]
        minimatch@11.0.9
          @isaacs/nonrecursive-glob-match@1.1.0
        path-scurry@3.0.0
        minipass@7.1.3
~~~

The unrelated EJS/Jake/filelist branch still has minimatch **5.1.9**, which is outside the affected range of GHSA-g3hv-75wg-m249; no separate minimatch override or global glob override was introduced. The frozen lockfile keeps all other package importers and existing security settings unchanged. The old glob 11.1.0/minimatch 10.2.6 entries and their obsolete helper packages disappeared, with only the necessary scoped dependency replacements/additions.

Npm registry and installed package metadata were inspected:

| New package | Actual version | License | Declared Node requirement | Install lifecycle |
|---|---|---|---|---|
| glob | 14.0.3 | BlueOak-1.0.0 | 18 or 20 or >=22 | No preinstall/install/postinstall |
| minimatch | 11.0.9 | BlueOak-1.0.0 | 20 or >=22 | No preinstall/install/postinstall |
| path-scurry | 3.0.0 | BlueOak-1.0.0 | 18 or 20 or >=22 | No preinstall/install/postinstall |
| @isaacs/nonrecursive-glob-match | 1.1.0 | BlueOak-1.0.0 | No engine field declared | No preinstall/install/postinstall |

BlueOak-1.0.0 is an OSI-approved permissive open-source license; retain its notice obligations wherever these package materials are redistributed. Published manifests declare prepare/build scripts, but no new install/postinstall lifecycle hook. The package tarballs and lockfile integrity, Node/pnpm compatibility and peer/dependency resolution were inspected; existing React/i18n/worker/PWA runtime dependencies remain pinned.

**Security gate:** unrestricted **corepack pnpm audit** and **corepack pnpm audit --json** both succeed with **no known vulnerabilities** and no suppression, threshold, ignore, advisory waiver or security-policy change. Neither **GHSA-3g3m-2fjr-6pw4** nor **GHSA-g3hv-75wg-m249** remains in the installed Workbox chain. The actual module-resolution test starts at apps/web's vite-plugin-pwa, resolves the workbox-build module and then the glob and minimatch modules Workbox loads; the locked and installed versions match the graph above.

## Real generated Workbox and browser compatibility

- Workbox's installed CommonJS code calls globSync with cwd/follow/ignore; glob 14.0.3 still exposes that shape. A new [isolated getManifest compatibility regression](../../tests/web/precache-contract.spec.ts) was first observed failing at the unpatched glob 11.1.0, then passed on the override. It proves recursive nested JS/CSS/SVG, HTML, PNG, webmanifest, MD5 content revisions, ignore rules, hidden/dotfile behavior, and exclusion of maps, JSON API/private fixtures and unrelated files. It does not pretend all private files would be excluded if a future deployment placed executable JS in the public build directory.
- **Production Vite build passed.** Remediated SW SHA-256 is **the same exact hash as baseline**: c8d75b103f950ffe841aa3a64b6f9dda0238d385f0c87f04c5f1044e9fd1f122. Generated service worker, precache URLs/revisions, runtime Workbox asset and static build asset filenames/hashes remain unchanged. The manifest still has 13 entries/10 unique URLs (three pre-existing identical duplicates); the actual Cache Storage browser test verifies **unique cache keys**, expected HTML/JS/CSS/PNG/webmanifest/worker/bootstrap assets, same-origin URLs and no maps, hidden paths, API/private/provider/auth/sync content or unexpected network-data caches.
- Existing production Chromium checks prove real controlled **offline /settings and / reload**, actual diagnostic-worker round-trip/cancellation acknowledgment and cleanup, and **real A-to-B service-worker waiting/explicit user consent/controller transition/reload** on a copied production build. SW update remains opt-in: skipWaiting and clientsClaim are false by default, no surprise reload or broad runtime caches; negative navigation patterns and CSP unchanged.
- The A-to-B test changes only the copied service-worker bytes, not a second independently built app with different chunks. It tests an in-memory marker, **not** preservation of future learner edits or multitab migration; no learner storage exists yet. A future private JS file placed under the public dist directory would be captured by the existing broad static extension glob: future features must never emit private data there and must independently verify exclusions.

## Full verification and performance

Local host: Windows, Node **22.20.0**, pnpm **9.15.0**, Chrome **158**, Lighthouse **13.6.0**. All of these were run after the change:

| Gate | Actual result |
|---|---|
| Frozen pnpm install | **PASS**, lock reproducible |
| pnpm verify | **PASS**, 24 test files, 106 Windows tests passed + 1 expected Windows-only skip; boundaries/typecheck/Biome/agentcheck |
| Unrestricted pnpm audit | **PASS, zero known advisories** |
| Storybook production build | **PASS**, existing unrelated bundler warnings preserved |
| Existing Chromium/axe | **88/88 PASS; 141 unique stories, 164/164 states**; existing axe incomplete manual issues unchanged |
| Web production build and Chromium | **PASS; 12 tests passed, 1 intentional opt-in screenshot skip**, including new scoped manifest contract and expanded real precache-cache assertion |
| Byte budget | **163,371 B gzip** initial HTML/JS/CSS/bootstrap; **187,458 B gzip** including separately loaded worker; **unchanged** from pre-override baseline, below 250 KB |
| Lighthouse desktop | **100 Performance / 100 Accessibility**, FCP/LCP **245/245 ms**, TBT **0**, CLS **0**; measured 2026-11-25T01:26:02.644Z |
| Lighthouse simulated mobile | **100 Performance / 100 Accessibility**, FCP/LCP **905/905 ms**, TBT **0**, CLS **0**; measured 2026-11-25T01:26:14.336Z |

Raw local audit, gzip and Lighthouse JSON reports were kept in ignored coverage/audit21 rather than committing test artifacts. This is browser-automation evidence, **not** physical mobile/WebView performance, native assistive-technology testing, native Windows forced colors or WCAG certification.

## Independent read-only review and remaining risks

- **Architecture:** no confirmed new architectural blocker; Workbox globSync contract, generated SW/static caches and app CSP retain behavior. Document the out-of-range major-version risk and the difference between current real output and hypothetical future private static files.
- **UX/accessibility:** no confirmed new UI regression; app source, designs and screenshots did not change. Existing mobile dock can cover unfocused text at intermediate scroll positions; tested interactive focus clearance does not establish exhaustive natural Tab/Shift+Tab or announcement behavior. The update prompt/dock geometry and keyboard activation under every short viewport remain acceptance/future-regression candidates, not findings attributable to this dependency change.
- **Security:** fresh independent read-only audit found **no newly demonstrated security blocker** in the scoped package/lock/actual resolution, zero-vulnerability unrestricted audit, license/engine/lifecycle, CSP or static-only cache behavior. It independently confirmed 640 total audited dependencies, no muted advisory/actions and no new install/postinstall hook. The prior baseline SW bytes are no longer retained locally after Playwright cleanup, so parity is grounded in the captured genuine pre-change SHA-256 and matching current built SHA, not a surviving independent baseline archive. The inherited public output glob can include a future private-named JS/HTML asset if carelessly emitted to dist. A green audit and tested narrow matching surface do **not** make Workbox's upstream major-version contract officially compatible.
- **Removal trigger:** as soon as Workbox releases an officially supported patched dependency range resolving both advisories, remove this narrow override in a separately reviewed change, rerun frozen/audit/precache/offline/update/axe/CI and compare the emitted SW. Do not silently adopt another dependency version.

**Unchanged gates:** M0-003 and M0-004 remain in progress; manual supported screen-reader/native Windows forced-colors and applicable axe incomplete dispositions are **NOT RUN**; ADR-0010 remains **PROPOSED**; M0-017 Glassy Dashboard V5 fidelity, M0-018 motion, M0-019 licensed imagery/actual contrast and M0-020 WebView performance remain future work. **No merge, release, M0-005 or later implementation is authorized.** Exact final commit and all three hosted GitHub Actions outcomes must be verified on PR #18 before any separate owner acceptance decision.
