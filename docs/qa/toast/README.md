# M0-003 Toast: original Chromium QA and bundle evidence

Eight **real Chromium viewport screenshots** of Radix Toast through the seven
Lyceum wrappers, not mockups. The Storybook gradient is **temporary token-based
QA scenery**, not an original/licensed production backdrop and not taken from
the Glassy Dashboard V5 reference.

| Actual state | File | Viewport |
| --- | --- | --- |
| Dark solid | [toast-dark.png](toast-dark.png) | 800×520 |
| True full frosted glass | [toast-dark-full.png](toast-dark-full.png) | 800×520 |
| Same dark scene, opaque fallback | [toast-dark-opaque.png](toast-dark-opaque.png) | 800×520 |
| Light solid | [toast-light.png](toast-light.png) | 800×520 |
| High contrast | [toast-high-contrast.png](toast-high-contrast.png) | 800×520 |
| Three individually controlled notices | [toast-stacked.png](toast-stacked.png) | 800×520 |
| Long notice, 200% root text | [toast-double-text.png](toast-double-text.png) | 320×256 |
| Long notice, 200% root text before keyboard scrolling | [toast-double-text-start.png](toast-double-text-start.png) | 320×256 |

The capture script confirms a real full-glass blur, no blurred ancestor,
solid fallback without blur, a 32px root at 200% text and no horizontal page
overflow. The narrow screenshot deliberately focuses **Dismiss**, scrolling
the long notice internally to its end. Earlier text is still reachable by
scroll/keyboard; a cropped viewport is not evidence of missing content.

## Reproduce

1. Run **corepack pnpm install --frozen-lockfile** and **corepack pnpm storybook:build**.
2. Start **corepack pnpm exec vite preview --outDir storybook-static --host 127.0.0.1 --port 6006 --strictPort** in one terminal.
3. Run **node docs/qa/toast/capture.mjs** in another. Only loopback HTTP is accepted; all eight PNGs are viewport captures.
4. Run **corepack pnpm verify**, unrestricted **corepack pnpm audit**, and **corepack pnpm test:ui**, inspecting **tests/ui/toast.spec.ts**.
5. Run **node docs/qa/toast/measure-bundle.mjs** for two comparable production-minified UI library builds and the real CSS delta.

## Accessibility and policy contract

- Lyceum **priority=polite** maps to Radix **type=background**, producing a
  single transient role=status, aria-live=polite announcement. Explicit
  **priority=assertive** maps to Radix **type=foreground**, producing a single
  role=status, aria-live=assertive announcement. Foreground is for timely
  attention, including appropriate learner-initiated feedback, not every
  error. The wrapper does not introduce a second live region. Radix substitutes
  required ToastAction.altText for the optional action and omits the close
  button from the announcement.
- F8, Tab, Shift+Tab, Enter/Space, Escape and dismissal remain keyboard
  operable without auto-focus. The wrapper restores the pre-F8 focus origin
  after a keyboard-focused Toast closes; passive expiry must not steal focus.
- Default lifetime 8000ms; configurable positive durationMs or explicit
  persistence, mutually exclusive. Radix alone owns the dismiss timer and
  hover/focus/window-blur pause. A visibility-change fallback reconciles
  background tabs with that timer; Chromium tests emulate visibility and
  combined hover/focus. These tests do not establish behavior of every real
  WebView background-suspension implementation.
- Toast actions are optional and safely ignorable. Essential learning
  instructions, necessary decisions and consequential recovery belong in
  persistent inline UI or accessible Dialog, never exclusively in an
  auto-disappearing Toast.

## Stacking and duplicates: example only, not a queue service

The Stacked story renders exactly **three independent controlled Toasts**;
the Duplicate story coalesces repeated requests into one notice. The seven
exported primitives do **not** implement a global notification manager,
max-three enforcement for arbitrary consumers, queue ordering or global
duplicate reconciliation. The future consuming notification system must
enforce at most three visible, bounded deterministic ordering, safe duplicate
handling, and no silent loss of important information; any new public queue
API requires separate owner approval. The demo is tested not to obscure its
own essential trigger at 800×520 and narrow 320×256/200% text.
At 320×256 the demonstration trigger has a shorter visible word while its
accessible name remains fully descriptive; this preserves genuine 200% text
and the focus outline on platforms with differing font metrics. A separate
ProviderIsolation fixture checks the independent viewport timer ownership
of two providers, not a global queue or multi-provider F8 hotkey contract;
one provider/viewport per application root is recommended.

## Incremental bundle measurement

The reproducible measure-bundle.mjs runs two production-minified Vite
ES-library builds of **the same named existing Lyceum primitives**, then adds
only the seven Toast exports. Direct source imports prevent the baseline from
accidentally pulling Toast through index.ts re-exports. React/ReactDOM are
external in both; Radix runtime dependencies are included and shared.
The script reports raw and gzip JS differences and the real glass.css
difference against Select merge
abb53d63fef867346c4e417a79d9393e7982cdac.

There is **no M0-004 web app route yet**, so this is a comparable real
incremental library measurement, **not** proof of the final 250 KB initial
route budget. A Storybook bundle size is not a production-route measurement.

The full Glassy Dashboard V5-inspired visual-fidelity gate remains M0-017:
original/licensed atmospheric imagery, genuinely frosted layered/rim-lit
panels, pill navigation, left icon dock, tinted cards, focal accent, refined
typography, and side-by-side finished full-glass/solid-fallback visual
comparison. No reference assets may be copied. M0-018 spring motion, M0-019
backdrop/rendered-pixel contrast and M0-020 supported-WebView measurements
remain separate; M0-020 follows M0-017 **and** M0-005.
