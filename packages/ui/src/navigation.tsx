import {
  type AnchorHTMLAttributes,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type ReactNode,
  type Ref,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
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
        {/* Columna 3 aunque no haya centro: si no, las acciones quedarían centradas. */}
        <div className="flex items-center justify-end gap-2 md:col-start-3">{actions}</div>
      </div>
    </header>
  );
}

export type AccountButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  /** Nombre del usuario con sesión; en móvil solo se ve el avatar. */
  name?: string;
  /** Avatar del usuario; sin él, el icono genérico de persona. */
  avatar?: ReactNode;
};

/** Pastilla de cuenta (menú + nombre + avatar) del extremo derecho de la barra superior. */
export function AccountButton({ name, avatar, className, ...props }: AccountButtonProps) {
  return (
    <button
      type="button"
      aria-label={name ? `Menú de cuenta: ${name}` : "Menú de cuenta"}
      className={cx(
        "inline-flex h-11 items-center gap-3 rounded-full border border-hairline bg-canvas pr-1.5 pl-3.5 text-ink transition-shadow hover:shadow-float",
        focusRing,
        className,
      )}
      {...props}
    >
      <Menu aria-hidden className="size-4" />
      {name && (
        <span className="hidden max-w-40 truncate text-body-sm font-medium md:inline">{name}</span>
      )}
      {avatar ?? (
        <span className="inline-flex size-8 items-center justify-center rounded-full bg-muted text-on-primary">
          <User aria-hidden className="size-4" />
        </span>
      )}
    </button>
  );
}

export type AccountMenuProps = Pick<AccountButtonProps, "name" | "avatar"> & {
  /** AccountMenuLink, AccountMenuButton y AccountMenuDivider. */
  children: ReactNode;
  className?: string;
};

/** Pastilla de cuenta que despliega un panel con las opciones de la cuenta. */
export function AccountMenu({ name, avatar, children, className }: AccountMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    // Elegir una opción (enlace o botón) cierra el panel.
    const chosen = (event: MouseEvent) => {
      const target = event.target as Element;
      if (panelRef.current?.contains(target) && target.closest("a, button")) setOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", onKey);
    document.addEventListener("click", chosen);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("click", chosen);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={cx("relative", className)}>
      <AccountButton
        name={name}
        avatar={avatar}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
      />
      {open && (
        <div
          ref={panelRef}
          id={panelId}
          className="absolute top-full right-0 z-20 mt-2 flex w-60 flex-col rounded-md border border-hairline bg-canvas py-2 shadow-float"
        >
          {children}
        </div>
      )}
    </div>
  );
}

const menuItemClass = (strong: boolean) =>
  cx(
    "flex w-full items-center px-4 py-3 text-left text-body-md text-ink hover:bg-surface-soft",
    strong && "font-semibold",
    focusRing,
  );

export type AccountMenuLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  ref?: Ref<HTMLAnchorElement>;
  /** Opción principal, en negrita ("Iniciar sesión"). */
  strong?: boolean;
};

/** Opción del menú de cuenta que lleva a otra página. Con TanStack Router: `createLink(AccountMenuLink)`. */
export function AccountMenuLink({
  strong = false,
  className,
  ref,
  ...props
}: AccountMenuLinkProps) {
  return <a ref={ref} className={cx(menuItemClass(strong), className)} {...props} />;
}

export type AccountMenuButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { strong?: boolean };

/** Opción del menú de cuenta que hace una acción ("Cerrar sesión"). */
export function AccountMenuButton({ strong = false, className, ...props }: AccountMenuButtonProps) {
  return <button type="button" className={cx(menuItemClass(strong), className)} {...props} />;
}

export function AccountMenuDivider() {
  return <hr className="my-2 border-0 border-t border-hairline" />;
}

export type TopNavLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  ref?: Ref<HTMLAnchorElement>;
};

/** Enlace de texto de la barra superior ("Publica tu vehículo"). Con TanStack Router: `createLink(TopNavLink)`. */
export function TopNavLink({ className, ref, ...props }: TopNavLinkProps) {
  return (
    <a
      ref={ref}
      className={cx(
        "inline-flex h-11 items-center gap-2 rounded-full px-3 text-body-sm font-medium whitespace-nowrap text-ink transition-colors hover:bg-surface-soft [&_svg]:size-4",
        focusRing,
        className,
      )}
      {...props}
    />
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
