import type { HTMLAttributes, ReactNode } from "react";
import { Rating } from "./badges";
import { HeartButton } from "./button";
import { Caravan, Plane, Sailboat } from "./icons";
import { cx, focusRing, formatPrice } from "./utils";

export type ListingCategory = "jet" | "yacht" | "camper";

const placeholderIcon: Record<ListingCategory, ReactNode> = {
  jet: <Plane aria-hidden />,
  yacht: <Sailboat aria-hidden />,
  camper: <Caravan aria-hidden />,
};

export type ListingPhotoProps = {
  category: ListingCategory;
  image?: { src: string; alt: string };
  /** Relación de aspecto: 1:1 (tarjeta) o 4:3 (banner de detalle). */
  aspect?: "square" | "landscape";
  className?: string;
  children?: ReactNode;
};

/** Foto del anuncio con esquinas `rounded.md`. Sin imagen, muestra un placeholder neutro con el icono de la categoría. */
export function ListingPhoto({
  category,
  image,
  aspect = "square",
  className,
  children,
}: ListingPhotoProps) {
  return (
    <div
      className={cx(
        "relative overflow-hidden rounded-md bg-surface-strong",
        aspect === "square" ? "aspect-square" : "aspect-[4/3]",
        className,
      )}
    >
      {image ? (
        <img src={image.src} alt={image.alt} className="size-full object-cover" loading="lazy" />
      ) : (
        <div className="flex size-full items-center justify-center text-muted-soft [&_svg]:size-14 [&_svg]:stroke-1">
          {placeholderIcon[category]}
        </div>
      )}
      {children}
    </div>
  );
}

export type ListingCardProps = {
  title: string;
  /** Ciudad o ruta ("Marbella → Madrid"). */
  location: string;
  /** Fecha o ventana de servicio ("24 oct · 18:00"). */
  dates?: string;
  category: ListingCategory;
  image?: { src: string; alt: string };
  price: number;
  /** Unidad explícita del precio: "experiencia completa", "/ persona", "/ noche". */
  priceUnit: string;
  /** Precio de referencia tachado (descuentos, empty legs). */
  originalPrice?: number;
  rating?: number;
  reviewCount?: number;
  /** Badge sobre la foto (<OfferBadge>). */
  badge?: ReactNode;
  href?: string;
  saved?: boolean;
  onSavedChange?: (saved: boolean) => void;
  className?: string;
} & Omit<HTMLAttributes<HTMLElement>, "title">;

/** Tarjeta de anuncio: foto primero, badge arriba a la izquierda, corazón arriba a la derecha y 4–5 líneas de datos. */
export function ListingCard({
  title,
  location,
  dates,
  category,
  image,
  price,
  priceUnit,
  originalPrice,
  rating,
  reviewCount,
  badge,
  href,
  saved,
  onSavedChange,
  className,
  ...props
}: ListingCardProps) {
  return (
    <article className={cx("group relative flex flex-col gap-3", className)} {...props}>
      <ListingPhoto
        category={category}
        image={image}
        className="transition-shadow group-hover:shadow-float"
      >
        {badge && <div className="absolute top-3 left-3">{badge}</div>}
        {saved !== undefined && (
          <HeartButton
            saved={saved}
            onSavedChange={onSavedChange}
            className="absolute top-3 right-3 z-10"
          />
        )}
      </ListingPhoto>

      <div className="flex flex-col gap-0.5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-title-md text-ink">
            {href ? (
              // El enlace cubre toda la tarjeta; el corazón queda por encima (z-10).
              <a href={href} className={cx("rounded-sm after:absolute after:inset-0", focusRing)}>
                {title}
              </a>
            ) : (
              title
            )}
          </h3>
          {rating !== undefined && <Rating value={rating} reviewCount={reviewCount} />}
        </div>
        <p className="text-body-sm text-muted">{location}</p>
        {dates && <p className="text-body-sm text-muted">{dates}</p>}
        <p className="mt-1 text-body-sm text-ink">
          {originalPrice !== undefined && (
            <span className="mr-1 text-muted line-through">
              <span className="sr-only">Antes </span>
              {formatPrice(originalPrice)}
            </span>
          )}
          <span className="font-semibold">{formatPrice(price)}</span> {priceUnit}
        </p>
      </div>
    </article>
  );
}

export type ListingGridProps = HTMLAttributes<HTMLUListElement>;

/** Rejilla de tarjetas: 1 columna en móvil, 2 en tablet, 4 en escritorio; gaps de 16px. */
export function ListingGrid({ className, ...props }: ListingGridProps) {
  return (
    <ul
      className={cx("grid grid-cols-1 gap-x-4 gap-y-8 md:grid-cols-2 lg:grid-cols-4", className)}
      {...props}
    />
  );
}
