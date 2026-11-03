import type { Context, MiddlewareHandler } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import type { Bindings } from "../env";
import { toBase64Url } from "./encoding";

export const SESSION_COOKIE = "luxydrive_session";
const SESSION_SECONDS = 7 * 24 * 60 * 60;

export type SessionUser = { id: number; name: string; role: "client" | "provider" };
export type AuthEnv = { Bindings: Bindings; Variables: { user: SessionUser } };

async function sha256(text: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return toBase64Url(new Uint8Array(digest));
}

export async function newSession() {
  const token = toBase64Url(crypto.getRandomValues(new Uint8Array(32)));
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
  return { token, tokenHash: await sha256(token), expiresAt };
}

export function setSessionCookie(c: Context, token: string) {
  setCookie(c, SESSION_COOKIE, token, {
    httpOnly: true,
    // Local development runs on plain HTTP, where a Secure cookie is never sent back.
    secure: new URL(c.req.url).protocol === "https:",
    sameSite: "Lax",
    path: "/",
    maxAge: SESSION_SECONDS,
  });
}

export async function endSession(c: Context<AuthEnv>) {
  const token = getCookie(c, SESSION_COOKIE);
  if (token) {
    await c.env.DB.prepare("DELETE FROM sessions WHERE token_hash = ?")
      .bind(await sha256(token))
      .run();
  }
  deleteCookie(c, SESSION_COOKIE, { path: "/" });
}

// The role always comes from D1, never from the request.
export const requireUser: MiddlewareHandler<AuthEnv> = async (c, next) => {
  const token = getCookie(c, SESSION_COOKIE);
  const user = token
    ? await c.env.DB.prepare(
        `SELECT users.id, users.name, users.role FROM sessions
         JOIN users ON users.id = sessions.user_id
         WHERE sessions.token_hash = ? AND sessions.expires_at > ?`,
      )
        .bind(await sha256(token), Math.floor(Date.now() / 1000))
        .first<SessionUser>()
    : null;
  if (!user) return c.json({ error: "unauthorized" } as const, 401);
  c.set("user", user);
  await next();
};

// Complements SameSite against CSRF on writes: front and API share one origin.
export const sameOrigin: MiddlewareHandler<{ Bindings: Bindings }> = async (c, next) => {
  if (c.req.method === "GET" || c.req.method === "HEAD") return next();
  if (c.req.header("origin") !== new URL(c.req.url).origin) {
    return c.json({ error: "invalid_origin" } as const, 403);
  }
  await next();
};
