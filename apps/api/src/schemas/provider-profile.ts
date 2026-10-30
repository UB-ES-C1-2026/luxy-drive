import { z } from "zod";

// "Contacto" has no format in US-008, so it is free text.
export const profileBody = z.object({
  tradeName: z.string().trim().min(1),
  description: z.string().trim().min(1),
  contact: z.string().trim().min(1),
});

const codes = {
  tradeName: "invalid_trade_name",
  description: "invalid_description",
  contact: "invalid_contact",
} as const;

export function profileError(error: z.ZodError) {
  const field = (Object.keys(codes) as (keyof typeof codes)[]).find((f) =>
    error.issues.some((issue) => issue.path[0] === f),
  );
  return field ? codes[field] : ("invalid_body" as const);
}
