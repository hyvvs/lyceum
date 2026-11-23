import * as VisuallyHiddenPrimitive from "@radix-ui/react-visually-hidden";
import { forwardRef } from "react";

/** Noninteractive screen-reader-only text. Semantic elements (for example headings) are not supported. */
export interface VisuallyHiddenProps {
  /** A nonblank accessible label or meaningful finite number, including zero. */
  children: string | number;
  id?: string;
  lang?: string;
  dir?: "ltr" | "rtl" | "auto";
}

/** Visually clipped native span: text stays in the accessibility tree, with no keyboard focus stop. */
export const VisuallyHidden = forwardRef<HTMLSpanElement, VisuallyHiddenProps>(
  function VisuallyHidden({ children, id, lang, dir, ...unapproved }, ref) {
    if (Object.keys(unapproved).length > 0) {
      throw new Error("VisuallyHidden supports only children, id, lang and dir.");
    }
    // Unicode zero-width/default-ignorable code points are not spoken labels by themselves.
    // Preserve the exact original text for localization; strip only while validating.
    const hasText =
      typeof children === "string" &&
      children.replace(/[\p{White_Space}\p{Default_Ignorable_Code_Point}]/gu, "").length > 0;
    if (!hasText && !(typeof children === "number" && Number.isFinite(children))) {
      throw new Error("VisuallyHidden requires nonblank text or a finite number.");
    }
    if (id !== undefined && (typeof id !== "string" || !id.trim())) {
      throw new Error("VisuallyHidden id must be a nonblank string.");
    }
    if (lang !== undefined && (typeof lang !== "string" || !lang.trim())) {
      throw new Error("VisuallyHidden lang must be a nonblank string.");
    }
    if (dir !== undefined && dir !== "ltr" && dir !== "rtl" && dir !== "auto") {
      throw new Error("VisuallyHidden dir must be ltr, rtl or auto.");
    }

    return (
      <VisuallyHiddenPrimitive.Root ref={ref} id={id} lang={lang} dir={dir}>
        {children}
      </VisuallyHiddenPrimitive.Root>
    );
  },
);
