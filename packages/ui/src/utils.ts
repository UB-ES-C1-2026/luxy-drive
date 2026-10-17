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

/** 4200 → "4.200 €" (formato es-ES, sin decimales). */
export function formatPrice(amount: number): string {
  return eur.format(amount);
}

/** Clases de foco visible compartidas por todos los controles. */
export const focusRing =
  "outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";
