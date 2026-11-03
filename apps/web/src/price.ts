/**
 * Reparte un precio en EUR entre `people` personas a céntimos enteros.
 * Si no sale exacto, las primeras `extra` personas pagan un céntimo más
 * para que la suma de lo que paga cada una sea exactamente el total.
 */
export function splitPrice(total: number, people: number) {
  const cents = Math.round(total * 100);
  const base = Math.floor(cents / people);
  const extra = cents - base * people;
  return { base: base / 100, higher: (base + 1) / 100, extra };
}

/**
 * Lee un precio escrito a mano en EUR: "1200", "1.200", "1200,50" o "1200.50".
 * Devuelve `null` si es negativo, tiene más de dos decimales o no es un número.
 */
export function parsePrice(text: string) {
  const compact = text.replace(/\s|€/g, "");
  // Con coma decimal, los puntos son separadores de miles; sin coma, "1.200" también lo es.
  const normalized = compact.includes(",")
    ? compact.replace(/\./g, "").replace(",", ".")
    : /^\d{1,3}(\.\d{3})+$/.test(compact)
      ? compact.replace(/\./g, "")
      : compact;
  return /^\d+(\.\d{1,2})?$/.test(normalized) ? Number(normalized) : null;
}
