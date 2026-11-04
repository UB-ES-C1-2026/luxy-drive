import { env, SELF } from "cloudflare:test";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import app from "../src/index";

const url = (id: string | number) => `https://example.com/api/experiences/${id}`;
let now: number;

beforeEach(async () => {
  now = Math.floor(Date.now() / 1000);
  await env.DB.prepare("DELETE FROM experiences").run();
});

afterEach(() => {
  vi.restoreAllMocks();
});

async function insert({
  id = 1,
  published = 1,
  active = 1,
  serviceAt = now + 86400,
  expiresAt = now + 3600,
} = {}) {
  await env.DB.prepare(
    `INSERT INTO experiences
      (id, title, description, category, vehicle, location, service_at, capacity,
       price_cents, published, offer_active, offer_expires_at, offer_type)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      id,
      "Demo cruise",
      "Fictitious sailing day",
      "yacht",
      "Demo yacht",
      "Palma",
      serviceAt,
      8,
      650000,
      published,
      active,
      expiresAt,
      "last_minute",
    )
    .run();
}

it("returns the detail of an available experience", async () => {
  await insert({ id: 7 });
  const response = await SELF.fetch(url(7));
  expect(response.status).toBe(200);
  expect(response.headers.get("content-type")).toContain("application/json");
  expect(await response.json()).toEqual({
    id: 7,
    title: "Demo cruise",
    category: "yacht",
    location: "Palma",
    serviceAt: new Date((now + 86400) * 1000).toISOString(),
    price: 6500,
    currency: "EUR",
    priceUnit: "experiencia completa",
    offerType: "last_minute",
    description: "Fictitious sailing day",
    vehicle: "Demo yacht",
    capacity: 8,
  });
});

it("returns 404 when the experience does not exist", async () => {
  await insert({ id: 1 });
  const response = await SELF.fetch(url(2));
  expect(response.status).toBe(404);
  expect(await response.json()).toEqual({ error: "not_found" });
});

it("returns 404 for an unpublished experience", async () => {
  await insert({ published: 0 });
  const response = await SELF.fetch(url(1));
  expect(response.status).toBe(404);
  expect(await response.json()).toEqual({ error: "not_found" });
});

it.each([{ active: 0 }, { expiresAt: 1 }, { serviceAt: 1, expiresAt: 1 }])(
  "returns 410 when the experience is no longer available: %j",
  async (overrides) => {
    await insert(overrides);
    const response = await SELF.fetch(url(1));
    expect(response.status).toBe(410);
    expect(await response.json()).toEqual({ error: "not_available" });
  },
);

it.each(["serviceAt", "expiresAt"] as const)(
  "returns 410 at the exact %s boundary",
  async (field) => {
    vi.spyOn(Date, "now").mockReturnValue(now * 1000);
    await insert({ [field]: now });
    const response = await app.request(url(1), {}, env);
    expect(response.status).toBe(410);
    expect(await response.json()).toEqual({ error: "not_available" });
  },
);

it.each(["abc", "0", "-1", "1.5", "01", "1e3", "12345678901234567"])(
  "returns 400 for the invalid id %s",
  async (id) => {
    const response = await SELF.fetch(url(id));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "invalid_id" });
  },
);

it("returns a JSON error without database details", async () => {
  vi.spyOn(env.DB, "prepare").mockImplementation(() => {
    throw new Error("private database details");
  });
  const response = await app.request(url(1), {}, env);
  expect(response.status).toBe(500);
  expect(await response.json()).toEqual({ error: "internal_error" });
});
