# M0-003 VisuallyHidden: semantic and accessibility verification

The approved `VisuallyHidden` export is **noninteractive text only**, not a generic
layout or heading helper. Radix `Root` owns the clipped, screen-reader-only
`span`; Lyceum owns strict runtime validation and exports exactly the component
and its `VisuallyHiddenProps` type. The type surface is `children: string | number`,
optional `id`, `lang`, `dir: "ltr" | "rtl" | "auto"`, plus a forwarded `HTMLSpanElement`
ref. Empty/whitespace-only text, nonfinite numbers, arrays/React elements and
unapproved props throw rather than silently invalidating accessibility. Numeric
zero is a valid label.
Text made entirely of Unicode default-ignorable characters (such as U+200B
zero-width space or U+FE0F variation selector) is also rejected; original
multilingual text is not changed when it contains meaningful characters.

**No `asChild` API:** this wrapper cannot hide an existing semantic heading
element. A future Dialog requiring visually hidden native heading semantics
must seek a separate public API approval; do not use this text-only component
to replace a required heading's semantics. The hidden span is not focusable and
must never contain a focusable control.

## Reproduce from the VisuallyHidden branch

1. `corepack pnpm install --frozen-lockfile`
2. `corepack pnpm verify` (includes SSR and strict runtime-rejection unit tests)
3. `corepack pnpm audit` (unrestricted)
4. `corepack pnpm storybook:build`
5. `corepack pnpm test:ui` (build the Storybook first; Playwright starts its own
   local `127.0.0.1:6006` preview server)
6. `node docs/qa/visually-hidden/measure-bundle.mjs` for controlled
   production-minified JS delta and gzip measurements.

The `Primitives/VisuallyHidden` stories demonstrate a reference icon-only
Lyceum `Button` and an otherwise-identical Button named only by the visually
hidden text. Browser acceptance checks the **actual Chromium accessibility
tree**, button accessible name, Radix-clipped DOM span, forwarded DOM ref,
Tab/Shift+Tab and visible button focus ring (never a hidden focus target),
geometry equality, native forced-colors, RTL/Arabic, numeric zero, actual
32px root font at 200%, and axe throughout relevant themes and states.

Because the primitive itself is deliberately **invisible and noninteractive**,
hover/focus/disabled/loading/error/empty are not independent visual or input
states of its `span`. Those Storybook states instead exercise the *consuming*
Button, with meaningful nonblank text for loading/error/empty. No appearance
changes, glass classes, CSS layers, motion or production imagery are introduced.
This acceptance is not evidence of a completed whole-app Glassy Dashboard V5
fidelity gate; M0-017 through M0-020 remain separate.

## Dependency and bundle interpretation

`@radix-ui/react-visually-hidden@1.2.13` is a direct, pinned, MIT dependency.
It was already present transitively through Select, Toast and Tooltip. Verify
the lockfile's only intended resolution change is the `packages/ui` importer.
The bundle comparison deliberately exports the same existing UI primitives
with and without the *new* component, using Vite production minification and
React/ReactDOM external in both. This is **not** an M0-004 initial-route size
measurement or proof of a 250 KB route budget.

Measured controlled library result: **181,253 → 182,125 raw JS bytes
(+872)**, **48,922 → 49,138 gzip JS bytes (+216)**; **CSS +0 bytes**.
The new direct dependency changes only the lockfile's `packages/ui` importer;
the existing Radix `1.2.13` resolution and transitive packages are unchanged.
