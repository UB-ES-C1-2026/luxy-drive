import type { HTMLAttributes, ReactNode } from "react";
import { CircleAlert } from "./icons";
import { cx } from "./utils";

export type EmptyStateProps = {
  icon?: ReactNode;
  title: string;
  description?: string;
  /** Normalmente un <Button>. */
  action?: ReactNode;
  className?: string;
};

/** Estado vacío: sin resultados, sin favoritos, sin reservas. */
export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cx(
        "flex flex-col items-center gap-3 px-6 py-12 text-center [&>svg]:size-10 [&>svg]:stroke-[1.5] [&>svg]:text-muted",
        className,
      )}
    >
      {icon}
      <p className="text-display-sm text-ink">{title}</p>
      {description && <p className="max-w-md text-body-md text-muted">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

export type NoticeProps = {
  tone?: "error" | "info";
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  /** Sustituye al icono de alerta, p. ej. una marca de "guardado". */
  icon?: ReactNode;
  className?: string;
};

/** Aviso en línea (error al cargar, información). */
export function Notice({ tone = "info", title, children, action, icon, className }: NoticeProps) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cx(
        "flex items-start gap-3 rounded-md border bg-canvas p-4",
        tone === "error" ? "border-error" : "border-hairline",
        className,
      )}
    >
      <span
        aria-hidden
        className={cx(
          "mt-0.5 flex shrink-0 [&>svg]:size-5",
          tone === "error" ? "text-error" : "text-ink",
        )}
      >
        {icon ?? <CircleAlert />}
      </span>
      <div className="flex flex-1 flex-col gap-1">
        <p className={cx("text-title-md", tone === "error" ? "text-error" : "text-ink")}>{title}</p>
        {children && <div className="text-body-sm text-body">{children}</div>}
      </div>
      {action}
    </div>
  );
}

export type SkeletonProps = HTMLAttributes<HTMLDivElement>;

/** Bloque de carga. Dale forma con clases de tamaño: `<Skeleton className="aspect-square" />`. */
export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      aria-hidden
      className={cx("animate-pulse rounded-md bg-surface-strong", className)}
      {...props}
    />
  );
}

/** Esqueleto de una ListingCard mientras carga. */
export function ListingCardSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <Skeleton className="aspect-square" />
      <Skeleton className="h-4 w-3/4 rounded-sm" />
      <Skeleton className="h-4 w-1/2 rounded-sm" />
      <Skeleton className="h-4 w-1/3 rounded-sm" />
    </div>
  );
}
