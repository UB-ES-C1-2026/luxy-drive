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
