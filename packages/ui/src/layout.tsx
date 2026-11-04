import type { HTMLAttributes } from "react";
import { cx } from "./utils";

const containerWidth = {
  /** 1280px: home y páginas editoriales. */
  default: "max-w-[1280px]",
  /** 1080px: detalle de anuncio. */
  narrow: "max-w-[1080px]",
  /** 1440px: listados y búsqueda. */
  wide: "max-w-[1440px]",
};

export type ContainerProps = HTMLAttributes<HTMLDivElement> & {
  size?: keyof typeof containerWidth;
};

/** Centra el contenido con el ancho máximo de DESIGN.md y gutters laterales. */
export function Container({ size = "default", className, ...props }: ContainerProps) {
  return (
    <div
      className={cx("mx-auto w-full px-4 md:px-6 lg:px-10", containerWidth[size], className)}
      {...props}
    />
  );
}

export type SectionProps = HTMLAttributes<HTMLElement>;

/** Banda de página con el padding vertical `spacing.section` (64px). */
export function Section({ className, ...props }: SectionProps) {
  return <section className={cx("py-section", className)} {...props} />;
}

export type DividerProps = HTMLAttributes<HTMLHRElement> & {
  tone?: "hairline" | "soft";
};

export function Divider({ tone = "hairline", className, ...props }: DividerProps) {
  return (
    <hr
      className={cx(
        "border-0 border-t",
        tone === "hairline" ? "border-hairline" : "border-hairline-soft",
        className,
      )}
      {...props}
    />
  );
}
