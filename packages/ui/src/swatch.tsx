import { cx } from "./utils";

export type ColorSwatchProps = {
  /** Nombre del token sin prefijo: "primary", "ink", "hairline"… */
  token: string;
  value: string;
  className?: string;
};

/** Muestra un token de color (para la página de componentes). */
export function ColorSwatch({ token, value, className }: ColorSwatchProps) {
  return (
    <figure className={cx("flex flex-col gap-2", className)}>
      <div
        className="h-16 rounded-sm border border-hairline"
        style={{ backgroundColor: `var(--color-${token})` }}
      />
      <figcaption>
        <p className="text-caption text-ink">{token}</p>
        <p className="text-caption-sm text-muted uppercase">{value}</p>
      </figcaption>
    </figure>
  );
}
