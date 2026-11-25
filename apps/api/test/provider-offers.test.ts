import { env, SELF } from "cloudflare:test";
import { beforeEach, expect, it } from "vitest";

const base = "https://example.com/api";
const origin = "https://example.com";
let cookie: string;

const complete = {
  title: "Velero en Palma",
  description: "Salida de tarde con patrón",
  category: "yacht",
  vehicle: "Velero de 12 m",
  location: "Palma",
  capacity: 6,
  price: 900,
  serviceAt: "2030-06-15T18:30",
};

const flash = { type: "last_minute", price: 650.5, until: "2030-06-14T20:00" };

function send(method: string, path: string, body?: unknown, as = cookie) {
  return SELF.fetch(`${base}${path}`, {
    method,
    headers: { "content-type": "application/json", origin, cookie: as },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

async function signup(email: string) {
  const response = await SELF.fetch(`${base}/auth/signup/provider`, {
    method: "POST",
    headers: { "content-type": "application/json", origin },
    body: JSON.stringify({ name: "Demo", email, password: "secret123" }),
  });
  return (response.headers.get("set-cookie") ?? "").split(";")[0] ?? "";
}

async function draft() {
  const created = await send("POST", "/provider/experiences", complete);
  return ((await created.json()) as { id: number }).id;
}

async function published() {
  const id = await draft();
  await send("POST", `/provider/experiences/${id}/publish`);
  return id;
}

async function offers() {
  const response = await SELF.fetch(`${base}/offers`);
  return (await response.json()) as Record<string, unknown>[];
}

const expire = (id: number) =>
  env.DB.prepare("UPDATE experiences SET offer_expires_at = ? WHERE id = ?")
    .bind(Math.floor(Date.now() / 1000) - 60, id)
    .run();

beforeEach(async () => {
  await env.DB.prepare("DELETE FROM experiences").run();
  await env.DB.prepare("DELETE FROM sessions").run();
  await env.DB.prepare("DELETE FROM users").run();
  cookie = await signup("a@example.com");
});

it("shows a new flash offer in the offers section with its conditions", async () => {
  const id = await published();
  const response = await send("POST", `/provider/experiences/${id}/offer`, flash);
  expect(response.status).toBe(201);
  expect(await response.json()).toEqual({
    id,
    offerType: "last_minute",
    price: 650.5,
    originalPrice: 900,
    currency: "EUR",
    priceUnit: "experiencia completa",
    offerExpiresAt: "2030-06-14T18:00:00.000Z",
  });

  expect(await offers()).toEqual([
    expect.objectContaining({
      id,
      offerType: "last_minute",
      price: 650.5,
      originalPrice: 900,
      offerExpiresAt: "2030-06-14T18:00:00.000Z",
    }),
  ]);
  const catalog = await SELF.fetch(`${base}/experiences`);
  expect(await catalog.json()).toEqual([expect.objectContaining({ id, price: 650.5 })]);
});

it("accepts an empty-leg offer too", async () => {
  const id = await published();
  const response = await send("POST", `/provider/experiences/${id}/offer`, {
    ...flash,
    type: "empty_leg",
  });
  expect(response.status).toBe(201);
  expect(await offers()).toEqual([expect.objectContaining({ id, offerType: "empty_leg" })]);
});

it("does not show an expired offer", async () => {
  const id = await published();
  await send("POST", `/provider/experiences/${id}/offer`, flash);
  await expire(id);
  expect(await offers()).toEqual([]);
});

it("ends an offer and brings back the normal price", async () => {
  const id = await published();
  await send("POST", `/provider/experiences/${id}/offer`, flash);

  const response = await send("DELETE", `/provider/experiences/${id}/offer`);
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual(
    expect.objectContaining({ id, offerType: "standard", price: 900, originalPrice: null }),
  );
  expect(await offers()).toEqual([]);
  const catalog = await SELF.fetch(`${base}/experiences`);
  expect(await catalog.json()).toEqual([expect.objectContaining({ id, price: 900 })]);
});

it("makes a listing available again by ending its expired offer", async () => {
  const id = await published();
  await send("POST", `/provider/experiences/${id}/offer`, flash);
  await expire(id);
  const before = await SELF.fetch(`${base}/experiences`);
  expect(await before.json()).toEqual([]);

  const response = await send("DELETE", `/provider/experiences/${id}/offer`);
  expect(response.status).toBe(200);
  const after = await SELF.fetch(`${base}/experiences`);
  expect(await after.json()).toEqual([expect.objectContaining({ id, price: 900 })]);
});

it("never keeps two special prices at once", async () => {
  const id = await published();
  await send("POST", `/provider/experiences/${id}/offer`, flash);
  const second = await send("POST", `/provider/experiences/${id}/offer`, {
    type: "empty_leg",
    price: 500,
    until: "2030-06-13T10:00",
  });
  expect(second.status).toBe(409);
  expect(await second.json()).toEqual({ error: "offer_active" });
  expect(await offers()).toEqual([expect.objectContaining({ id, price: 650.5 })]);
});

it("starts a new offer from the normal price after an expired one", async () => {
  const id = await published();
  await send("POST", `/provider/experiences/${id}/offer`, flash);
  await expire(id);
  const again = await send("POST", `/provider/experiences/${id}/offer`, {
    type: "empty_leg",
    price: 700,
    until: "2030-06-13T10:00",
  });
  expect(again.status).toBe(201);
  expect(await again.json()).toEqual(
    expect.objectContaining({ price: 700, originalPrice: 900, offerType: "empty_leg" }),
  );
});

it.each([
  ["a price that is not lower", { ...flash, price: 900 }, "price_not_lower"],
  ["an end that has passed", { ...flash, until: "2020-01-01T10:00" }, "until_in_past"],
  ["an end after the service", { ...flash, until: "2030-06-16T10:00" }, "until_after_service"],
  ["an unknown type", { ...flash, type: "standard" }, "invalid_offer_type"],
  ["a price with three decimals", { ...flash, price: 10.123 }, "invalid_price"],
  ["a badly written end", { ...flash, until: "mañana" }, "invalid_until"],
])("refuses %s", async (_, body, error) => {
  const id = await published();
  const response = await send("POST", `/provider/experiences/${id}/offer`, body);
  expect(response.status).toBe(400);
  expect(await response.json()).toEqual({ error });
  expect(await offers()).toEqual([]);
});

it("does not let another provider put or end an offer", async () => {
  const id = await published();
  const other = await signup("b@example.com");
  const put = await send("POST", `/provider/experiences/${id}/offer`, flash, other);
  expect(put.status).toBe(403);
  expect(await put.json()).toEqual({ error: "forbidden" });
  expect(await offers()).toEqual([]);

  await send("POST", `/provider/experiences/${id}/offer`, flash);
  const end = await send("DELETE", `/provider/experiences/${id}/offer`, undefined, other);
  expect(end.status).toBe(403);
  expect(await offers()).toEqual([expect.objectContaining({ id })]);
});

it("only puts offers on listings people can find", async () => {
  const draftId = await draft();
  const onDraft = await send("POST", `/provider/experiences/${draftId}/offer`, flash);
  expect(onDraft.status).toBe(409);
  expect(await onDraft.json()).toEqual({ error: "not_available" });

  const id = await published();
  await env.DB.prepare("UPDATE experiences SET offer_active = 0 WHERE id = ?").bind(id).run();
  const offOffer = await send("POST", `/provider/experiences/${id}/offer`, flash);
  expect(offOffer.status).toBe(409);
  expect(await offOffer.json()).toEqual({ error: "not_available" });
});

it("answers 409 when there is no special offer to end, 404 and 400 otherwise", async () => {
  const id = await published();
  const none = await send("DELETE", `/provider/experiences/${id}/offer`);
  expect(none.status).toBe(409);
  expect(await none.json()).toEqual({ error: "no_active_offer" });

  const missing = await send("POST", "/provider/experiences/999/offer", flash);
  expect(missing.status).toBe(404);
  const invalid = await send("DELETE", "/provider/experiences/abc/offer");
  expect(invalid.status).toBe(400);
  expect(await invalid.json()).toEqual({ error: "invalid_id" });
});

it.each([
  ["running", false],
  ["expired", true],
])("does not change the price while a special offer is %s", async (_, expired) => {
  const id = await published();
  await send("POST", `/provider/experiences/${id}/offer`, flash);
  if (expired) await expire(id);
  const response = await send("PATCH", `/provider/experiences/${id}`, {
    title: "Otro título",
    price: 1000,
  });
  expect(response.status).toBe(409);
  expect(await response.json()).toEqual({ error: "offer_active" });
  const mine = await send("GET", `/provider/experiences/${id}`);
  expect(await mine.json()).toEqual(
    expect.objectContaining({ title: "Velero en Palma", price: 650.5 }),
  );
  if (!expired) {
    expect(await offers()).toEqual([
      expect.objectContaining({ id, price: 650.5, originalPrice: 900 }),
    ]);
  }
});

it("changes the price once the special offer has ended", async () => {
  const id = await published();
  await send("POST", `/provider/experiences/${id}/offer`, flash);
  await send("DELETE", `/provider/experiences/${id}/offer`);
  const response = await send("PATCH", `/provider/experiences/${id}`, { price: 1000 });
  expect(response.status).toBe(200);
  const catalog = await SELF.fetch(`${base}/experiences`);
  expect(await catalog.json()).toEqual([expect.objectContaining({ id, price: 1000 })]);
});

it("corrects the rest of a listing with a special offer without touching the offer", async () => {
  const id = await published();
  await send("POST", `/provider/experiences/${id}/offer`, flash);
  const response = await send("PATCH", `/provider/experiences/${id}`, {
    title: "Velero en la bahía",
    price: 650.5,
  });
  expect(response.status).toBe(200);
  expect(await offers()).toEqual([
    expect.objectContaining({ id, title: "Velero en la bahía", price: 650.5, originalPrice: 900 }),
  ]);
});

it("does not put offers on a withdrawn listing", async () => {
  const id = await published();
  await send("POST", `/provider/experiences/${id}/withdraw`);
  const response = await send("POST", `/provider/experiences/${id}/offer`, flash);
  expect(response.status).toBe(409);
  expect(await response.json()).toEqual({ error: "not_available" });
});

it("keeps a listing hidden when it is withdrawn during an offer and the offer ends", async () => {
  const id = await published();
  await send("POST", `/provider/experiences/${id}/offer`, flash);
  await send("POST", `/provider/experiences/${id}/withdraw`);
  expect(await offers()).toEqual([]);
  await send("DELETE", `/provider/experiences/${id}/offer`);
  expect(await offers()).toEqual([]);
  const catalog = await SELF.fetch(`${base}/experiences`);
  expect(await catalog.json()).toEqual([]);
});
