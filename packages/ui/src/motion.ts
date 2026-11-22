/**
 * Motion presets for Lyceum (Framer Motion / `motion/react`).
 * Dependency-free on purpose: plain data that components pass to motion props.
 * Components must use these presets and never hard-code springs or durations.
 * See docs/18-design-language-glass.md section 6.
 */

export const spring = {
  snappy: { type: "spring", stiffness: 420, damping: 34, mass: 0.9 },
  smooth: { type: "spring", stiffness: 260, damping: 30 },
  gentle: { type: "spring", stiffness: 140, damping: 24 },
} as const;

export const ease = {
  out: [0.16, 1, 0.3, 1],
  inOut: [0.65, 0, 0.35, 1],
} as const;

export const duration = { fast: 0.15, base: 0.25, slow: 0.45 } as const;

/** Delay for the i-th child of a staggered group, capped so long lists never feel slow. */
export function staggerDelay(index: number, step = 0.05, max = 0.4): number {
  return Math.min(Math.max(index, 0) * step, max);
}

/** Page transition: fade, rise, and un-blur on enter; quick fade and blur on exit. */
export const pageVariants = {
  initial: { opacity: 0, y: 12, filter: "blur(8px)" },
  animate: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: duration.slow, ease: ease.out },
  },
  exit: {
    opacity: 0,
    y: -8,
    filter: "blur(6px)",
    transition: { duration: 0.2, ease: ease.inOut },
  },
} as const;

/** Card entrance; pass the child's index as `custom` to stagger. */
export const cardVariants = {
  initial: { opacity: 0, y: 16, scale: 0.98 },
  animate: (index: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { ...spring.smooth, delay: staggerDelay(index) },
  }),
} as const;

export const hoverLift = { y: -4, transition: spring.snappy } as const;
export const tapPress = { scale: 0.98, transition: spring.snappy } as const;

/** Reduced-motion equivalents: opacity only, short, no movement or blur. */
export const reducedPageVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: duration.fast } },
  exit: { opacity: 0, transition: { duration: duration.fast } },
} as const;

export function pickPageVariants(reducedMotion: boolean) {
  return reducedMotion ? reducedPageVariants : pageVariants;
}
