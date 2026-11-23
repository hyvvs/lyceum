# ADR-0009: Reuse Radix-owned focus lifecycles; defer a standalone focus scope

- Status: accepted
- Date: 2026-11-23
- Accepted: 2026-11-23
- Deciders: Lyceum owner (deferral decision and explicit ADR acceptance)

The owner explicitly accepted this ADR and the existing architectural *scope deferral* on 2026-11-23. Accepting the ADR does not implement a FocusScope helper or complete M0-003.

## Context

`tasks/M0-foundations.md` M0-003 originally lists "FocusScope helpers" among the Radix-based primitives. The merged `packages/ui/src/dialog.tsx` and `packages/ui/src/select.tsx` already delegate focus containment and restoration to their respective Radix implementations; `tests/ui/select-dialog.spec.ts` and `tests/ui/toast.spec.ts` exercise their actual nested portals and cleanup. There is **no current consumer** of a separate Lyceum-owned FocusScope component.

Installed `@radix-ui/react-focus-scope@1.3.1` is already transitive through Dialog, Select and Tooltip, but not a direct dependency of `packages/ui`. Its actual `dist/index.mjs` mounts a focus stack, attempts to focus a tabbable descendant (or container) on mount, and schedules focus restoration with `setTimeout(0)` on unmount **even when `loop=false` and `trapped=false`**. Nested scope stack ordering, removed targets, StrictMode replay and independently portalled content therefore require explicit ownership. A new wrapper is not a harmless passive container.

## Options considered

1. **Export a general `FocusScope` wrapper now:** superficially satisfies the component list, but introduces uncontrolled mount/unmount focus movement and competing modal ownership without a consumer.
2. **Add a private `OwnedFocusBoundary` now:** smaller interface, but still adds a second focus owner and requires a direct dependency, restoration policy and integration tests without a demonstrated need.
3. **Use existing Radix-owned Dialog/Select focus management; defer both new helpers (chosen by the owner):** avoids unnecessary traps and dependencies while retaining focus behavior backed by the real integration tests.

## Decision

The owner **approved option 3**: no new standalone public `FocusScope`, private `OwnedFocusBoundary`, custom/global focus manager, extra focus trap or direct `@radix-ui/react-focus-scope` dependency is authorized now. This is an **APPROVED DEFERRAL, not an implemented FocusScope helper**. The M0-003 task card must retain an explicit traceable statement of the original FocusScope-helper requirement and the decision to defer it; the milestone stays **[~]** until its entire acceptance audit and corrective work are approved.

Dialog and Select remain the owners of their existing **modal focus containment and restoration**. Toast independently handles its own F8 viewport and focus-origin restoration; `packages/ui/src/select.tsx` also owns the temporary background `inert` reconciliation around Radix's portal behavior. Do not override or disable these Radix/component focus, portal or accessibility behaviors to satisfy a hypothetical future abstraction.

## Consequences and revisit trigger

- Positive: no duplicate focus owner, public interface expansion, direct dependency or untested trap. The existing Dialog + Select integration and Toast composition remain under CI.
- Limitation: no standalone FocusScope helper is available or claimed as complete; this is an intentional owner-approved scope exception to the original task card.
- **Revisit only when a concrete, reviewed Lyceum component actually needs focus containment that the existing Dialog/Select APIs cannot provide.** File a narrowly scoped proposal identifying the consumer, why existing modal primitives cannot serve it, the focus owner, initial/return targets, cleanup, portal boundaries, accessible fallback, and alternatives. Obtain explicit separate approval before adding any direct dependency or internal/public interface.
- Tests first for any later approval: mount/unmount focus movements; Tab/Shift+Tab first/last/empty; `loop` versus `trapped`; pointer and programmatic outside focus; nested pause/resume and closing order; StrictMode mount/unmount/remount; removed/hidden trigger restoration; portalled descendants; real Dialog + Select + Toast composition; no stale `aria-hidden`/`inert`; Chromium keyboard/axe, 320×256 true 200% text, RTL, forced colors, reduced motion and solid fallbacks. Never introduce an unreviewed global focus manager or relax existing checks.
- **No change to ADR-0008** or Glassy Dashboard V5 fidelity gates. M0-017 must show atmospheric layered glass, real floating pill nav/dock, tinted panels and polished opaque variants; M0-018/019/020 retain separate motion, licensed imagery/rendered-pixel contrast and per-WebView performance gates.

This accepted ADR records the owner's explicit architectural decision. Reopening or expanding the scope requires separate approval.
