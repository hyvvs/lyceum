import * as ToastPrimitive from "@radix-ui/react-toast";
import {
  type ComponentPropsWithoutRef,
  type RefObject,
  createContext,
  forwardRef,
  useContext,
  useEffect,
  useRef,
} from "react";

const ToastFocusOrigin = createContext<RefObject<HTMLElement | null> | null>(null);

/** Localize both labels; Radix uses the provider label inside its single live announcer. */
export type ToastProviderProps = Omit<
  ComponentPropsWithoutRef<typeof ToastPrimitive.Provider>,
  "label" | "duration"
> & {
  label: string;
};

/** The provider owns native pause/resume timers, including pointer, focus and window blur. */
export function ToastProvider({ label, ...props }: ToastProviderProps) {
  if (!label?.trim()) throw new Error("ToastProvider label must be nonempty.");
  const focusOrigin = useRef<HTMLElement | null>(null);
  useEffect(() => {
    // Background tabs do not consistently deliver window blur on every WebView.
    // Target Radix's own viewport pause/resume handlers, without synthesizing
    // global window blur/focus (which would affect unrelated application code).
    const viewports = () => document.querySelectorAll<HTMLOListElement>(".lyceum-toast__viewport");
    const isInteracting = (viewport: HTMLOListElement) =>
      viewport.matches(":hover") || viewport.contains(document.activeElement);
    const pause = (viewport: HTMLOListElement) =>
      viewport.parentElement?.dispatchEvent(new Event("focusin"));
    const resume = (viewport: HTMLOListElement) =>
      viewport.parentElement?.dispatchEvent(
        new FocusEvent("focusout", { relatedTarget: document.body }),
      );
    const onVisibilityChange = () => {
      for (const viewport of viewports()) {
        if (document.visibilityState === "hidden") pause(viewport);
        else if (document.hasFocus() && !isInteracting(viewport)) resume(viewport);
      }
    };
    const onWindowFocus = () => {
      // Radix itself resumes unconditionally on native window.focus. Reassert
      // the hover/focus/hidden pause *after* its listener has run, otherwise a
      // returned tab can dismiss a notification the learner is still reading.
      queueMicrotask(() => {
        for (const viewport of viewports()) {
          if (document.visibilityState === "hidden" || isInteracting(viewport)) pause(viewport);
        }
      });
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("focus", onWindowFocus);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("focus", onWindowFocus);
    };
  }, []);
  return (
    <ToastFocusOrigin.Provider value={focusOrigin}>
      <ToastPrimitive.Provider {...props} label={label} duration={8000} />
    </ToastFocusOrigin.Provider>
  );
}

export type ToastViewportProps = Omit<
  ComponentPropsWithoutRef<typeof ToastPrimitive.Viewport>,
  "label" | "role" | "tabIndex" | "aria-hidden" | "asChild" | "hidden" | "hotkey"
> & {
  label: string;
  role?: never;
  tabIndex?: never;
  "aria-hidden"?: never;
  asChild?: never;
  hidden?: never;
  hotkey?: never;
};

/** F8 moves focus to the notification list; don't suppress the Radix focus proxies. */
export const ToastViewport = forwardRef<HTMLOListElement, ToastViewportProps>(
  function ToastViewport(
    {
      label,
      className,
      role,
      tabIndex,
      "aria-hidden": ariaHidden,
      asChild,
      hidden,
      hotkey,
      onFocusCapture,
      ...props
    },
    ref,
  ) {
    const focusOrigin = useContext(ToastFocusOrigin);
    if (
      !label?.trim() ||
      role !== undefined ||
      tabIndex !== undefined ||
      ariaHidden !== undefined ||
      asChild !== undefined ||
      hidden !== undefined ||
      hotkey !== undefined
    ) {
      throw new Error("ToastViewport label and structural focus semantics cannot be overridden.");
    }
    return (
      <ToastPrimitive.Viewport
        {...props}
        label={label}
        ref={ref}
        className={["lyceum-toast__viewport", className].filter(Boolean).join(" ")}
        onFocusCapture={(event) => {
          // F8 focuses the viewport *before* Tab reaches a Toast. Preserve the
          // control that originally invoked F8, not the intervening viewport.
          const previous = event.relatedTarget;
          if (
            previous instanceof HTMLElement &&
            !event.currentTarget.contains(previous) &&
            focusOrigin
          ) {
            focusOrigin.current = previous;
          }
          onFocusCapture?.(event);
        }}
      />
    );
  },
);

export type ToastKind = "info" | "success" | "warning" | "error" | "loading";
/** "polite" => Radix background => aria-live=polite;
 * "assertive" => Radix foreground => aria-live=assertive.
 * Use assertive sparingly for timely user-initiated feedback, not every error.
 */
export type ToastPriority = "polite" | "assertive";

export type ToastProps = Omit<
  ComponentPropsWithoutRef<typeof ToastPrimitive.Root>,
  | "duration"
  | "type"
  | "role"
  | "aria-live"
  | "aria-hidden"
  | "asChild"
  | "hidden"
  | "tabIndex"
  | "onEscapeKeyDown"
  | "onKeyDown"
> & {
  kind?: ToastKind;
  priority?: ToastPriority;
  durationMs?: number;
  /** No auto-dismiss; essential instructions/actions belong in persistent inline UI or Dialog. */
  persistent?: boolean;
  type?: never;
  role?: never;
  "aria-live"?: never;
  "aria-hidden"?: never;
  asChild?: never;
  hidden?: never;
  tabIndex?: never;
  onEscapeKeyDown?: never;
  onKeyDown?: never;
};

