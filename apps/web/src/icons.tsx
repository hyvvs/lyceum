import type { SVGProps } from "react";

export function Icon({
  name,
  ...props
}: SVGProps<SVGSVGElement> & {
  name:
    | "home"
    | "settings"
    | "arrow"
    | "spark"
    | "book"
    | "clock"
    | "shield"
    | "check"
    | "link"
    | "chevron";
}) {
  const paths = {
    home: (
      <>
        <path d="m3 11 9-7 9 7v9H4v-9" />
        <path d="M9 20v-6h6v6" />
      </>
    ),
    settings: (
      <>
        <path d="M4 8h16M4 16h16" />
        <circle cx="9" cy="8" r="2" />
        <circle cx="16" cy="16" r="2" />
      </>
    ),
    arrow: (
      <>
        <path d="M5 12h14m-6-6 6 6-6 6" />
      </>
    ),
    spark: (
      <>
        <path d="m12 2 2.7 7.3L22 12l-7.3 2.7L12 22l-2.7-7.3L2 12l7.3-2.7L12 2Z" />
      </>
    ),
    book: (
      <>
        <path d="M12 6c-3-2-6-2-9-1v14c3-1 6-1 9 1 3-2 6-2 9-1V5c-3-1-6-1-9 1Z" />
        <path d="M12 6v14" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l4 2" />
      </>
    ),
    shield: (
      <>
        <path d="M12 2 4 5v6c0 5 3 8 8 11 5-3 8-6 8-11V5l-8-3Z" />
        <path d="m8 12 3 3 5-6" />
      </>
    ),
    check: (
      <>
        <path d="m5 12 4 4L19 6" />
      </>
    ),
    link: (
      <>
        <path d="M10 13a5 5 0 0 0 7.5 0l2-2a5 5 0 0 0-7.5-6l-1 1" />
        <path d="M14 11a5 5 0 0 0-7.5 0l-2 2a5 5 0 0 0 7.5 6l1-1" />
      </>
    ),
    chevron: (
      <>
        <path d="m9 6 6 6-6 6" />
      </>
    ),
  };
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {paths[name]}
    </svg>
  );
}
