import { env, SELF } from "cloudflare:test";
import { beforeEach, expect, it } from "vitest";

const base = "https://example.com/api";
const origin = "https://example.com";
const ana = { name: "Ana", email: "ana@example.com", password: "secret123" };

type SessionUser = { id: number; name: string; role: string };

function post(path: string, body?: unknown, headers: Record<string, string> = {}) {
  return SELF.fetch(`${base}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", origin, ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function me(cookie: string) {
  return SELF.fetch(`${base}/auth/me`, { headers: { cookie } });
}

function sessionCookie(response: Response) {
  return (response.headers.get("set-cookie") ?? "").split(";")[0] ?? "";
}

async function count(table: "users" | "sessions") {
  const row = await env.DB.prepare(`SELECT COUNT(*) AS n FROM ${table}`).first<{ n: number }>();
  return row?.n ?? 0;
}

beforeEach(async () => {
  await env.DB.prepare("DELETE FROM provider_profiles").run();
  await env.DB.prepare("DELETE FROM sessions").run();
  await env.DB.prepare("DELETE FROM users").run();
});

// POST /api/auth/signup

it("signs up a client and starts the session", async () => {
  const response = await post("/auth/signup", ana);
  expect(response.status).toBe(201);
  const user = (await response.json()) as SessionUser;
  expect(user).toEqual({ id: expect.any(Number), name: "Ana", role: "client" });

  const cookie = response.headers.get("set-cookie") ?? "";
  expect(cookie).toMatch(/^luxydrive_session=[^;]+;/);
  expect(cookie).toContain("HttpOnly");
  expect(cookie).toContain("Secure");
  expect(cookie).toContain("SameSite=Lax");

  const current = await me(sessionCookie(response));
  expect(current.status).toBe(200);
  expect(await current.json()).toEqual(user);
});

it("never returns the password and stores only its hash", async () => {
  const response = await post("/auth/signup", ana);
  expect(JSON.stringify(await response.json())).not.toContain(ana.password);

  const row = await env.DB.prepare("SELECT password_hash FROM users WHERE email = ?")
    .bind(ana.email)
    .first<{ password_hash: string }>();
  expect(row?.password_hash).toMatch(/^v1\$pbkdf2-sha256\$/);
  expect(row?.password_hash).not.toContain(ana.password);
});

it("ignores a role sent in the body", async () => {
  const response = await post("/auth/signup", { ...ana, role: "provider" });
  expect(((await response.json()) as SessionUser).role).toBe("client");
});

it("stores the email trimmed and lowercased, so it cannot be reused with other capitals", async () => {
  await post("/auth/signup", { ...ana, email: "  Ana@Example.COM " });
  const row = await env.DB.prepare("SELECT email FROM users").first<{ email: string }>();
  expect(row?.email).toBe("ana@example.com");

  const again = await post("/auth/signup", { ...ana, email: "ANA@example.com" });
  expect(again.status).toBe(409);
  expect(await again.json()).toEqual({ error: "email_exists" });
  expect(await count("users")).toBe(1);
});

it.each([
  ["invalid_name", { ...ana, name: "   " }],
  ["invalid_email", { ...ana, email: "ana.example.com" }],
  ["invalid_password", { ...ana, password: "1234567" }],
])("responds 400 %s and creates no account", async (error, body) => {
  const response = await post("/auth/signup", body);
  expect(response.status).toBe(400);
  expect(await response.json()).toEqual({ error });
  expect(await count("users")).toBe(0);
});

it("rejects a signup without Origin or from another origin (403)", async () => {
  const missing = await SELF.fetch(`${base}/auth/signup`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(ana),
  });
  const foreign = await post("/auth/signup", ana, { origin: "https://evil.example" });
  for (const response of [missing, foreign]) {
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "invalid_origin" });
  }
  expect(await count("users")).toBe(0);
});

// POST /api/auth/signup/provider

it("signs up a provider who can enter the provider area", async () => {
  const response = await post("/auth/signup/provider", ana);
  expect(response.status).toBe(201);
  expect(await response.json()).toEqual({ id: expect.any(Number), name: "Ana", role: "provider" });

  // 404 means "no profile yet": the provider area let the account in.
  const profile = await SELF.fetch(`${base}/provider/profile`, {
    headers: { cookie: sessionCookie(response) },
  });
  expect(profile.status).toBe(404);
});

it("does not create a provider with an email already used by a client (409)", async () => {
  await post("/auth/signup", ana);
  const response = await post("/auth/signup/provider", { ...ana, name: "Ana Yachts" });
  expect(response.status).toBe(409);
  expect(await response.json()).toEqual({ error: "email_exists" });
  expect(await count("users")).toBe(1);
});

// POST /api/auth/login

it("logs in with the email in any case and starts a new session", async () => {
  await post("/auth/signup", ana);
  const response = await post("/auth/login", { email: "ANA@example.com", password: ana.password });
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ id: expect.any(Number), name: "Ana", role: "client" });
  expect((await me(sessionCookie(response))).status).toBe(200);
});

it("answers the same 401 for a wrong password and for an unknown email", async () => {
  await post("/auth/signup", ana);
  const wrong = await post("/auth/login", { email: ana.email, password: "not-the-password" });
  const unknown = await post("/auth/login", {
    email: "nobody@example.com",
    password: ana.password,
  });

  expect(wrong.status).toBe(401);
  expect(unknown.status).toBe(401);
  const wrongBody = await wrong.json();
  expect(wrongBody).toEqual({ error: "invalid_credentials" });
  expect(await unknown.json()).toEqual(wrongBody);
  expect(wrong.headers.get("set-cookie")).toBeNull();
});

it("responds 400 when the password is missing", async () => {
  const response = await post("/auth/login", { email: ana.email });
  expect(response.status).toBe(400);
  expect(await response.json()).toEqual({ error: "invalid_body" });
});

// POST /api/auth/logout

it("logs out: deletes the session and expires the cookie", async () => {
  const cookie = sessionCookie(await post("/auth/signup", ana));
  const response = await post("/auth/logout", undefined, { cookie });

  expect(response.status).toBe(204);
  expect(response.headers.get("set-cookie")).toMatch(/^luxydrive_session=;.*Max-Age=0/);
  expect(await count("sessions")).toBe(0);
  expect((await me(cookie)).status).toBe(401);
});

it("answers 204 to a logout without a session", async () => {
  expect((await post("/auth/logout")).status).toBe(204);
});

it("keeps the sessions of other devices after a logout", async () => {
  const first = sessionCookie(await post("/auth/signup", ana));
  const second = sessionCookie(await post("/auth/login", ana));

  await post("/auth/logout", undefined, { cookie: first });
  expect((await me(first)).status).toBe(401);
  expect((await me(second)).status).toBe(200);
});

// GET /api/auth/me

it.each([
  ["without a cookie", ""],
  ["with an unknown token", "luxydrive_session=not-a-real-token"],
])("me responds 401 %s", async (_case, cookie) => {
  const response = await me(cookie);
  expect(response.status).toBe(401);
  expect(await response.json()).toEqual({ error: "unauthorized" });
});

it("me responds 401 once the session has expired", async () => {
  const cookie = sessionCookie(await post("/auth/signup", ana));
  await env.DB.prepare("UPDATE sessions SET expires_at = ?")
    .bind(Math.floor(Date.now() / 1000) - 1)
    .run();
  expect((await me(cookie)).status).toBe(401);
});
