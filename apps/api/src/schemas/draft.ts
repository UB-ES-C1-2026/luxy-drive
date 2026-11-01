import { z } from "zod";
import { isMadridLocalDateTime } from "../madrid-time";

// A draft can be incomplete: only the title is required (US-009).
export const draftBody = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000).optional(),
  category: z.enum(["jet", "yacht", "camper"]).optional(),
  vehicle: z.string().trim().max(120).optional(),
  location: z.string().trim().max(120).optional(),
  capacity: z.number().int().positive().max(500).optional(),
  // EUR for the whole experience, at most two decimals (US-011).
  price: z
    .number()
    .min(0)
    .max(10_000_000)
    .refine((value) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-6)
    .optional(),
  // Madrid wall-clock time as sent by an <input type="datetime-local">: 2026-11-10T18:00.
  serviceAt: z.string().refine(isMadridLocalDateTime).optional(),
});

export const draftChanges = draftBody.partial();

const codes = {
  title: "invalid_title",
  description: "invalid_description",
  category: "invalid_category",
  vehicle: "invalid_vehicle",
  location: "invalid_location",
  capacity: "invalid_capacity",
  price: "invalid_price",
  serviceAt: "invalid_service_at",
} as const;

const fields = Object.keys(codes) as (keyof typeof codes)[];

export function draftError(error: z.core.$ZodError) {
  const field = fields.find((f) => error.issues.some((issue) => issue.path[0] === f));
  return field ? codes[field] : ("invalid_body" as const);
}
