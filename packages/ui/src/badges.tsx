import type { HTMLAttributes, ReactNode } from "react";
import { Star } from "./icons";
import { cx } from "./utils";

export type OfferBadgeProps = HTMLAttributes<HTMLSpanElement> & {
  icon?: ReactNode;
};

/** Pastilla blanca sobre la foto: "Empty leg", "Última hora", "Oferta flash". */
export function OfferBadge({ icon, className, children, ...props }: OfferBadgeProps) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 rounded-full bg-canvas px-2.5 py-1 text-badge text-ink shadow-float [&_svg]:size-3",
        className,
      )}
      {...props}
    >
      {icon}
      {children}
    </span>
  );
}

/** Etiqueta "NUEVO" para pestañas de categoría. */
export function NewTag({
  className,
  children = "Nuevo",
  ...props
}: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full bg-ink px-1.5 py-0.5 text-uppercase-tag text-on-primary uppercase",
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}

export type RatingProps = HTMLAttributes<HTMLSpanElement> & {
  value: number;
  reviewCount?: number;
};

/** Valoración compacta: estrella en ink (nunca amarilla) + número. */
export function Rating({ value, reviewCount, className, ...props }: RatingProps) {
  return (
    <span
      className={cx("inline-flex items-center gap-1 text-body-sm text-star-rating", className)}
      {...props}
    >
      <Star aria-hidden className="size-3.5 fill-star-rating" />
      <span>
        <span className="sr-only">Valoración: </span>
        {value.toLocaleString("es-ES", { minimumFractionDigits: 1, maximumFractionDigits: 2 })}
      </span>
      {reviewCount !== undefined && <span className="text-muted">({reviewCount})</span>}
    </span>
  );
}
