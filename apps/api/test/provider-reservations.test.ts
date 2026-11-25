import { env, SELF } from "cloudflare:test";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import app from "../src/index";

const base = "https://example.com/api";
const origin = "https://example.com";
let now: number;
let owner: { id: number; cookie: string };
let stranger: { id: number; cookie: string };
let alice: string;
let bob: string;

async function signup(kind: "client" | "provider", name: string, email: string) {
  const path = kind === "provider" ? "/auth/signup/provider" : "/auth/signup";
  const response = await SELF.fetch(`${base}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", origin },
    body: JSON.stringify({ name, email, password: "secret123" }),
  });
  const { id } = (await response.json()) as { id: number };
  return { id, cookie: (response.headers.get("set-cookie") ?? "").split(";")[0] ?? "" };
}

function send(method: string, path: string, cookie: string, body?: unknown) {
  return SELF.fetch(`${base}${path}`, {
    method,
    headers: { "content-type": "application/json", origin, cookie },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

async function listing(id: number, providerId: number, expiresAt = now + 86400) {
  await env.DB.prepare(
    `INSERT INTO experiences
      (id, provider_id, title, description, category, vehicle, location, service_at, capacity,
       price_cents, published, offer_active, offer_expires_at)
     VALUES (?, ?, ?, 'Ficticia', 'yacht', 'Velero', 'Palma', ?, 6, 90000, 1, 1, ?)`,
  )
    .bind(id, providerId, `Velero ${id}`, now + 86400, expiresAt)
    .run();
}

async function ask(experienceId: number, cookie: string) {
  const response = await send("POST", "/reservations", cookie, { experienceId });
  return ((await response.json()) as { id: number }).id;
}

const decide = (id: number, status: string, cookie = owner.cookie) =>
  send("PATCH", `/provider/reservations/${id}`, cookie, { status });

async function statuses() {
  const { results } = await env.DB.prepare("SELECT id, status FROM reservations ORDER BY id").all<{
    id: number;
    status: string;
  }>();
  return Object.fromEntries(results.map((row) => [row.id, row.status]));
}

beforeEach(async () => {
  now = Math.floor(Date.now() / 1000);
  await env.DB.prepare("DELETE FROM reservations").run();
  await env.DB.prepare("DELETE FROM experiences").run();
  await env.DB.prepare("DELETE FROM sessions").run();
  await env.DB.prepare("DELETE FROM users").run();
  owner = await signup("provider", "Yates Palma", "owner@example.com");
  stranger = await signup("provider", "Otro", "stranger@example.com");
  alice = (await signup("client", "Alice", "alice@example.com")).cookie;
  bob = (await signup("client", "Bob", "bob@example.com")).cookie;
  await listing(1, owner.id);
  await listing(2, stranger.id);
});

afterEach(() => {
  vi.restoreAllMocks();
});

it("lists only the requests on the provider's own listings, newest first", async () => {
  const first = await ask(1, alice);
  const second = await ask(1, bob);
  await ask(2, alice);

  const response = await send("GET", "/provider/reservations", owner.cookie);
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual([
    expect.objectContaining({ id: second, clientName: "Bob", status: "pending" }),
    {
      id: first,
      experienceId: 1,
      experienceTitle: "Velero 1",
      serviceAt: new Date((now + 86400) * 1000).toISOString(),
      price: 900,
      currency: "EUR",
      status: "pending",
      createdAt: expect.any(String),
      clientName: "Alice",
    },
  ]);
});

it("rejects a pending request and leaves the others pending", async () => {
  const first = await ask(1, alice);
  const second = await ask(1, bob);

  const response = await decide(first, "rejected");
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual(
    expect.objectContaining({ id: first, status: "rejected", clientName: "Alice" }),
  );
  expect(await statuses()).toEqual({ [first]: "rejected", [second]: "pending" });
  // The experience is still available: Alice can ask again.
  expect((await send("POST", "/reservations", alice, { experienceId: 1 })).status).toBe(201);
});

it("confirms one request, rejects the other pending ones and closes the experience", async () => {
  const first = await ask(1, alice);
  const second = await ask(1, bob);
  const elsewhere = await ask(2, alice);

  const response = await decide(second, "confirmed");
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual(
    expect.objectContaining({ id: second, status: "confirmed", clientName: "Bob" }),
  );
  expect(await statuses()).toEqual({
    [first]: "rejected",
    [second]: "confirmed",
    [elsewhere]: "pending",
  });

  const decided = await env.DB.prepare("SELECT decided_at FROM reservations WHERE id = ?")
    .bind(first)
    .first<{ decided_at: number }>();
  expect(decided?.decided_at).toBeGreaterThanOrEqual(now);
  expect((await SELF.fetch(`${base}/experiences/1`)).status).toBe(410);
});

it("does not change a request that is already resolved", async () => {
  const first = await ask(1, alice);
  const second = await ask(1, bob);
  await decide(first, "confirmed");

  for (const [id, status] of [
    [first, "rejected"],
    [second, "confirmed"],
  ] as const) {
    const response = await decide(id, status);
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: "already_resolved" });
  }
  expect(await statuses()).toEqual({ [first]: "confirmed", [second]: "rejected" });
});

it("does not confirm once the experience is no longer available, but can still reject", async () => {
  const id = await ask(1, alice);
  await env.DB.prepare("UPDATE experiences SET offer_expires_at = ? WHERE id = 1")
    .bind(now - 60)
    .run();

  const confirm = await decide(id, "confirmed");
  expect(confirm.status).toBe(409);
  expect(await confirm.json()).toEqual({ error: "not_available" });
  expect(await statuses()).toEqual({ [id]: "pending" });

  expect((await decide(id, "rejected")).status).toBe(200);
});

it("answers 403 on another provider's listing and keeps its state", async () => {
  const id = await ask(2, alice);
  const response = await decide(id, "confirmed");
  expect(response.status).toBe(403);
  expect(await response.json()).toEqual({ error: "forbidden" });
  expect(await statuses()).toEqual({ [id]: "pending" });
});

it("answers 404 for a request that does not exist", async () => {
  const response = await decide(999, "rejected");
  expect(response.status).toBe(404);
  expect(await response.json()).toEqual({ error: "not_found" });
});

it.each([["pending"], ["cancelled"], [""]])("refuses status %j with 400", async (status) => {
  const id = await ask(1, alice);
  const response = await decide(id, status);
  expect(response.status).toBe(400);
  expect(await response.json()).toEqual({ error: "invalid_status" });
  expect(await statuses()).toEqual({ [id]: "pending" });
});

it("refuses an id that is not a positive integer", async () => {
  const response = await send("PATCH", "/provider/reservations/abc", owner.cookie, {
    status: "rejected",
  });
  expect(response.status).toBe(400);
  expect(await response.json()).toEqual({ error: "invalid_id" });
});

it("asks for a provider session", async () => {
  const id = await ask(1, alice);
  expect((await send("GET", "/provider/reservations", "")).status).toBe(401);
  expect((await decide(id, "confirmed", "")).status).toBe(401);
  expect((await send("GET", "/provider/reservations", alice)).status).toBe(403);
  expect((await decide(id, "confirmed", alice)).status).toBe(403);
  expect(await statuses()).toEqual({ [id]: "pending" });
});

it("hides database errors behind internal_error", async () => {
  vi.spyOn(env.DB, "batch").mockRejectedValue(new Error("boom"));
  const id = await ask(1, alice);
  const response = await app.request(
    `/api/provider/reservations/${id}`,
    {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        origin: "http://localhost",
        cookie: owner.cookie,
      },
      body: JSON.stringify({ status: "confirmed" }),
    },
    env,
  );
  expect(response.status).toBe(500);
  expect(await response.json()).toEqual({ error: "internal_error" });
});
