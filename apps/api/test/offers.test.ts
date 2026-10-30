import { env, SELF } from "cloudflare:test";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import app from "../src/index";

const url = "https://example.com/api/offers";
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
  type = "last_minute",
  price = 480000,
  original = 690000 as number | null,
  published = 1,
  active = 1,
  serviceAt = now + 86400,
  expiresAt = now + 3600,
} = {}) {
  await env.DB.prepare(
    `INSERT INTO experiences
      (id, title, description, category, vehicle, location, service_at, capacity,
       price_cents, original_price_cents, published, offer_active, offer_expires_at, offer_type)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      id,
      "Demo flight",
      "Fictitious",
      "jet",
      "Demo vehicle",
      "Valencia → Ibiza",
      serviceAt,
      7,
      price,
      original,
      published,
      active,
      expiresAt,
      type,
    )
    .run();
}

it("lists an active offer with original and discounted price", async () => {
  await insert();
  const response = await SELF.fetch(url);
  expect(response.status).toBe(200);
  expect(response.headers.get("content-type")).toContain("application/json");
  expect(await response.json()).toEqual([
    {
      id: 1,
      title: "Demo flight",
      category: "jet",
      location: "Valencia → Ibiza",
      serviceAt: new Date((now + 86400) * 1000).toISOString(),
      price: 4800,
      originalPrice: 6900,
      currency: "EUR",
      priceUnit: "experiencia completa",
      offerType: "last_minute",
      offerExpiresAt: new Date((now + 3600) * 1000).toISOString(),
    },
  ]);
});

it("includes flash and empty-leg offers, soonest to expire first", async () => {
  await insert({ id: 1, type: "empty_leg", expiresAt: now + 7200 });
  await insert({ id: 2, type: "last_minute", expiresAt: now + 3600 });
  const response = await SELF.fetch(url);
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual([
    expect.objectContaining({ id: 2, offerType: "last_minute" }),
    expect.objectContaining({ id: 1, offerType: "empty_leg" }),
  ]);
});

it.each([
  { type: "standard" },
  { expiresAt: 1 },
  { serviceAt: 1 },
  { published: 0 },
  { active: 0 },
  { original: null },
  { original: 480000 },
])("excludes experiences without an active offer: %j", async (overrides) => {
  await insert({ id: 1, ...overrides });
  await insert({ id: 2 });
  const response = await SELF.fetch(url);
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual([expect.objectContaining({ id: 2 })]);
});

it("excludes an offer at its exact expiry instant", async () => {
  vi.spyOn(Date, "now").mockReturnValue(now * 1000);
  await insert({ expiresAt: now });
  const response = await app.request(url, {}, env);
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual([]);
});

it("returns an empty array when there are no active offers", async () => {
  await insert({ type: "standard", original: null });
  const response = await SELF.fetch(url);
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual([]);
});

it("returns a JSON error without database details", async () => {
  vi.spyOn(env.DB, "prepare").mockImplementation(() => {
    throw new Error("private database details");
  });
  const response = await app.request(url, {}, env);
  expect(response.status).toBe(500);
  expect(await response.json()).toEqual({ error: "internal_error" });
});
