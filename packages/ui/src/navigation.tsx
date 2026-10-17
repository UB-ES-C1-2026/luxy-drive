import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import { NewTag } from "./badges";
import { Menu, User } from "./icons";
import { cx, focusRing } from "./utils";

/** Wordmark de LuxyDrive en color primario. */
export function Logo({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cx("text-display-lg font-bold tracking-tight text-primary", className)}
      {...props}
    >
      LuxyDrive
    </span>
  );
}

export type TopNavProps = {
  /** Normalmente el Logo dentro de un enlace a "/". */
  brand: ReactNode;
  /** Centro: pestañas de categoría. En móvil pasa a una segunda fila con scroll. */
  center?: ReactNode;
  /** Derecha: enlace de proveedores, idioma, menú de cuenta. */
  actions?: ReactNode;
  className?: string;
};

/** Barra superior blanca de 80px con hairline inferior. */
export function TopNav({ brand, center, actions, className }: TopNavProps) {
  return (
    <header className={cx("border-b border-hairline bg-canvas", className)}>
      <div className="mx-auto grid max-w-[1440px] grid-cols-[1fr_auto] items-center gap-x-4 px-4 pt-3 md:min-h-20 md:grid-cols-[1fr_auto_1fr] md:px-6 md:pt-0 lg:px-10">
        <div className="flex items-center">{brand}</div>
        {center && (
          <div className="order-last col-span-2 -mx-4 overflow-x-auto px-4 md:order-none md:col-span-1 md:mx-0 md:px-0">
            {center}
          </div>
        )}
        <div className="flex items-center justify-end gap-2">{actions}</div>
      </div>
    </header>
  );
}

export type AccountButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

/** Pastilla de cuenta (menú + avatar) del extremo derecho de la barra superior. */
export function AccountButton({ className, ...props }: AccountButtonProps) {
  return (
    <button
      type="button"
      aria-label="Menú de cuenta"
      className={cx(
        "inline-flex h-11 items-center gap-3 rounded-full border border-hairline bg-canvas pr-1.5 pl-3.5 text-ink transition-shadow hover:shadow-float",
        focusRing,
        className,
      )}
      {...props}
    >
      <Menu aria-hidden className="size-4" />
      <span className="inline-flex size-8 items-center justify-center rounded-full bg-muted text-on-primary">
        <User aria-hidden className="size-4" />
      </span>
    </button>
  );
}

export type CategoryTab = {
  id: string;
  label: string;
  /** Icono de 32px. */
  icon: ReactNode;
  isNew?: boolean;
};

export type CategoryTabsProps = {
  items: CategoryTab[];
  value: string;
  onChange: (id: string) => void;
  className?: string;
  "aria-label"?: string;
};

/** Pestañas de categoría: icono de 32px + etiqueta; la activa lleva subrayado de 2px en ink. */
export function CategoryTabs({
  items,
  value,
  onChange,
  className,
  "aria-label": ariaLabel = "Categorías",
}: CategoryTabsProps) {
  return (
    <nav aria-label={ariaLabel} className={className}>
      <ul className="flex gap-6 md:gap-8">
        {items.map((item) => {
          const active = item.id === value;
          return (
            <li key={item.id}>
              <button
                type="button"
                aria-pressed={active}
                onClick={() => onChange(item.id)}
                className={cx(
                  "flex flex-col items-center gap-1 border-b-2 pt-2 pb-3 text-nav-link whitespace-nowrap transition-colors",
                  focusRing,
                  active
                    ? "border-ink text-ink"
                    : "border-transparent text-muted hover:border-hairline hover:text-ink",
                )}
              >
                <span className="relative [&_svg]:size-8 [&_svg]:stroke-[1.5]">
                  {item.icon}
                  {item.isNew && <NewTag className="absolute -top-2 left-6" />}
                </span>
                {item.label}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
