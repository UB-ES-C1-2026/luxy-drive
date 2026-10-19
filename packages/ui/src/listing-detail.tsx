import { type FormEvent, type ReactNode, useId, useLayoutEffect, useRef, useState } from "react";
import { Button } from "./button";
import { BadgeCheck } from "./icons";
import { cx, formatPrice } from "./utils";

export type AvatarProps = {
  name: string;
  src?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const avatarSize = {
  sm: "size-8 text-micro-label",
  md: "size-12 text-title-md",
  lg: "size-16 text-display-sm",
};

/** Foto circular o iniciales sobre `surface-strong`. */
export function Avatar({ name, src, size = "md", className }: AvatarProps) {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("");
  return (
    <span
      className={cx(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-strong text-ink",
        avatarSize[size],
        className,
      )}
    >
      {src ? (
        <img src={src} alt={name} className="size-full object-cover" />
      ) : (
        <span aria-hidden>{initials}</span>
      )}
      {!src && <span className="sr-only">{name}</span>}
    </span>
  );
}

export type Stat = { label: string; value: string };

export type RatingDisplayProps = {
  value: number;
  reviewCount: number;
  /** Columnas de datos bajo la nota ("Puntualidad 4,9"). */
  stats?: Stat[];
  className?: string;
};

/** El momento tipográfico más fuerte del sistema: nota de 64px en el detalle del anuncio. */
export function RatingDisplay({ value, reviewCount, stats = [], className }: RatingDisplayProps) {
  return (
    <div className={cx("flex flex-col items-center gap-6 text-center", className)}>
      <div>
        <p className="text-rating-display text-ink">
          {value.toLocaleString("es-ES", { minimumFractionDigits: 1, maximumFractionDigits: 2 })}
        </p>
        <p className="mt-2 text-title-md text-ink">Valoración de los clientes</p>
        <p className="text-body-sm text-muted">{reviewCount} reseñas</p>
      </div>
      {stats.length > 0 && (
        <dl className="flex w-full flex-wrap justify-center divide-x divide-hairline">
          {stats.map((stat) => (
            <div key={stat.label} className="flex flex-col-reverse gap-1 px-6 py-2">
              <dt className="text-body-sm text-muted">{stat.label}</dt>
              <dd className="text-title-md text-ink">{stat.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

export type Amenity = { icon: ReactNode; label: string };

/** Lista de servicios: icono + etiqueta, sin bordes entre filas y hairlines arriba y abajo. */
export function AmenityList({ items, className }: { items: Amenity[]; className?: string }) {
  return (
    <ul
      className={cx(
        "grid grid-cols-1 border-y border-hairline py-3 md:grid-cols-2 md:gap-x-8",
        className,
      )}
    >
      {items.map((item) => (
        <li
          key={item.label}
          className="flex items-center gap-4 py-3 text-body-md text-ink [&_svg]:size-6 [&_svg]:stroke-[1.5]"
        >
          {item.icon}
          {item.label}
        </li>
      ))}
    </ul>
  );
}

export type ReviewCardProps = {
  author: string;
  avatarSrc?: string;
  date: string;
  children: string;
  className?: string;
};

/** Reseña: autor y fecha sobre un extracto de 3 líneas con "Mostrar más". */
export function ReviewCard({ author, avatarSrc, date, children, className }: ReviewCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [overflowing, setOverflowing] = useState(false);
  const bodyRef = useRef<HTMLParagraphElement>(null);
  const bodyId = useId();

  // "Mostrar más" solo aparece si el texto no cabe en 3 líneas.
  useLayoutEffect(() => {
    const body = bodyRef.current;
    if (!body || expanded) return;
    const measure = () => setOverflowing(body.scrollHeight > body.clientHeight + 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(body);
    return () => observer.disconnect();
  }, [expanded]);
  return (
    <article className={cx("flex flex-col gap-3", className)}>
      <div className="flex items-center gap-3">
        <Avatar name={author} src={avatarSrc} />
        <div>
          <p className="text-title-md text-ink">{author}</p>
          <p className="text-body-sm text-muted">{date}</p>
        </div>
      </div>
      <p
        ref={bodyRef}
        id={bodyId}
        className={cx("text-body-md text-body", !expanded && "line-clamp-3")}
      >
        {children}
      </p>
      {(overflowing || expanded) && (
        <div>
          <Button
            variant="tertiary"
            size="sm"
            aria-expanded={expanded}
            aria-controls={bodyId}
            onClick={() => setExpanded((value) => !value)}
            className="h-auto font-semibold underline"
          >
            {expanded ? "Mostrar menos" : "Mostrar más"}
          </Button>
        </div>
      )}
    </article>
  );
}

export type ProviderCardProps = {
  name: string;
  avatarSrc?: string;
  verified?: boolean;
  description?: string;
  stats?: Stat[];
  onContact?: () => void;
  className?: string;
};

/** Tarjeta del proveedor: avatar, nombre, verificado, datos y "Contactar". */
export function ProviderCard({
  name,
  avatarSrc,
  verified = false,
  description,
  stats = [],
  onContact,
  className,
}: ProviderCardProps) {
  return (
    <section
      aria-label={`Proveedor: ${name}`}
      className={cx(
        "flex flex-col gap-6 rounded-md border border-hairline bg-canvas p-6",
        className,
      )}
    >
      <div className="flex items-center gap-4">
        <Avatar name={name} src={avatarSrc} size="lg" />
        <div>
          <p className="text-display-sm text-ink">{name}</p>
          {verified && (
            <p className="mt-1 inline-flex items-center gap-1 text-body-sm text-ink">
              <BadgeCheck aria-hidden className="size-4" />
              Proveedor verificado
            </p>
          )}
        </div>
      </div>
      {stats.length > 0 && (
        <dl className="flex gap-8">
          {stats.map((stat) => (
            <div key={stat.label} className="flex flex-col-reverse">
              <dt className="text-body-sm text-muted">{stat.label}</dt>
              <dd className="text-title-md text-ink">{stat.value}</dd>
            </div>
          ))}
        </dl>
      )}
      {description && <p className="text-body-md text-body">{description}</p>}
      <div>
        <Button variant="secondary" onClick={onContact}>
          Contactar
        </Button>
      </div>
    </section>
  );
}

export type PriceLine = { label: string; amount: number };

export type BookingCardProps = {
  price: number;
  /** "experiencia completa", "/ persona". */
  priceUnit: string;
  originalPrice?: number;
  /** Selectores de fecha, ruta y pasajeros. */
  children?: ReactNode;
  /** Desglose de precio; si hay líneas, se muestra el total. */
  breakdown?: PriceLine[];
  /** Texto del botón ("Solicitar reserva"). Sin él, la tarjeta solo muestra el precio. */
  ctaLabel?: string;
  /** Nota bajo el CTA ("Todavía no se te cobrará nada"). */
  note?: string;
  disabled?: boolean;
  onSubmit?: () => void;
  className?: string;
};

/** Tarjeta de reserva del lateral del detalle: precio, campos, CTA a todo el ancho y desglose. */
export function BookingCard({
  price,
  priceUnit,
  originalPrice,
  children,
  breakdown = [],
  ctaLabel,
  note,
  disabled = false,
  onSubmit,
  className,
}: BookingCardProps) {
  function submit(event: FormEvent) {
    event.preventDefault();
    onSubmit?.();
  }
  const total = breakdown.reduce((sum, line) => sum + line.amount, 0);
  const cardClass = cx(
    "flex flex-col gap-6 rounded-md border border-hairline bg-canvas p-6 shadow-float",
    className,
  );
  const priceLine = (
    <p className="text-ink">
      {originalPrice !== undefined && (
        <span className="mr-2 text-body-md text-muted line-through">
          <span className="sr-only">Antes </span>
          {formatPrice(originalPrice)}
        </span>
      )}
      <span className="text-display-md">{formatPrice(price)}</span>{" "}
      <span className="text-body-md">{priceUnit}</span>
    </p>
  );

  // Sin botón no hay nada que enviar: es una tarjeta de precio, no un formulario.
  if (!ctaLabel) {
    return (
      <section aria-label="Precio" className={cardClass}>
        {priceLine}
      </section>
    );
  }

  return (
    <form onSubmit={submit} aria-label="Reserva" className={cardClass}>
      {priceLine}
      {children && <div className="flex flex-col gap-4">{children}</div>}
      <div className="flex flex-col gap-3">
        <Button type="submit" fullWidth disabled={disabled}>
          {ctaLabel}
        </Button>
        {note && <p className="text-center text-body-sm text-muted">{note}</p>}
      </div>
      {breakdown.length > 0 && (
        <dl className="flex flex-col gap-3 text-body-sm">
          {breakdown.map((line) => (
            <div key={line.label} className="flex justify-between text-body">
              <dt className="underline underline-offset-2">{line.label}</dt>
              <dd>{formatPrice(line.amount)}</dd>
            </div>
          ))}
          <div className="flex justify-between border-t border-hairline pt-4 text-title-md text-ink">
            <dt>Total</dt>
            <dd>{formatPrice(total)}</dd>
          </div>
        </dl>
      )}
    </form>
  );
}

export type BookingBarProps = {
  price: number;
  priceUnit: string;
  /** Línea secundaria: fechas o ruta. */
  detail?: string;
  ctaLabel?: string;
  onReserve?: () => void;
  className?: string;
};

/** Versión móvil de la reserva: barra inferior con precio y CTA. La app la fija con `fixed bottom-0` en móvil. */
export function BookingBar({
  price,
  priceUnit,
  detail,
  ctaLabel = "Solicitar reserva",
  onReserve,
  className,
}: BookingBarProps) {
  return (
    <div
      className={cx(
        "flex items-center justify-between gap-4 border-t border-hairline bg-canvas px-6 py-4",
        className,
      )}
    >
      <div>
        <p className="text-body-md text-ink">
          <span className="font-semibold">{formatPrice(price)}</span> {priceUnit}
        </p>
        {detail && <p className="text-body-sm text-muted underline">{detail}</p>}
      </div>
      <Button onClick={onReserve}>{ctaLabel}</Button>
    </div>
  );
}
