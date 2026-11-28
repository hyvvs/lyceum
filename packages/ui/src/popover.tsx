import * as DialogPrimitive from "@radix-ui/react-dialog";
import { type ReactNode, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Button } from "./button";
import { tooltipInteraction } from "./motion";

export interface PopoverProps {
  triggerLabel: string;
  title: string;
  description?: string;
  children: ReactNode;
  disabled?: boolean;
  loading?: boolean;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  closeLabel?: string;
}

/** Nonmodal, labeled floating disclosure. Radix manages Escape and focus return. */
export function Popover({
  triggerLabel,
  title,
  description,
  children,
  disabled,
  loading,
  open,
  defaultOpen,
  onOpenChange,
  closeLabel = "Close",
}: PopoverProps) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen ?? false);
  const [contentReady, setContentReady] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLElement>(null);
  const hasFocusedOpenContentRef = useRef(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const isOpen = open ?? internalOpen;
  const captureContentRef = useCallback((node: HTMLDivElement | null) => {
    contentRef.current = node;
    setContentReady(node !== null);
  }, []);

  useLayoutEffect(() => {
    if (!isOpen) {
      setPosition(null);
      return;
    }
    // Radix portals mount in a subsequent commit. Re-run once the actual
    // portalled content ref exists rather than leaving the disclosure hidden.
    if (!contentReady) return;
    const anchor = triggerRef.current;
    const content = contentRef.current;
    if (!anchor || !content) return;
    const gutter = tooltipInteraction.collisionPaddingPx;
    const offset = tooltipInteraction.sideOffsetPx;
    const updatePosition = () => {
      const trigger = anchor.getBoundingClientRect();
      const popup = content.getBoundingClientRect();
      const viewportWidth = document.documentElement.clientWidth;
      const viewportHeight = document.documentElement.clientHeight;
      const topBelow = trigger.bottom + offset;
      const topAbove = trigger.top - popup.height - offset;
      const heightLimit = Math.max(gutter, viewportHeight - popup.height - gutter);
      const top =
        topBelow + popup.height <= viewportHeight - gutter
          ? topBelow
          : topAbove >= gutter
            ? topAbove
            : Math.max(gutter, Math.min(topBelow, heightLimit));
      const left = Math.max(gutter, Math.min(trigger.left, viewportWidth - popup.width - gutter));
      setPosition((previous) =>
        previous?.top === top && previous.left === left ? previous : { top, left },
      );
    };
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    const observer = new ResizeObserver(updatePosition);
    observer.observe(content);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
      observer.disconnect();
    };
  }, [isOpen, contentReady]);

  useEffect(() => {
    if (!isOpen) {
      hasFocusedOpenContentRef.current = false;
      return;
    }
    if (!contentReady || !position || hasFocusedOpenContentRef.current) return;
    // Radix's non-modal primitive intentionally leaves focus on the trigger.
    // Move it once to the disclosure's first actionable control after the
    // portalled content has been measured and is actually visible.
    const frame = requestAnimationFrame(() => {
      const close = closeRef.current;
      if (!close) return;
      close.focus({ preventScroll: true });
      if (document.activeElement === close) hasFocusedOpenContentRef.current = true;
    });
    return () => cancelAnimationFrame(frame);
  }, [isOpen, contentReady, position]);

  return (
    <DialogPrimitive.Root
      modal={false}
      open={isOpen}
      onOpenChange={(next) => {
        if (open === undefined) setInternalOpen(next);
        onOpenChange?.(next);
      }}
    >
      <DialogPrimitive.Trigger asChild>
        <Button
          className="ui-popover-trigger"
          variant="secondary"
          ref={triggerRef}
          disabled={disabled ?? false}
          loading={loading ?? false}
        >
          {triggerLabel}
        </Button>
      </DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Content
          className="glass-float ui-popover-content"
          ref={captureContentRef}
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            closeRef.current?.focus();
          }}
          style={{
            ...(position ?? {}),
            visibility: position ? "visible" : "hidden",
          }}
          {...(description ? {} : { "aria-describedby": undefined })}
        >
          <div className="ui-popover-heading">
            <DialogPrimitive.Title>{title}</DialogPrimitive.Title>
            <DialogPrimitive.Close asChild>
              <Button ref={closeRef} variant="secondary">
                {closeLabel}
              </Button>
            </DialogPrimitive.Close>
          </div>
          {description && <DialogPrimitive.Description>{description}</DialogPrimitive.Description>}
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
