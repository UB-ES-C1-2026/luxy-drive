import { describe, expect, it } from "vitest";
import { formatPrice, formatPriceCents } from "./utils";

// Intl separa el importe y el símbolo con un espacio no separable.
const nbsp = " ";

describe("formatPrice", () => {
  it.each([
    [4200, `4.200${nbsp}€`],
    [12500, `12.500${nbsp}€`],
    [0, `0${nbsp}€`],
  ])("shows whole euros without decimals: %d", (amount, expected) => {
    expect(formatPrice(amount)).toBe(expected);
  });

  it.each([
    [1200.5, `1.200,50${nbsp}€`],
    [9.99, `9,99${nbsp}€`],
    [1250.05, `1.250,05${nbsp}€`],
  ])("keeps the cents when there are any: %d", (amount, expected) => {
    expect(formatPrice(amount)).toBe(expected);
  });

  it("matches the per-person format, so the total and its split add up", () => {
    expect(formatPrice(1200.5)).toBe(formatPriceCents(1200.5));
  });
});
