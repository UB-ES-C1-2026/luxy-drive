import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { hashPassword } from "../auth/password";
import { newSession, sameOrigin, setSessionCookie } from "../auth/session";
import type { Bindings } from "../env";
import { signupBody, signupError } from "../schemas/signup";

export const auth = new Hono<{ Bindings: Bindings }>().use(sameOrigin).post(
  "/signup",
  zValidator("json", signupBody, (result, c) => {
    if (!result.success) return c.json({ error: signupError(result.error) }, 400);
  }),
  async (c) => {
    if (!c.env.AUTH_PEPPER) return c.json({ error: "internal_error" } as const, 500);
    const { name, email, password } = c.req.valid("json");
    const normalizedEmail = email.toLowerCase();
    const session = await newSession();
    try {
      const passwordHash = await hashPassword(password, c.env.AUTH_PEPPER);
      const [inserted] = await c.env.DB.batch<{ id: number }>([
        c.env.DB.prepare(
          "INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'client') RETURNING id",
        ).bind(name, normalizedEmail, passwordHash),
        c.env.DB.prepare(
          "INSERT INTO sessions (token_hash, user_id, expires_at) SELECT ?, id, ? FROM users WHERE email = ?",
        ).bind(session.tokenHash, session.expiresAt, normalizedEmail),
      ]);
      const user = inserted?.results[0];
      if (!user) return c.json({ error: "internal_error" } as const, 500);
      setSessionCookie(c, session.token);
      return c.json({ id: user.id, name, role: "client" as const }, 201);
    } catch (error) {
      if (String(error).includes("UNIQUE constraint failed: users.email")) {
        return c.json({ error: "email_exists" } as const, 409);
      }
      return c.json({ error: "internal_error" } as const, 500);
    }
  },
);
