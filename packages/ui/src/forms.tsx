import {
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
  useId,
} from "react";
import { IconButton } from "./button";
import { Minus, Plus } from "./icons";
import { cx, focusRing } from "./utils";

export type TextInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "size"> & {
  label: string;
  /** Texto de ayuda bajo el campo. */
  hint?: ReactNode;
  /** Mensaje de error; marca el campo como inválido. */
  error?: ReactNode;
};

/** Campo de texto: 56px, borde hairline; al enfocar, borde de 2px en ink sin halo. */
export function TextInput({ label, hint, error, id, className, ...props }: TextInputProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const messageId = `${inputId}-message`;
  const message = error ?? hint;

  return (
    <div className={cx("flex flex-col gap-1.5", className)}>
      <label htmlFor={inputId} className="text-caption text-muted">
        {label}
      </label>
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={message ? messageId : undefined}
        className={cx(
          "h-14 rounded-sm border bg-canvas px-3 text-body-md text-ink outline-none transition-shadow placeholder:text-muted",
          "focus:border-ink focus:shadow-[inset_0_0_0_1px_var(--color-ink)]",
          "disabled:cursor-not-allowed disabled:bg-surface-soft disabled:text-muted-soft",
          error
            ? "border-error shadow-[inset_0_0_0_1px_var(--color-error)] focus:border-error focus:shadow-[inset_0_0_0_1px_var(--color-error)]"
            : "border-hairline",
        )}
        {...props}
      />
      {message && (
        <p id={messageId} className={cx("text-body-sm", error ? "text-error" : "text-muted")}>
          {message}
        </p>
      )}
    </div>
  );
}

export type TextAreaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  /** Texto de ayuda bajo el campo. */
  hint?: ReactNode;
  /** Mensaje de error; marca el campo como inválido. */
  error?: ReactNode;
};

/** Texto largo (descripciones): mismo borde, foco y error que TextInput. */
export function TextArea({ label, hint, error, id, className, rows = 4, ...props }: TextAreaProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const messageId = `${inputId}-message`;
  const message = error ?? hint;

  return (
    <div className={cx("flex flex-col gap-1.5", className)}>
      <label htmlFor={inputId} className="text-caption text-muted">
        {label}
      </label>
      <textarea
        id={inputId}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={message ? messageId : undefined}
        className={cx(
          "min-h-28 resize-y rounded-sm border bg-canvas px-3 py-3.5 text-body-md text-ink outline-none transition-shadow placeholder:text-muted",
          "focus:border-ink focus:shadow-[inset_0_0_0_1px_var(--color-ink)]",
          "disabled:cursor-not-allowed disabled:bg-surface-soft disabled:text-muted-soft",
          error
            ? "border-error shadow-[inset_0_0_0_1px_var(--color-error)] focus:border-error focus:shadow-[inset_0_0_0_1px_var(--color-error)]"
            : "border-hairline",
        )}
        {...props}
      />
      {message && (
        <p id={messageId} className={cx("text-body-sm", error ? "text-error" : "text-muted")}>
          {message}
        </p>
      )}
    </div>
  );
}

export type StepperProps = {
  label: string;
  description?: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  className?: string;
};

/** Contador +/− (pasajeros, huéspedes). */
export function Stepper({
  label,
  description,
  value,
  onChange,
  min = 0,
  max = Number.POSITIVE_INFINITY,
  className,
}: StepperProps) {
  const descriptionId = useId();
  return (
    <fieldset
      aria-describedby={description ? descriptionId : undefined}
      className={cx("m-0 flex min-w-0 items-center justify-between gap-4 border-0 p-0", className)}
    >
      <legend className="sr-only">{label}</legend>
      <div aria-hidden>
        <p className="text-title-md text-ink">{label}</p>
      </div>
      {description && (
        <p id={descriptionId} className="sr-only">
          {description}
        </p>
      )}
      <div className="flex items-center gap-3">
        <IconButton
          variant="outline"
          size="sm"
          aria-label={`Quitar uno: ${label}`}
          disabled={value <= min}
          onClick={() => onChange(Math.max(min, value - 1))}
        >
          <Minus aria-hidden />
        </IconButton>
        <span aria-live="polite" className="min-w-6 text-center text-body-md text-ink">
          {value}
        </span>
        <IconButton
          variant="outline"
          size="sm"
          aria-label={`Añadir uno: ${label}`}
          disabled={value >= max}
          onClick={() => onChange(Math.min(max, value + 1))}
        >
          <Plus aria-hidden />
        </IconButton>
      </div>
    </fieldset>
  );
}

export type ChipProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  selected?: boolean;
  icon?: ReactNode;
};

/** Pastilla seleccionable (filtros rápidos, categorías en móvil). */
export function Chip({ selected = false, icon, className, children, ...props }: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cx(
        "inline-flex h-10 shrink-0 items-center gap-2 rounded-xl border px-4 text-button-sm transition-colors [&_svg]:size-4",
        focusRing,
        selected
          ? "border-ink bg-surface-soft text-ink shadow-[inset_0_0_0_1px_var(--color-ink)]"
          : "border-hairline bg-canvas text-ink hover:border-ink",
        className,
      )}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}
