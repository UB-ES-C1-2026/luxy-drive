import type { HTMLAttributes } from "react";
import { cx } from "./utils";

type HeadingVariant =
  | "rating-display"
  | "display-xl"
  | "display-lg"
  | "display-md"
  | "display-sm"
  | "title-md"
  | "title-sm";

const headingClass: Record<HeadingVariant, string> = {
  "rating-display": "text-rating-display",
  "display-xl": "text-display-xl",
  "display-lg": "text-display-lg",
  "display-md": "text-display-md",
  "display-sm": "text-display-sm",
  "title-md": "text-title-md",
  "title-sm": "text-title-sm",
};

export type HeadingProps = HTMLAttributes<HTMLHeadingElement> & {
  /** Nivel semántico (h1–h6). */
  as?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
  /** Estilo visual según DESIGN.md. */
  variant?: HeadingVariant;
};

export function Heading({
  as: Tag = "h2",
  variant = "display-md",
  className,
  ...props
}: HeadingProps) {
  return <Tag className={cx("text-ink", headingClass[variant], className)} {...props} />;
}

type TextVariant = "body-md" | "body-sm" | "caption" | "caption-sm" | "micro-label";
type TextTone = "ink" | "body" | "muted" | "muted-soft" | "error";

// Clases literales: Tailwind no detecta clases construidas con plantillas.
const textClass: Record<TextVariant, string> = {
  "body-md": "text-body-md",
  "body-sm": "text-body-sm",
  caption: "text-caption",
  "caption-sm": "text-caption-sm",
  "micro-label": "text-micro-label",
};

const toneClass: Record<TextTone, string> = {
  ink: "text-ink",
  body: "text-body",
  muted: "text-muted",
  "muted-soft": "text-muted-soft",
  error: "text-error",
};

export type TextProps = HTMLAttributes<HTMLElement> & {
  as?: "p" | "span" | "div" | "strong";
  variant?: TextVariant;
  tone?: TextTone;
};

export function Text({
  as: Tag = "p",
  variant = "body-md",
  tone = "ink",
  className,
  ...props
}: TextProps) {
  return <Tag className={cx(textClass[variant], toneClass[tone], className)} {...props} />;
}
