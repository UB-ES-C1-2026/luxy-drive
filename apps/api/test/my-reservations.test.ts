import { env, SELF } from "cloudflare:test";
import { beforeEach, expect, it } from "vitest";

const base = "https://example.com/api";
const origin = "https://example.com";
let now: number;
let client: { id: number; cookie: string };
let other: { id: number; cookie: string };
let provider: { id: number; cookie: string };

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

function myReservations(cookie?: string) {
  return SELF.fetch(`${base}/reservations`, { headers: cookie ? { cookie } : {} });
}

async function listing(id: number, title: string, serviceAt: number) {
  await env.DB.prepare(
    `INSERT INTO experiences
      (id, provider_id, title, description, category, vehicle, location, service_at, capacity,
       price_cents, published, offer_active, offer_expires_at)
     VALUES (?, ?, ?, 'Ficticia', 'yacht', 'Velero', 'Palma', ?, 6, 90000, 1, 1, ?)`,
  )
    .bind(id, provider.id, title, serviceAt, serviceAt)
    .run();
}

async function reservation(
  experienceId: number,
  clientId: number,
  status: "pending" | "confirmed" | "rejected",
  createdAt: number,
) {
  await env.DB.prepare(
    `INSERT INTO reservations (experience_id, client_id, status, price_cents, created_at, decided_at)
     VALUES (?, ?, ?, 90000, ?, ?)`,
  )
    .bind(experienceId, clientId, status, createdAt, status === "pending" ? null : createdAt + 60)
    .run();
}

beforeEach(async () => {
  now = Math.floor(Date.now() / 1000);
  await env.DB.prepare("DELETE FROM reservations").run();
  await env.DB.prepare("DELETE FROM experiences").run();
  await env.DB.prepare("DELETE FROM sessions").run();
  await env.DB.prepare("DELETE FROM users").run();
  client = await signup("client", "client@example.com");
  other = await signup("client", "other@example.com");
  provider = await signup("provider", "provider@example.com");
  await listing(1, "Velero en Palma", now + 2 * 86400);
  await listing(2, "Yate en Ibiza", now + 86400);
});

it("lists only the session client's reservations with their current status, soonest service first", async () => {
  await reservation(1, client.id, "rejected", now - 300);
  await reservation(2, client.id, "pending", now - 100);
  await reservation(1, other.id, "confirmed", now - 200);

  const response = await myReservations(client.cookie);
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual([
    {
      id: expect.any(Number),
      experienceId: 2,
      experienceTitle: "Yate en Ibiza",
      serviceAt: new Date((now + 86400) * 1000).toISOString(),
      price: 900,
      currency: "EUR",
      status: "pending",
      createdAt: new Date((now - 100) * 1000).toISOString(),
    },
    {
      id: expect.any(Number),
      experienceId: 1,
      experienceTitle: "Velero en Palma",
      serviceAt: new Date((now + 2 * 86400) * 1000).toISOString(),
      price: 900,
      currency: "EUR",
      status: "rejected",
      createdAt: new Date((now - 300) * 1000).toISOString(),
    },
  ]);
});

it("returns an empty list when the client has no reservations", async () => {
  await reservation(1, other.id, "pending", now);
  const response = await myReservations(client.cookie);
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual([]);
});

it("never shows the client's email or other clients' data", async () => {
  await reservation(1, client.id, "pending", now);
  const body = JSON.stringify(await (await myReservations(client.cookie)).json());
  expect(body).not.toContain("@example.com");
  expect(body).not.toContain("clientName");
});

it("answers 401 without a session", async () => {
  const response = await myReservations();
  expect(response.status).toBe(401);
  expect(await response.json()).toEqual({ error: "unauthorized" });
});

it("answers 403 to a provider session", async () => {
  const response = await myReservations(provider.cookie);
  expect(response.status).toBe(403);
  expect(await response.json()).toEqual({ error: "forbidden" });
});
