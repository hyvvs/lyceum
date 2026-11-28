import { type ReactNode, useCallback, useEffect, useId, useLayoutEffect, useRef } from "react";
import { spring } from "./motion";

export interface MorphingRailItem {
  id: string;
  label: string;
  icon: ReactNode;
}

export interface MorphingRailProps {
  items: readonly MorphingRailItem[];
  activeId: string;
  onActivate: (id: string) => void;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  ariaLabel?: string;
  className?: string;
  utilities?: readonly MorphingRailItem[];
  onUtilityActivate?: (id: string) => void;
}

type Coordinate = "width" | "selectedY" | "selectedHeight" | "open";
type Springs = Record<Coordinate, number>;
type MotionModel = { current: Springs; velocity: Springs; target: Springs; lastFrame: number };
type RailMetrics = { unit: number; radius: number; height: number };

/**
 * One white SVG surface connects the current item to the utility spine.
 * The compact indicator and this surface share the same interruptible
 * spring-coordinates; they are not independently animated item pills.
 */
export function connectedSelectionPath(
  width: number,
  selectedY: number,
  selectedHeight: number,
  height: number,
  utilityWidth: number,
  radius: number,
): string {
  const right = Math.max(utilityWidth, width);
  const spine = right - utilityWidth;
  const top = Math.max(radius, selectedY);
  const bottom = Math.min(height - radius, top + selectedHeight);
  const selectedLeft = radius / 2;
  const rounded = Math.min(radius, (bottom - top) / 2);
  const reach = Math.max(selectedLeft + rounded, spine);

  return [
    `M ${spine + radius} 0`,
    `H ${right - radius}`,
    `Q ${right} 0 ${right} ${radius}`,
    `V ${height - radius}`,
    `Q ${right} ${height} ${right - radius} ${height}`,
    `H ${spine + radius}`,
    `Q ${spine} ${height} ${spine} ${height - radius}`,
    `V ${bottom + rounded}`,
    `Q ${spine} ${bottom} ${reach - rounded} ${bottom}`,
    `H ${selectedLeft + rounded}`,
    `Q ${selectedLeft} ${bottom} ${selectedLeft} ${bottom - rounded}`,
    `V ${top + rounded}`,
    `Q ${selectedLeft} ${top} ${selectedLeft + rounded} ${top}`,
    `H ${reach - rounded}`,
    `Q ${spine} ${top} ${spine} ${top - rounded}`,
    `V ${radius}`,
    `Q ${spine} 0 ${spine + radius} 0`,
    "Z",
  ].join(" ");
}

function roundedPillPath(width: number, height: number, radius: number): string {
  const r = Math.min(radius, width / 2, height / 2);
  return [
    `M ${r} 0 H ${width - r}`,
    `Q ${width} 0 ${width} ${r}`,
    `V ${height - r}`,
    `Q ${width} ${height} ${width - r} ${height}`,
    `H ${r}`,
    `Q 0 ${height} 0 ${height - r}`,
    `V ${r}`,
    `Q 0 0 ${r} 0 Z`,
  ].join(" ");
}

