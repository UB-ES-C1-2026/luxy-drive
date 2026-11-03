import { describe, expect, it } from "vitest";
import { splitPrice } from "./price";

// Suma en céntimos para no arrastrar errores de coma flotante.
function totalCents(total: number, people: number) {
  const { base, higher, extra } = splitPrice(total, people);
  return Math.round(higher * 100) * extra + Math.round(base * 100) * (people - extra);
}

describe("splitPrice", () => {
  it("divides an exact total evenly", () => {
    expect(splitPrice(12500, 5)).toEqual({ base: 2500, higher: 2500.01, extra: 0 });
  });

  it("gives the leftover cents to some people", () => {
    expect(splitPrice(4800, 7)).toEqual({ base: 685.71, higher: 685.72, extra: 3 });
  });

  it("keeps cents in the total", () => {
    expect(splitPrice(1250.5, 6)).toEqual({ base: 208.41, higher: 208.42, extra: 4 });
  });

  it("adds up to the total in every case", () => {
    const cases: [total: number, people: number][] = [
      [4800, 7],
      [1250.5, 6],
      [1800, 8],
      [0.1, 3],
      [99999.99, 9],
      [6900, 8],
    ];
    for (const [total, people] of cases) {
      expect(totalCents(total, people)).toBe(Math.round(total * 100));
    }
  });
});
