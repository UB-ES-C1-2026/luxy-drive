import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Heart } from "./icons";
import { cx, focusRing } from "./utils";

type ButtonVariant = "primary" | "secondary" | "tertiary" | "pill";
type ButtonSize = "md" | "sm";

const variantClass: Record<ButtonVariant, string> = {
  primary:
    "rounded-sm bg-primary text-on-primary active:bg-primary-active disabled:bg-primary-disabled",
  secondary:
    "rounded-sm border border-ink bg-canvas text-ink hover:bg-surface-soft disabled:border-border-strong disabled:text-muted-soft disabled:hover:bg-canvas",
  tertiary:
    "rounded-sm text-ink underline-offset-4 hover:underline disabled:text-muted-soft disabled:no-underline",
  pill: "rounded-full bg-primary text-on-primary active:bg-primary-active disabled:bg-primary-disabled",
};

const sizeClass: Record<ButtonVariant, Record<ButtonSize, string>> = {
  primary: { md: "h-12 px-6 text-button-md", sm: "h-10 px-4 text-button-sm" },
  secondary: { md: "h-12 px-6 text-button-md", sm: "h-10 px-4 text-button-sm" },
  tertiary: { md: "h-12 text-button-md", sm: "h-10 text-button-sm" },
  pill: { md: "px-5 py-2.5 text-button-sm", sm: "px-4 py-2 text-button-sm" },
};

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Ocupa todo el ancho disponible (p. ej. CTA de la tarjeta de reserva). */
  fullWidth?: boolean;
  /** Icono a la izquierda del texto. */
  icon?: ReactNode;
};

export function Button({
  variant = "primary",
  size = "md",
  fullWidth = false,
  icon,
  type = "button",
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cx(
        "inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors disabled:cursor-not-allowed",
        focusRing,
        variantClass[variant],
        sizeClass[variant][size],
        fullWidth && "w-full",
        className,
      )}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}

type IconButtonVariant = "surface" | "outline" | "ghost";

export type IconButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-label"> & {
  /** Obligatorio: describe la acción ("Volver", "Cerrar"). */
  "aria-label": string;
  variant?: IconButtonVariant;
  size?: "sm" | "md";
  children: ReactNode;
};

const iconVariantClass: Record<IconButtonVariant, string> = {
  surface: "bg-surface-strong text-ink hover:bg-hairline-soft",
  outline: "border border-hairline bg-canvas text-ink hover:border-ink",
  ghost: "text-ink hover:bg-surface-soft",
};

/** Botón circular solo con icono. */
export function IconButton({
  variant = "surface",
  size = "md",
  type = "button",
  className,
  ...props
}: IconButtonProps) {
  return (
    <button
      type={type}
      className={cx(
        "inline-flex shrink-0 items-center justify-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-40 [&_svg]:size-4",
        size === "md" ? "size-10" : "size-8",
        focusRing,
        iconVariantClass[variant],
        className,
      )}
      {...props}
    />
  );
}

export type HeartButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onChange"> & {
  saved: boolean;
  onSavedChange?: (saved: boolean) => void;
};

/** Corazón de favoritos sobre la foto: contorno blanco, relleno primario al guardar. */
export function HeartButton({ saved, onSavedChange, className, ...props }: HeartButtonProps) {
  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-label={saved ? "Quitar de favoritos" : "Guardar en favoritos"}
      onClick={() => onSavedChange?.(!saved)}
      className={cx(
        "inline-flex size-8 items-center justify-center rounded-full transition-transform active:scale-90",
        focusRing,
        className,
      )}
      {...props}
    >
      <Heart
        aria-hidden
        strokeWidth={2}
        className={cx("size-6 text-white", saved ? "fill-primary" : "fill-black/50")}
      />
    </button>
  );
}