const numberFromToken = (root: HTMLElement, property: string, fallback: number): number => {
  const parsed = Number.parseFloat(getComputedStyle(root).getPropertyValue(property));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

function shouldReduceMotion(): boolean {
  const motion = document.documentElement.dataset.motion;
  if (motion === "off" || motion === "reduced") return true;
  if (motion === "full") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function MorphingRail({
  items,
  activeId,
  onActivate,
  expanded,
  onExpandedChange,
  ariaLabel = "Workspace navigation",
  className,
  utilities,
  onUtilityActivate,
}: MorphingRailProps) {
  const listId = useId();
  const navRef = useRef<HTMLElement>(null);
  const railPathRef = useRef<SVGPathElement>(null);
  const selectedPathRef = useRef<SVGPathElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const collapsedDiscRef = useRef<HTMLSpanElement>(null);
  const utilityRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);
  const metricsRef = useRef<RailMetrics>({ unit: 48, radius: 24, height: 640 });
  const modelRef = useRef<MotionModel>({
    current: { width: 72, selectedY: 180, selectedHeight: 44, open: 0 },
    velocity: { width: 0, selectedY: 0, selectedHeight: 0, open: 0 },
    target: { width: 72, selectedY: 180, selectedHeight: 44, open: 0 },
    lastFrame: 0,
  });

  const paint = useCallback(() => {
    const nav = navRef.current;
    const rail = railPathRef.current;
    const selected = selectedPathRef.current;
    const disc = collapsedDiscRef.current;
    const utility = utilityRef.current;
    const backdrop = backdropRef.current;
    if (!nav || !rail || !selected || !disc || !utility || !backdrop) return;
    const { unit, radius, height } = metricsRef.current;
    const rightToLeft = getComputedStyle(nav).direction === "rtl";
    const width = modelRef.current.current.width;
    const { selectedY, selectedHeight, open } = modelRef.current.current;
    const utilityWidth = unit;
    const selectedRadius = Math.min(radius, selectedHeight / 2);
    const glassPath = roundedPillPath(width, height, radius);
    rail.setAttribute("d", glassPath);
    backdrop.style.clipPath = `path('${glassPath}')`;
    selected.setAttribute(
      "d",
      connectedSelectionPath(
        width,
        selectedY,
        selectedHeight,
        height,
        utilityWidth,
        selectedRadius,
      ),
    );
    selected.setAttribute("transform", rightToLeft ? `translate(${width} 0) scale(-1 1)` : "");
    selected.style.opacity = String(Math.max(0, Math.min(1, open)));
    disc.style.opacity = String(Math.max(0, Math.min(1, 1 - open)));
    disc.style.transform = `translate3d(0, ${selectedY + selectedHeight / 2}px, 0)`;
    utility.style.opacity = String(Math.max(0, Math.min(1, open)));
    // The utility strip is physically left-aligned in RTL (the SVG path is
    // mirrored); logical inset would move it twice and obscure content.
    utility.style.transform = `translate3d(${rightToLeft ? 0 : width - utilityWidth}px, 0, 0)`;
    nav.style.setProperty("--morph-width-current", `${width}px`);
    // A paint-only CSS variable; no blur radius or layout animation.
    nav.style.setProperty("--morph-expand-progress", String(open));
  }, []);

  const animate = useCallback(
    (time: number) => {
      const model = modelRef.current;
      const elapsed = model.lastFrame ? Math.min(0.05, (time - model.lastFrame) / 1000) : 0.016;
      model.lastFrame = time;
      const steps = Math.max(1, Math.ceil(elapsed / 0.012));
      const delta = elapsed / steps;
      for (let i = 0; i < steps; i += 1) {
        for (const coordinate of ["width", "selectedY", "selectedHeight", "open"] as const) {
          const acceleration =
            (model.target[coordinate] - model.current[coordinate]) * spring.smooth.stiffness -
            model.velocity[coordinate] * spring.smooth.damping;
          model.velocity[coordinate] += acceleration * delta;
          model.current[coordinate] += model.velocity[coordinate] * delta;
        }
      }
      paint();
      const active = (["width", "selectedY", "selectedHeight", "open"] as const).some(
        (coordinate) =>
          Math.abs(model.target[coordinate] - model.current[coordinate]) > 0.08 ||
          Math.abs(model.velocity[coordinate]) > 0.08,
      );
      if (active) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        model.current = { ...model.target };
        model.velocity = { width: 0, selectedY: 0, selectedHeight: 0, open: 0 };
        animationRef.current = null;
        paint();
      }
    },
    [paint],
  );

  const retarget = useCallback(() => {
    const nav = navRef.current;
    if (!nav) return;
    const navBox = nav.getBoundingClientRect();
    const unit = numberFromToken(nav, "--space-7", 48);
    metricsRef.current = {
      unit,
      radius: numberFromToken(nav, "--radius-card", 24),
      height: navBox.height,
    };
    const spacing = numberFromToken(nav, "--space-5", 24);
    const targetWidth = expanded ? 5 * unit + spacing : unit + spacing;
    const active = Array.from(nav.querySelectorAll<HTMLButtonElement>("[data-rail-item]")).find(
      (button) => button.dataset.railItem === activeId,
    );
    const box = active?.getBoundingClientRect();
    const target = modelRef.current.target;
    target.width = targetWidth;
    target.selectedY = box ? box.top - navBox.top : unit * 3;
    target.selectedHeight = box?.height ?? numberFromToken(nav, "--target-min", 44);
    target.open = expanded ? 1 : 0;
    if (shouldReduceMotion()) {
      if (animationRef.current !== null) cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
      modelRef.current.current = { ...target };
      modelRef.current.velocity = { width: 0, selectedY: 0, selectedHeight: 0, open: 0 };
      modelRef.current.lastFrame = 0;
      paint();
    } else if (animationRef.current === null) {
      modelRef.current.lastFrame = 0;
      animationRef.current = requestAnimationFrame(animate);
    }
  }, [activeId, animate, expanded, paint]);

  useLayoutEffect(() => {
    retarget();
    const nav = navRef.current;
    if (!nav) return;
    const observer = new ResizeObserver(retarget);
    observer.observe(nav);
    return () => observer.disconnect();
  }, [retarget]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const observePreferences = new MutationObserver(retarget);
    observePreferences.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-motion", "data-text-scale", "style", "dir"],
    });
    media.addEventListener("change", retarget);
    return () => {
      observePreferences.disconnect();
      media.removeEventListener("change", retarget);
      if (animationRef.current !== null) cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    };
  }, [retarget]);

  return (
    <nav
      className={["morphing-rail", expanded ? "morphing-rail--open" : "", className]
        .filter(Boolean)
        .join(" ")}
      ref={navRef}
      aria-label={ariaLabel}
      data-expanded={expanded ? "true" : "false"}
      data-active={activeId}
    >
      <div className="morphing-rail__backdrop" ref={backdropRef} aria-hidden="true" />
      <svg
        className="morphing-rail__surface"
        width="100%"
        height="100%"
        aria-hidden="true"
        focusable="false"
      >
        <path ref={railPathRef} className="morphing-rail__glass" />
        <path ref={selectedPathRef} className="morphing-rail__connected" />
      </svg>
      <span ref={collapsedDiscRef} className="morphing-rail__disc" aria-hidden="true" />
      <div className="morphing-rail__contents">
        <div className="morphing-rail__header">
          <button
            type="button"
            className="morphing-rail__toggle"
            aria-label={expanded ? "Collapse navigation" : "Expand navigation"}
            aria-expanded={expanded}
            aria-controls={listId}
            onClick={() => onExpandedChange(!expanded)}
          >
            <span className="morphing-rail__mark" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" focusable="false">
                <title>Navigation panel</title>
                <rect x="3.5" y="4.5" width="17" height="15" rx="3" />
                <path d="M9.5 5v14" />
              </svg>
            </span>
          </button>
          <span className="morphing-rail__label morphing-rail__identity" aria-hidden={!expanded}>
            <strong>Lyceum</strong>
            <small>Private workspace</small>
          </span>
        </div>
        <div className="morphing-rail__links" id={listId}>
          {items.map((item) => (
            <button
              type="button"
              className="morphing-rail__link"
              key={item.id}
              data-rail-item={item.id}
              data-active={item.id === activeId ? "true" : "false"}
              onClick={() => onActivate(item.id)}
              aria-current={item.id === activeId ? "page" : undefined}
              aria-label={expanded ? undefined : item.label}
            >
              <span className="morphing-rail__icon" aria-hidden="true">
                {item.icon}
              </span>
              <span className="morphing-rail__label" aria-hidden={!expanded}>
                {item.label}
              </span>
            </button>
          ))}
        </div>
        <div className="morphing-rail__footer">
          <span className="morphing-rail__footer-dot" aria-hidden="true" />
          <span className="morphing-rail__label" aria-hidden={!expanded}>
            On this device
          </span>
        </div>
      </div>
      <div className="morphing-rail__utilities" ref={utilityRef} aria-hidden={!expanded}>
        {(utilities ?? []).map((item) => (
          <button
            type="button"
            className="morphing-rail__utility"
            key={item.id}
            aria-label={item.label}
            tabIndex={expanded ? 0 : -1}
            onClick={() => onUtilityActivate?.(item.id)}
            disabled={!onUtilityActivate}
          >
            {item.icon}
          </button>
        ))}
      </div>
    </nav>
  );
}
