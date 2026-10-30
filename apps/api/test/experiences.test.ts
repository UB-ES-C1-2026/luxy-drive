import { env, SELF } from "cloudflare:test";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import app from "../src/index";

const url = "https://example.com/api/experiences";
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
  category = "jet",
  location = "Madrid → Palma",
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
      "Demo flight",
      "Fictitious",
      category,
      "Demo vehicle",
      location,
      serviceAt,
      6,
      125050,
      published,
      active,
      expiresAt,
      "empty_leg",
    )
    .run();
}

it("lists available experiences with the catalog contract", async () => {
  await insert();
  const response = await SELF.fetch(url);
  expect(response.status).toBe(200);
  expect(response.headers.get("content-type")).toContain("application/json");
  expect(await response.json()).toEqual([
    {
      id: 1,
      title: "Demo flight",
      category: "jet",
      location: "Madrid → Palma",
      serviceAt: new Date((now + 86400) * 1000).toISOString(),
      price: 1250.5,
      currency: "EUR",
      priceUnit: "experiencia completa",
      offerType: "empty_leg",
    },
  ]);
});

it.each([{ published: 0 }, { active: 0 }, { expiresAt: 1 }, { serviceAt: 1 }])(
  "excludes unavailable experiences: %j",
  async (overrides) => {
    await insert(overrides);
    await insert({ id: 2 });
    const response = await SELF.fetch(url);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([expect.objectContaining({ id: 2 })]);
  },
);

it.each(["serviceAt", "expiresAt"] as const)("excludes the exact %s boundary", async (field) => {
  vi.spyOn(Date, "now").mockReturnValue(now * 1000);
  await insert({ [field]: now });
  const response = await app.request(url, {}, env);
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual([]);
});

it("returns an empty array when the catalog is empty", async () => {
  const response = await SELF.fetch(url);
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual([]);
});

it("orders all categories by service date and then id", async () => {
  await insert({ id: 3, category: "camper", serviceAt: now + 10000 });
  await insert({ id: 2, category: "yacht", serviceAt: now + 5000 });
  await insert({ id: 1, serviceAt: now + 5000 });
  const response = await SELF.fetch(url);
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual([
    expect.objectContaining({ id: 1, category: "jet" }),
    expect.objectContaining({ id: 2, category: "yacht" }),
    expect.objectContaining({ id: 3, category: "camper" }),
  ]);
});

it.each(["jet", "yacht", "camper"] as const)("filters by category=%s", async (category) => {
  await insert({ id: 1, category: "jet" });
  await insert({ id: 2, category: "yacht" });
  await insert({ id: 3, category: "camper" });
  const response = await SELF.fetch(`${url}?category=${category}`);
  expect(response.status).toBe(200);
  const body = (await response.json()) as { category: string }[];
  expect(body).toHaveLength(1);
  expect(body[0]).toEqual(expect.objectContaining({ category }));
});

it("filters by category and still excludes unavailable experiences", async () => {
  await insert({ id: 1, category: "yacht", published: 0 });
  await insert({ id: 2, category: "yacht", expiresAt: 1 });
  await insert({ id: 3, category: "yacht" });
  await insert({ id: 4, category: "jet" });
  const response = await SELF.fetch(`${url}?category=yacht`);
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual([expect.objectContaining({ id: 3 })]);
});

it("returns an empty array when no experience matches the category", async () => {
  await insert({ category: "jet" });
  const response = await SELF.fetch(`${url}?category=camper`);
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual([]);
});

it.each(["boat", "JET", ""])("rejects an invalid category: %j", async (category) => {
  await insert();
  const response = await SELF.fetch(`${url}?category=${category}`);
  expect(response.status).toBe(400);
  expect(await response.json()).toEqual({ error: "invalid_category" });
});

it.each(["malaga", "Málaga", "MÁLAGA", "  malaga  "])(
  "filters by location ignoring case and accents: %j",
  async (location) => {
    await insert({ id: 1, location: "Málaga" });
    await insert({ id: 2, location: "Madrid" });
    const response = await SELF.fetch(`${url}?location=${encodeURIComponent(location)}`);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([expect.objectContaining({ id: 1, location: "Málaga" })]);
  },
);

it("matches a city inside a route", async () => {
  await insert({ id: 1, location: "Madrid → Palma" });
  await insert({ id: 2, location: "Ibiza" });
  const response = await SELF.fetch(`${url}?location=palma`);
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual([expect.objectContaining({ id: 1 })]);
});

it("combines location and category filters", async () => {
  await insert({ id: 1, category: "yacht", location: "Ibiza" });
  await insert({ id: 2, category: "jet", location: "Valencia → Ibiza" });
  await insert({ id: 3, category: "yacht", location: "Palma" });
  const response = await SELF.fetch(`${url}?location=ibiza&category=yacht`);
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual([expect.objectContaining({ id: 1 })]);
});

it("returns an empty array when no experience matches the location", async () => {
  await insert({ location: "Madrid" });
  const response = await SELF.fetch(`${url}?location=Oviedo`);
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual([]);
});

it.each(["", "   ", "x".repeat(101)])("rejects an invalid location: %j", async (location) => {
  const response = await SELF.fetch(`${url}?location=${location}`);
  expect(response.status).toBe(400);
  expect(await response.json()).toEqual({ error: "invalid_location" });
});

it("returns a JSON error without database details", async () => {
  vi.spyOn(env.DB, "prepare").mockImplementation(() => {
    throw new Error("private database details");
  });
  const response = await app.request(url, {}, env);
  expect(response.status).toBe(500);
  expect(await response.json()).toEqual({ error: "internal_error" });
});
