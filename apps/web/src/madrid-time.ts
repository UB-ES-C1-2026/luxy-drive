// La API recibe la fecha de servicio en hora de Madrid como un <input type="datetime-local">
// ("2026-11-10T18:00") y la devuelve en ISO UTC. Aquí se pasa de una a otra.
const madridParts = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/Madrid",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** Instante en hora de Madrid con el formato de `datetime-local`. */
export function toMadridLocal(date: Date) {
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    madridParts.formatToParts(date).find((p) => p.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}`;
}

export const nowInMadrid = () => toMadridLocal(new Date());
