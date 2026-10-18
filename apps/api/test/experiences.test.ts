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
      "Madrid → Palma",
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

it("returns a JSON error without database details", async () => {
  vi.spyOn(env.DB, "prepare").mockImplementation(() => {
    throw new Error("private database details");
  });
  const response = await app.request(url, {}, env);
  expect(response.status).toBe(500);
  expect(await response.json()).toEqual({ error: "internal_error" });
});
