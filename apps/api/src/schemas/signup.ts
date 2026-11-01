import { z } from "zod";

// Shared by customer (US-006) and provider (US-033) signup.
export const signupBody = z.object({
  name: z.string().trim().min(1),
  email: z.string().trim().pipe(z.email()),
  password: z.string().min(8),
});

const fields = ["name", "email", "password"] as const;

export function signupError(error: z.core.$ZodError) {
  const field = fields.find((f) => error.issues.some((issue) => issue.path[0] === f));
  return field ? (`invalid_${field}` as const) : ("invalid_body" as const);
}
