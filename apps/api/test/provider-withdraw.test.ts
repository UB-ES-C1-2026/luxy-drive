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
  const response = await send("POST", "/provider/experiences", complete);
  return ((await response.json()) as { id: number }).id;
}

async function published() {
  const id = await draft();
  await send("POST", `/provider/experiences/${id}/publish`);
  return id;
}

async function catalogIds() {
  const response = await SELF.fetch(`${base}/experiences`);
  return ((await response.json()) as { id: number }[]).map((experience) => experience.id);
}

beforeEach(async () => {
  await env.DB.prepare("DELETE FROM experiences").run();
  await env.DB.prepare("DELETE FROM sessions").run();
  await env.DB.prepare("DELETE FROM users").run();
  cookie = await signup("a@example.com");
});

it("withdraws an own published listing from the catalog and the detail", async () => {
  const id = await published();
  expect(await catalogIds()).toEqual([id]);

  const response = await send("POST", `/provider/experiences/${id}/withdraw`);
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual(expect.objectContaining({ id, status: "withdrawn" }));

  expect(await catalogIds()).toEqual([]);
  const detail = await SELF.fetch(`${base}/experiences/${id}`);
  expect(detail.status).toBe(410);
  expect(await detail.json()).toEqual({ error: "not_available" });
});

it("shows the withdrawn listing to its provider with its new status", async () => {
  const id = await published();
  await send("POST", `/provider/experiences/${id}/withdraw`);

  const mine = await send("GET", "/provider/experiences");
  expect(await mine.json()).toEqual([expect.objectContaining({ id, status: "withdrawn" })]);
  const one = await send("GET", `/provider/experiences/${id}`);
  expect(await one.json()).toEqual(expect.objectContaining({ id, status: "withdrawn" }));
});

it("takes a withdrawn listing with a special offer out of the offers", async () => {
  const id = await published();
  await env.DB.prepare(
    `UPDATE experiences
     SET offer_type = 'last_minute', original_price_cents = 120000, price_cents = 90000
     WHERE id = ?`,
  )
    .bind(id)
    .run();
  const before = await SELF.fetch(`${base}/offers`);
  expect(((await before.json()) as { id: number }[]).map((offer) => offer.id)).toEqual([id]);

  await send("POST", `/provider/experiences/${id}/withdraw`);
  const after = await SELF.fetch(`${base}/offers`);
  expect(await after.json()).toEqual([]);
});

it("does not let another provider withdraw the listing", async () => {
  const id = await published();
  const other = await signup("b@example.com");
  const response = await send("POST", `/provider/experiences/${id}/withdraw`, undefined, other);
  expect(response.status).toBe(403);
  expect(await response.json()).toEqual({ error: "forbidden" });
  expect(await catalogIds()).toEqual([id]);
});

it("does not withdraw a draft or the same listing twice", async () => {
  const draftId = await draft();
  const notPublished = await send("POST", `/provider/experiences/${draftId}/withdraw`);
  expect(notPublished.status).toBe(409);
  expect(await notPublished.json()).toEqual({ error: "not_published" });

  const id = await published();
  await send("POST", `/provider/experiences/${id}/withdraw`);
  const again = await send("POST", `/provider/experiences/${id}/withdraw`);
  expect(again.status).toBe(409);
  expect(await again.json()).toEqual({ error: "already_withdrawn" });
});

it("answers 404 for a listing that does not exist and 400 for an invalid id", async () => {
  const missing = await send("POST", "/provider/experiences/999/withdraw");
  expect(missing.status).toBe(404);
  expect(await missing.json()).toEqual({ error: "not_found" });

  const invalid = await send("POST", "/provider/experiences/abc/withdraw");
  expect(invalid.status).toBe(400);
  expect(await invalid.json()).toEqual({ error: "invalid_id" });
});

it("only lets providers withdraw listings", async () => {
  const id = await published();
  const anonymous = await send("POST", `/provider/experiences/${id}/withdraw`, undefined, "");
  expect(anonymous.status).toBe(401);
  expect(await catalogIds()).toEqual([id]);
});
