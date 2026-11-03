import { z } from "zod";

// A draft can be incomplete: only the title is required (US-009).
export const draftBody = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000).optional(),
  category: z.enum(["jet", "yacht", "camper"]).optional(),
  vehicle: z.string().trim().max(120).optional(),
  location: z.string().trim().max(120).optional(),
  capacity: z.number().int().positive().max(500).optional(),
});

export const draftChanges = draftBody.partial();

const fields = Object.keys(draftBody.shape) as (keyof typeof draftBody.shape)[];

export function draftError(error: z.core.$ZodError) {
  const field = fields.find((f) => error.issues.some((issue) => issue.path[0] === f));
  return field ? (`invalid_${field}` as const) : ("invalid_body" as const);
}
