import { z } from "zod";

// "Contacto" in US-008 is a phone: optional +, 9 to 15 digits (E.164 max),
// single spaces or hyphens allowed between digits.
const phone = /^\+?\d(?:[ -]?\d){8,14}$/;

export const profileBody = z.object({
  tradeName: z.string().trim().min(1),
  description: z.string().trim().min(1),
  phone: z.string().trim().regex(phone),
});

const codes = {
  tradeName: "invalid_trade_name",
  description: "invalid_description",
  phone: "invalid_phone",
} as const;

export function profileError(error: z.ZodError) {
  const field = (Object.keys(codes) as (keyof typeof codes)[]).find((f) =>
    error.issues.some((issue) => issue.path[0] === f),
  );
  return field ? codes[field] : ("invalid_body" as const);
}
