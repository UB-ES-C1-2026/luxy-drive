import { env, SELF } from "cloudflare:test";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import app from "../src/index";

const base = "https://example.com/api";
const origin = "https://example.com";
let now: number;
let client: string;
let providerCookie: string;
let providerId: number;

async function signup(kind: "client" | "provider", email: string) {
  const path = kind === "provider" ? "/auth/signup/provider" : "/auth/signup";
  const response = await SELF.fetch(`${base}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", origin },
    body: JSON.stringify({ name: "Demo", email, password: "secret123" }),
  });
  const { id } = (await response.json()) as { id: number };
  return { id, cookie: (response.headers.get("set-cookie") ?? "").split(";")[0] ?? "" };
}

function request(experienceId: unknown, cookie = client, headers: Record<string, string> = {}) {
  return SELF.fetch(`${base}/reservations`, {
    method: "POST",
    headers: { "content-type": "application/json", origin, cookie, ...headers },
    body: JSON.stringify({ experienceId }),
  });
}

async function listing({
  id = 1,
  published = 1,
  active = 1,
  serviceAt = now + 86400,
  expiresAt = now + 86400,
} = {}) {
  await env.DB.prepare(
    `INSERT INTO experiences
      (id, provider_id, title, description, category, vehicle, location, service_at, capacity,
       price_cents, published, offer_active, offer_expires_at)
     VALUES (?, ?, 'Velero en Palma', 'Ficticia', 'yacht', 'Velero', 'Palma', ?, 6, 90000, ?, ?, ?)`,
  )
    .bind(id, providerId, serviceAt, published, active, expiresAt)
    .run();
}

async function confirm(reservationId: number) {
  await env.DB.prepare("UPDATE reservations SET status = 'confirmed', decided_at = ? WHERE id = ?")
    .bind(now, reservationId)
    .run();
}

beforeEach(async () => {
  now = Math.floor(Date.now() / 1000);
  await env.DB.prepare("DELETE FROM reservations").run();
  await env.DB.prepare("DELETE FROM experiences").run();
  await env.DB.prepare("DELETE FROM sessions").run();
  await env.DB.prepare("DELETE FROM users").run();
  client = (await signup("client", "client@example.com")).cookie;
  const provider = await signup("provider", "provider@example.com");
  providerCookie = provider.cookie;
  providerId = provider.id;
});

afterEach(() => {
  vi.restoreAllMocks();
});

it("creates a pending request on an available experience", async () => {
  await listing();
  const response = await request(1);
  expect(response.status).toBe(201);
  const body = (await response.json()) as Record<string, unknown>;
  expect(body).toEqual({
    id: expect.any(Number),
    experienceId: 1,
    experienceTitle: "Velero en Palma",
    serviceAt: new Date((now + 86400) * 1000).toISOString(),
    price: 900,
    currency: "EUR",
    status: "pending",
    createdAt: expect.any(String),
  });

  const saved = await env.DB.prepare("SELECT status, price_cents FROM reservations").first();
  expect(saved).toEqual({ status: "pending", price_cents: 90000 });
});

it("lets several clients ask for the same experience but one client only once", async () => {
  await listing();
  const other = (await signup("client", "other@example.com")).cookie;
  expect((await request(1)).status).toBe(201);
  expect((await request(1, other)).status).toBe(201);

  const again = await request(1);
  expect(again.status).toBe(409);
  expect(await again.json()).toEqual({ error: "already_requested" });
});

it.each([
  ["an expired offer", () => ({ expiresAt: now - 60 })],
  ["a withdrawn offer", () => ({ active: 0 })],
  ["a service already started", () => ({ serviceAt: now - 60, expiresAt: now - 60 })],
])("refuses %s with 410 and creates nothing", async (_, overrides) => {
  await listing(overrides());
  const response = await request(1);
  expect(response.status).toBe(410);
  expect(await response.json()).toEqual({ error: "not_available" });
  expect(await env.DB.prepare("SELECT COUNT(*) AS n FROM reservations").first()).toEqual({ n: 0 });
});

it("answers 404 for a draft or a missing experience, without revealing drafts", async () => {
  await listing({ published: 0 });
  for (const id of [1, 99]) {
    const response = await request(id);
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "not_found" });
  }
  expect(await env.DB.prepare("SELECT COUNT(*) AS n FROM reservations").first()).toEqual({ n: 0 });
});

it("stops offering an experience once a request is confirmed", async () => {
  await listing();
  const first = (await (await request(1)).json()) as { id: number };
  await confirm(first.id);

  const other = (await signup("client", "other@example.com")).cookie;
  const late = await request(1, other);
  expect(late.status).toBe(410);
  expect(await late.json()).toEqual({ error: "not_available" });

  expect(await (await SELF.fetch(`${base}/experiences`)).json()).toEqual([]);
  expect((await SELF.fetch(`${base}/experiences/1`)).status).toBe(410);
});

it("never keeps two confirmed requests for the same experience", async () => {
  await listing();
  const other = (await signup("client", "other@example.com")).cookie;
  const first = (await (await request(1)).json()) as { id: number };
  const second = (await (await request(1, other)).json()) as { id: number };
  await confirm(first.id);
  await expect(confirm(second.id)).rejects.toThrow(/UNIQUE constraint failed/);
});

it("asks for a session and refuses providers", async () => {
  await listing();
  const anonymous = await request(1, "");
  expect(anonymous.status).toBe(401);
  expect(await anonymous.json()).toEqual({ error: "unauthorized" });

  const asProvider = await request(1, providerCookie);
  expect(asProvider.status).toBe(403);
  expect(await asProvider.json()).toEqual({ error: "forbidden" });
  expect(await env.DB.prepare("SELECT COUNT(*) AS n FROM reservations").first()).toEqual({ n: 0 });
});

it("rejects a write from another origin", async () => {
  await listing();
  const response = await request(1, client, { origin: "https://evil.example" });
  expect(response.status).toBe(403);
  expect(await response.json()).toEqual({ error: "invalid_origin" });
});

it.each([["7"], [0], [-1], [1.5], [null]])("rejects experienceId %j with 400", async (value) => {
  const response = await request(value);
  expect(response.status).toBe(400);
  expect(await response.json()).toEqual({ error: "invalid_experience_id" });
});

it("hides database errors behind internal_error", async () => {
  await listing();
  const prepare = env.DB.prepare.bind(env.DB);
  vi.spyOn(env.DB, "prepare").mockImplementation((sql: string) => {
    if (sql.includes("INSERT INTO reservations")) throw new Error("boom");
    return prepare(sql);
  });
  const response = await app.request(
    "/api/reservations",
    {
      method: "POST",
      headers: { "content-type": "application/json", origin: "http://localhost", cookie: client },
      body: JSON.stringify({ experienceId: 1 }),
    },
    env,
  );
  expect(response.status).toBe(500);
  expect(await response.json()).toEqual({ error: "internal_error" });
});
