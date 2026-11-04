import type { AnchorHTMLAttributes, Ref } from "react";
import { cx, focusRing } from "./utils";

export type TextLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  ref?: Ref<HTMLAnchorElement>;
  /** `brand` en color primario; `legal` solo para textos legales. */
  tone?: "ink" | "brand" | "muted" | "legal";
};

const toneClass = {
  ink: "text-ink",
  brand: "text-primary",
  muted: "text-muted",
  legal: "text-legal-link",
};

/**
 * Enlace de texto. Para navegar con TanStack Router, envuélvelo una vez en la app:
 * `const Link = createLink(TextLink)`.
 */
export function TextLink({ tone = "ink", className, ref, ...props }: TextLinkProps) {
  return (
    <a
      ref={ref}
      className={cx(
        "rounded-sm text-link underline underline-offset-2 hover:decoration-2",
        toneClass[tone],
        focusRing,
        className,
      )}
      {...props}
    />
  );
}
