import { z } from "zod";
import { isMadridLocalDateTime } from "../madrid-time";

// A special offer on a published listing (US-016): a cheaper price until a given time.
export const offerBody = z.object({
  type: z.enum(["last_minute", "empty_leg"]),
  // EUR for the whole experience, at most two decimals, like the listing price (US-011).
  price: z
    .number()
    .min(0)
    .max(10_000_000)
    .refine((value) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-6),
  // Madrid wall-clock time, as sent by an <input type="datetime-local">.
  until: z.string().refine(isMadridLocalDateTime),
});

const codes = {
  type: "invalid_offer_type",
  price: "invalid_price",
  until: "invalid_until",
} as const;

const fields = Object.keys(codes) as (keyof typeof codes)[];

export function offerError(error: z.core.$ZodError) {
  const field = fields.find((f) => error.issues.some((issue) => issue.path[0] === f));
  return field ? codes[field] : ("invalid_body" as const);
}
