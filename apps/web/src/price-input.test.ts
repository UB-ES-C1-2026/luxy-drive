import { describe, expect, it } from "vitest";
import { parsePrice } from "./price";

describe("parsePrice", () => {
  it.each([
    ["1200", 1200],
    ["1.200", 1200],
    ["1200,50", 1200.5],
    ["1.200,50", 1200.5],
    ["1200.5", 1200.5],
    [" 1 200 € ", 1200],
    ["0", 0],
  ])("reads %s as %d", (text, price) => {
    expect(parsePrice(text)).toBe(price);
  });

  it.each(["-10", "12,345", "doce", "", "1,2,3"])("rejects %s", (text) => {
    expect(parsePrice(text)).toBeNull();
  });
});
