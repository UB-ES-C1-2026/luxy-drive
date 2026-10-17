import { IconButton } from "./button";
import { ChevronLeft, ChevronRight } from "./icons";
import { cx, focusRing } from "./utils";

export type DateRange = { start?: Date; end?: Date };

export type CalendarProps = {
  /** Cualquier día del mes que se muestra. */
  month: Date;
  onMonthChange: (month: Date) => void;
  value: DateRange;
  onChange: (range: DateRange) => void;
  /** Días anteriores quedan deshabilitados (por defecto, hoy). */
  minDate?: Date;
  className?: string;
};

const weekdays = ["L", "M", "X", "J", "V", "S", "D"];
const monthFormat = new Intl.DateTimeFormat("es-ES", { month: "long", year: "numeric" });
const dayFormat = new Intl.DateTimeFormat("es-ES", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

const dayKey = (date: Date) => date.getFullYear() * 10000 + date.getMonth() * 100 + date.getDate();

/** Calendario de un mes con selección de rango (lunes primero, es-ES). */
export function Calendar({
  month,
  onMonthChange,
  value,
  onChange,
  minDate = new Date(),
  className,
}: CalendarProps) {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const offset = (new Date(year, monthIndex, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => new Date(year, monthIndex, i + 1));

  const minKey = dayKey(minDate);
  const startKey = value.start ? dayKey(value.start) : undefined;
  const endKey = value.end ? dayKey(value.end) : undefined;
  const title = monthFormat.format(month);

  function select(day: Date) {
    const key = dayKey(day);
    if (startKey === undefined || endKey !== undefined || key < startKey) {
      onChange({ start: day, end: undefined });
    } else {
      onChange({ start: value.start, end: day });
    }
  }

  return (
    <div className={cx("w-full max-w-[320px]", className)}>
      <div className="mb-4 flex items-center justify-between">
        <IconButton
          variant="ghost"
          size="sm"
          aria-label="Mes anterior"
          onClick={() => onMonthChange(new Date(year, monthIndex - 1, 1))}
        >
          <ChevronLeft aria-hidden />
        </IconButton>
        <p aria-live="polite" className="text-title-md text-ink first-letter:uppercase">
          {title}
        </p>
        <IconButton
          variant="ghost"
          size="sm"
          aria-label="Mes siguiente"
          onClick={() => onMonthChange(new Date(year, monthIndex + 1, 1))}
        >
          <ChevronRight aria-hidden />
        </IconButton>
      </div>

      <div className="grid grid-cols-7 gap-y-1">
        {weekdays.map((weekday) => (
          <span key={weekday} aria-hidden className="py-2 text-center text-micro-label text-muted">
            {weekday}
          </span>
        ))}
        {days.map((day, index) => {
          const key = dayKey(day);
          const disabled = key < minKey;
          const isStart = key === startKey;
          const isEnd = key === endKey;
          const selected = isStart || isEnd;
          const inRange =
            startKey !== undefined && endKey !== undefined && key > startKey && key < endKey;
          return (
            <div
              key={key}
              // El día 1 empieza en su columna de la semana (lunes = 1).
              style={index === 0 ? { gridColumnStart: offset + 1 } : undefined}
              className={cx(
                "flex justify-center",
                inRange && "bg-surface-soft",
                isStart &&
                  endKey !== undefined &&
                  "bg-linear-to-r from-transparent from-50% to-surface-soft to-50%",
                isEnd &&
                  startKey !== endKey &&
                  "bg-linear-to-l from-transparent from-50% to-surface-soft to-50%",
              )}
            >
              <button
                type="button"
                disabled={disabled}
                aria-pressed={selected}
                aria-label={dayFormat.format(day)}
                onClick={() => select(day)}
                className={cx(
                  "size-10 rounded-full text-body-sm font-medium transition-colors",
                  focusRing,
                  selected && "bg-ink text-on-primary",
                  !selected && !disabled && "text-ink hover:border hover:border-ink",
                  disabled && "cursor-not-allowed text-muted-soft line-through",
                )}
              >
                {day.getDate()}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
