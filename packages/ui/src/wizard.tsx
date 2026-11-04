import type { ReactNode } from "react";
import { cx, focusRing } from "./utils";

export type StepProgressProps = {
  /** Paso actual, empezando en 1. */
  step: number;
  total: number;
  className?: string;
};

/** Barra de progreso de un formulario paso a paso ("Pregunta 2 de 8"). */
export function StepProgress({ step, total, className }: StepProgressProps) {
  const percent = Math.round((Math.min(step, total) / total) * 100);
  return (
    <div className={cx("flex flex-col gap-2", className)}>
      <p className="text-body-sm text-muted">
        Pregunta {step} de {total}
      </p>
      <div
        role="progressbar"
        aria-label="Progreso"
        aria-valuemin={1}
        aria-valuemax={total}
        aria-valuenow={step}
        className="h-1 overflow-hidden rounded-full bg-surface-strong"
      >
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

export type ChoiceOption = { value: string; label: string; icon?: ReactNode };

export type ChoiceCardsProps = {
  /** Texto para lectores de pantalla (la pregunta). */
  label: string;
  options: ChoiceOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
};

/** Opciones grandes para elegir una sola, como en un formulario conversacional. */
export function ChoiceCards({ label, options, value, onChange, className }: ChoiceCardsProps) {
  return (
    <fieldset className={cx("m-0 grid min-w-0 gap-3 border-0 p-0 sm:grid-cols-3", className)}>
      <legend className="sr-only">{label}</legend>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(option.value)}
            className={cx(
              "flex flex-col items-start gap-3 rounded-md border bg-canvas p-5 text-left text-title-md text-ink transition-colors [&_svg]:size-8 [&_svg]:stroke-[1.5]",
              focusRing,
              selected
                ? "border-ink shadow-[inset_0_0_0_1px_var(--color-ink)]"
                : "border-hairline hover:border-ink",
            )}
          >
            {option.icon}
            {option.label}
          </button>
        );
      })}
    </fieldset>
  );
}
