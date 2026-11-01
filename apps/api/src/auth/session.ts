import type { Context, MiddlewareHandler } from "hono";
import { setCookie } from "hono/cookie";
import type { Bindings } from "../env";
import { toBase64Url } from "./encoding";

export const SESSION_COOKIE = "luxydrive_session";
const SESSION_SECONDS = 7 * 24 * 60 * 60;

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

// Complements SameSite against CSRF: front and API share one origin.
export const sameOrigin: MiddlewareHandler<{ Bindings: Bindings }> = async (c, next) => {
  if (c.req.header("origin") !== new URL(c.req.url).origin) {
    return c.json({ error: "invalid_origin" } as const, 403);
  }
  await next();
};
