import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { createFactory } from "hono/factory";
import { hashPassword, verifyPassword } from "../auth/password";
import {
  type AuthEnv,
  endSession,
  newSession,
  requireUser,
  type SessionUser,
  sameOrigin,
  setSessionCookie,
} from "../auth/session";
import { loginBody, signupBody, signupError } from "../schemas/signup";

const factory = createFactory<AuthEnv>();

// The role comes from the endpoint, never from the request body.
function signupAs<R extends SessionUser["role"]>(role: R) {
  return factory.createHandlers(
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
            "INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?) RETURNING id",
          ).bind(name, normalizedEmail, passwordHash, role),
          c.env.DB.prepare(
            "INSERT INTO sessions (token_hash, user_id, expires_at) SELECT ?, id, ? FROM users WHERE email = ?",
          ).bind(session.tokenHash, session.expiresAt, normalizedEmail),
        ]);
        const user = inserted?.results[0];
        if (!user) return c.json({ error: "internal_error" } as const, 500);
        setSessionCookie(c, session.token);
        return c.json({ id: user.id, name, role }, 201);
      } catch (error) {
        if (String(error).includes("UNIQUE constraint failed: users.email")) {
          return c.json({ error: "email_exists" } as const, 409);
        }
        return c.json({ error: "internal_error" } as const, 500);
      }
    },
  );
}

export const auth = new Hono<AuthEnv>()
  .use(sameOrigin)
  .post("/signup", ...signupAs("client"))
  .post("/signup/provider", ...signupAs("provider"))
  .post(
    "/login",
    zValidator("json", loginBody, (result, c) => {
      if (!result.success) return c.json({ error: "invalid_body" } as const, 400);
    }),
    async (c) => {
      if (!c.env.AUTH_PEPPER) return c.json({ error: "internal_error" } as const, 500);
      const { email, password } = c.req.valid("json");
      try {
        const user = await c.env.DB.prepare(
          "SELECT id, name, role, password_hash FROM users WHERE email = ?",
        )
          .bind(email.toLowerCase())
          .first<SessionUser & { password_hash: string }>();
        const valid = await verifyPassword(
          password,
          user?.password_hash ?? null,
          c.env.AUTH_PEPPER,
        );
        if (!user || !valid) return c.json({ error: "invalid_credentials" } as const, 401);
        const session = await newSession();
        await c.env.DB.prepare(
          "INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)",
        )
          .bind(session.tokenHash, user.id, session.expiresAt)
          .run();
        setSessionCookie(c, session.token);
        return c.json({ id: user.id, name: user.name, role: user.role }, 200);
      } catch {
        return c.json({ error: "internal_error" } as const, 500);
      }
    },
  )
  .post("/logout", async (c) => {
    try {
      await endSession(c);
      return c.body(null, 204);
    } catch {
      return c.json({ error: "internal_error" } as const, 500);
    }
  })
  .get("/me", requireUser, (c) => c.json(c.get("user"), 200));
