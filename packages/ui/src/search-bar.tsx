import type { ButtonHTMLAttributes, FormEvent } from "react";
import { Search } from "./icons";
import { cx, focusRing } from "./utils";

export type SearchOrbProps = ButtonHTMLAttributes<HTMLButtonElement>;

/** Orbe circular primario de 48px que cierra la barra de búsqueda. */
export function SearchOrb({ className, type = "submit", ...props }: SearchOrbProps) {
  return (
    <button
      type={type}
      aria-label="Buscar"
      className={cx(
        "inline-flex size-12 shrink-0 items-center justify-center rounded-full bg-primary text-on-primary transition-colors active:bg-primary-active",
        focusRing,
        className,
      )}
      {...props}
    >
      <Search aria-hidden strokeWidth={2.5} className="size-4" />
    </button>
  );
}

export type SearchSegment = {
  /** "Dónde", "Cuándo", "Quién". */
  label: string;
  /** Valor elegido; si no hay, se muestra el placeholder. */
  value?: string;
  placeholder: string;
};

export type SearchBarProps = {
  segments: SearchSegment[];
  /** Al pulsar un segmento (abrir selector de destino, fechas o pasajeros). */
  onSegmentClick?: (index: number) => void;
  onSearch?: () => void;
  /** Texto de la pastilla única en móvil. */
  mobileLabel?: string;
  className?: string;
};

/** Barra de búsqueda en pastilla: segmentos separados por hairlines + orbe. En móvil, una sola pastilla. */
export function SearchBar({
  segments,
  onSegmentClick,
  onSearch,
  mobileLabel = "Empieza a buscar",
  className,
}: SearchBarProps) {
  function submit(event: FormEvent) {
    event.preventDefault();
    onSearch?.();
  }

  return (
    <search className={cx("block w-full", className)}>
      <form onSubmit={submit}>
        {/* Móvil */}
        <button
          type="button"
          onClick={() => onSegmentClick?.(0)}
          className={cx(
            "flex h-14 w-full items-center justify-center gap-2 rounded-full border border-hairline bg-canvas text-caption text-ink shadow-float md:hidden",
            focusRing,
          )}
        >
          <Search aria-hidden strokeWidth={2.5} className="size-4" />
          {mobileLabel}
        </button>

        {/* Tablet y escritorio */}
        <div className="hidden h-16 items-center rounded-full border border-hairline bg-canvas p-2 shadow-float md:flex">
          {segments.map((segment, index) => (
            <div key={segment.label} className="flex min-w-0 flex-1 items-center">
              {index > 0 && <span aria-hidden className="h-8 w-px shrink-0 bg-hairline" />}
              <button
                type="button"
                onClick={() => onSegmentClick?.(index)}
                className={cx(
                  "flex h-12 min-w-0 flex-1 flex-col justify-center rounded-full px-6 text-left hover:bg-surface-soft",
                  focusRing,
                )}
              >
                <span className="text-caption text-ink">{segment.label}</span>
                <span
                  className={cx("truncate text-body-sm", segment.value ? "text-ink" : "text-muted")}
                >
                  {segment.value ?? segment.placeholder}
                </span>
              </button>
            </div>
          ))}
          <SearchOrb />
        </div>
      </form>
    </search>
  );
}
