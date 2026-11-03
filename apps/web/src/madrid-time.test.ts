import { describe, expect, it } from "vitest";
import { toMadridLocal } from "./madrid-time";

describe("toMadridLocal", () => {
  it("adds one hour in winter", () => {
    expect(toMadridLocal(new Date("2026-11-10T17:00:00Z"))).toBe("2026-11-10T18:00");
  });

  it("adds two hours in summer", () => {
    expect(toMadridLocal(new Date("2026-07-01T08:30:00Z"))).toBe("2026-07-01T10:30");
  });

  it("changes the day after midnight in Madrid", () => {
    expect(toMadridLocal(new Date("2026-12-31T23:30:00Z"))).toBe("2027-01-01T00:30");
  });
});
