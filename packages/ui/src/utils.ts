/** Une clases ignorando valores falsy. */
export function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

const eur = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
  // es-ES no agrupa números de 4 cifras por defecto ("4200 €"); DESIGN.md usa "4.200 €".
  useGrouping: "always",
});

/** 4200 → "4.200 €"; 1200.5 → "1.200,50 €" (formato es-ES, céntimos solo si los hay). */
export function formatPrice(amount: number): string {
  // Redondear 1200,50 a "1.201 €" no cuadraría con el precio por persona, que va en céntimos.
  return Number.isInteger(amount) ? eur.format(amount) : eurCents.format(amount);
}

const eurCents = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  useGrouping: "always",
});

/** 685.71 → "685,71 €": para importes que necesitan céntimos (precio por persona). */
export function formatPriceCents(amount: number): string {
  return eurCents.format(amount);
}

/** Clases de foco visible compartidas por todos los controles. */
export const focusRing =
  "outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";
