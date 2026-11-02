import { describe, expect, it } from "vitest";
import { profileBody, profileError } from "../src/schemas/provider-profile";

const valid = {
  tradeName: "Demo Yachts",
  description: "Yates de demo en Barcelona",
  phone: "+34 612 345 678",
};

function errorFor(input: unknown) {
  const result = profileBody.safeParse(input);
  return result.success ? null : profileError(result.error);
}

describe("profileBody", () => {
  it("accepts a trade name, a description and a phone", () => {
    expect(profileBody.safeParse(valid)).toEqual({ success: true, data: valid });
  });

  it("trims every field", () => {
    const parsed = profileBody.parse({
      tradeName: " Demo Yachts ",
      description: "  Yates de demo en Barcelona",
      phone: "+34 612 345 678  ",
    });
    expect(parsed).toEqual(valid);
  });

  it.each([
    ["tradeName", "invalid_trade_name"],
    ["description", "invalid_description"],
    ["phone", "invalid_phone"],
  ] as const)("rejects an empty %s with %s", (field, code) => {
    expect(errorFor({ ...valid, [field]: "" })).toBe(code);
    expect(errorFor({ ...valid, [field]: "   " })).toBe(code);
    const { [field]: _, ...rest } = valid;
    expect(errorFor(rest)).toBe(code);
  });

  it.each(["612345678", "612 345 678", "+34 612-345-678", "+44 20 7946 0000", "+123456789012345"])(
    "accepts the phone %j",
    (phone) => {
      expect(errorFor({ ...valid, phone })).toBeNull();
    },
  );

  it.each([
    "info@demo.example",
    "61234567",
    "+1234567890123456",
    "612 34a 678",
    "34+612345678",
    "++34612345678",
  ])("rejects the phone %j with invalid_phone", (phone) => {
    expect(errorFor({ ...valid, phone })).toBe("invalid_phone");
  });

  it.each([[null], ["texto"], [[]]])("rejects the body %j with invalid_body", (body) => {
    expect(errorFor(body)).toBe("invalid_body");
  });

  it("reports the first invalid field in form order", () => {
    expect(errorFor({ tradeName: "", description: "", phone: "" })).toBe("invalid_trade_name");
  });
});