/** Individual notice primitive, NOT a queue or deduplication service. */
export const Toast = forwardRef<HTMLLIElement, ToastProps>(function Toast(
  {
    className,
    kind = "info",
    priority = "polite",
    durationMs,
    persistent = false,
    type,
    role,
    "aria-live": ariaLive,
    "aria-hidden": ariaHidden,
    asChild,
    hidden,
    tabIndex,
    onEscapeKeyDown,
    onKeyDown,
    onOpenChange,
    onFocusCapture,
    ...props
  },
  ref,
) {
  if (
    type !== undefined ||
    role !== undefined ||
    ariaLive !== undefined ||
    ariaHidden !== undefined ||
    asChild !== undefined ||
    hidden !== undefined ||
    tabIndex !== undefined ||
    onEscapeKeyDown !== undefined ||
    onKeyDown !== undefined
  ) {
    throw new Error("Toast type, role and live-region semantics cannot be overridden.");
  }
  if (priority !== "polite" && priority !== "assertive") {
    throw new Error("Toast priority must be polite or assertive.");
  }
  if (durationMs !== undefined && (!Number.isFinite(durationMs) || durationMs <= 0)) {
    throw new Error("Toast durationMs must be a finite positive number.");
  }
  if (persistent && durationMs !== undefined) {
    throw new Error("Toast persistent and durationMs must not be combined.");
  }
  const toastRef = useRef<HTMLLIElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const focusOrigin = useContext(ToastFocusOrigin);
  return (
    <ToastPrimitive.Root
      {...props}
      ref={(node) => {
        toastRef.current = node;
        if (typeof ref === "function") ref(node);
        else if (ref) ref.current = node;
      }}
      type={priority === "assertive" ? "foreground" : "background"}
      duration={persistent ? Number.POSITIVE_INFINITY : durationMs}
      data-kind={kind}
      className={["glass-float", "lyceum-toast", className].filter(Boolean).join(" ")}
      onFocusCapture={(event) => {
        const previous = event.relatedTarget;
        if (
          previous instanceof HTMLElement &&
          !toastRef.current?.contains(previous) &&
          !previous.closest(".lyceum-toast__viewport")
        ) {
          previousFocusRef.current = previous;
          if (focusOrigin) focusOrigin.current = previous;
        }
        onFocusCapture?.(event);
      }}
      onOpenChange={(open) => {
        // Capture the viewport while the Toast node still exists: Radix unmounts
        // it before the queued focus-recovery microtask runs.
        const viewport = toastRef.current?.closest("ol");
        onOpenChange?.(open);
        if (!open) {
          // Radix sends focus from a dismissed focused Toast to its viewport.
          // Return to the keyboard's previous control, not an empty region.
          queueMicrotask(() => {
            const previous = focusOrigin?.current ?? previousFocusRef.current;
            if (
              viewport &&
              document.activeElement === viewport &&
              previous?.isConnected &&
              !previous.closest('[inert], [aria-hidden="true"]')
            ) {
              previous.focus({ preventScroll: true });
            }
          });
        }
      }}
    />
  );
});

export type ToastTitleProps = ComponentPropsWithoutRef<typeof ToastPrimitive.Title>;
export const ToastTitle = forwardRef<HTMLDivElement, ToastTitleProps>(function ToastTitle(
  { className, ...props },
  ref,
) {
  return (
    <ToastPrimitive.Title
      {...props}
      ref={ref}
      className={["lyceum-toast__title", className].filter(Boolean).join(" ")}
    />
  );
});

export type ToastDescriptionProps = ComponentPropsWithoutRef<typeof ToastPrimitive.Description>;
export const ToastDescription = forwardRef<HTMLDivElement, ToastDescriptionProps>(
  function ToastDescription({ className, ...props }, ref) {
    return (
      <ToastPrimitive.Description
        {...props}
        ref={ref}
        className={["lyceum-toast__description", className].filter(Boolean).join(" ")}
      />
    );
  },
);

export type ToastActionProps = Omit<
  ComponentPropsWithoutRef<typeof ToastPrimitive.Action>,
  "type" | "asChild"
> & {
  altText: string;
  type?: never;
  asChild?: never;
};
/** Radix excludes action text from its announcement and announces safe alternative text. */
export const ToastAction = forwardRef<HTMLButtonElement, ToastActionProps>(function ToastAction(
  { altText, type, asChild, className, ...props },
  ref,
) {
  if (!altText?.trim() || type !== undefined || asChild !== undefined) {
    throw new Error(
      "ToastAction altText must be nonempty; native non-submit semantics are required.",
    );
  }
  return (
    <ToastPrimitive.Action
      {...props}
      altText={altText}
      ref={ref}
      type="button"
      className={["lyceum-toast__action", className].filter(Boolean).join(" ")}
    />
  );
});

export type ToastCloseProps = Omit<
  ComponentPropsWithoutRef<typeof ToastPrimitive.Close>,
  "aria-label" | "type" | "asChild"
> & {
  "aria-label": string;
  type?: never;
  asChild?: never;
};
/** A dismissal always has an explicit accessible name and never submits a form. */
export const ToastClose = forwardRef<HTMLButtonElement, ToastCloseProps>(function ToastClose(
  { "aria-label": label, type, asChild, className, ...props },
  ref,
) {
  if (!label?.trim() || type !== undefined || asChild !== undefined) {
    throw new Error("ToastClose aria-label is required; native non-submit semantics are required.");
  }
  return (
    <ToastPrimitive.Close
      {...props}
      ref={ref}
      aria-label={label}
      type="button"
      className={["lyceum-toast__close", className].filter(Boolean).join(" ")}
    />
  );
});
