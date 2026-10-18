import { env } from "cloudflare:test";
import { beforeEach, expect, it } from "vitest";

beforeEach(async () => {
  await env.DB.prepare("DELETE FROM experiences").run();
});

function insert(category: string, capacity: number, price: number, published = 0, active = 0) {
  return env.DB.prepare(
    `INSERT INTO experiences
      (title, description, category, vehicle, location, service_at, capacity,
       price_cents, published, offer_active, offer_expires_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      "Demo",
      "Fictitious experience",
      category,
      "Demo vehicle",
      "Madrid",
      2000000000,
      capacity,
      price,
      published,
      active,
      1999990000,
    )
    .run();
}

it.each(["jet", "yacht", "camper"])(
  "stores a %s experience with safe defaults",
  async (category) => {
    await insert(category, 4, 12345);
    const row = await env.DB.prepare("SELECT * FROM experiences").first();
    expect(row).toMatchObject({
      category,
      capacity: 4,
      price_cents: 12345,
      published: 0,
      offer_active: 0,
      offer_type: "standard",
    });
  },
);

it.each([
  ["car", 4, 100, 0, 0],
  ["jet", 0, 100, 0, 0],
  ["jet", 1.5, 100, 0, 0],
  ["jet", 4, -1, 0, 0],
  ["jet", 4, 1.5, 0, 0],
  ["jet", 4, 100, 2, 0],
  ["jet", 4, 100, 0, 2],
] as const)(
  "rejects invalid domain values (%s, %s, %s, %s, %s)",
  async (category, capacity, price, published, active) => {
    await expect(insert(category, capacity, price, published, active)).rejects.toThrow();
  },
);

it("allows an empty-leg offer and rejects unknown offer types", async () => {
  await insert("jet", 4, 100);
  await env.DB.prepare("UPDATE experiences SET offer_type = ?").bind("empty_leg").run();
  expect(await env.DB.prepare("SELECT offer_type FROM experiences").first()).toEqual({
    offer_type: "empty_leg",
  });
  await expect(
    env.DB.prepare("UPDATE experiences SET offer_type = ?").bind("unknown").run(),
  ).rejects.toThrow();
});
