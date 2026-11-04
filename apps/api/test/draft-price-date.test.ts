import { env, SELF } from "cloudflare:test";
import { beforeEach, expect, it } from "vitest";
import { madridLocalToUnix } from "../src/madrid-time";

const base = "https://example.com/api";
const origin = "https://example.com";
let cookie: string;
let draftId: number;

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

beforeEach(async () => {
  await env.DB.prepare("DELETE FROM experiences").run();
  await env.DB.prepare("DELETE FROM sessions").run();
  await env.DB.prepare("DELETE FROM users").run();
  cookie = await signup("a@example.com");
  const created = await send("POST", "/provider/experiences", { title: "Velero" });
  draftId = ((await created.json()) as { id: number }).id;
});

it("saves a price in EUR and a future service date in the draft", async () => {
  const response = await send("PATCH", `/provider/experiences/${draftId}`, {
    price: 1250.5,
    serviceAt: "2030-06-15T18:30",
  });
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual(
    expect.objectContaining({
      price: 1250.5,
      currency: "EUR",
      priceUnit: "experiencia completa",
      serviceAt: "2030-06-15T16:30:00.000Z", // 18:30 in Madrid summer time
      status: "draft",
    }),
  );
  const reopened = await send("GET", `/provider/experiences/${draftId}`);
  expect(await reopened.json()).toEqual(
    expect.objectContaining({ price: 1250.5, serviceAt: "2030-06-15T16:30:00.000Z" }),
  );
  const row = await env.DB.prepare("SELECT price_cents FROM experiences WHERE id = ?")
    .bind(draftId)
    .first();
  expect(row).toEqual({ price_cents: 125050 });
});

it("accepts price and date when the draft is created", async () => {
  const response = await send("POST", "/provider/experiences", {
    title: "Jet",
    price: 0,
    serviceAt: "2030-01-15T09:00",
  });
  expect(response.status).toBe(201);
  expect(await response.json()).toEqual(
    expect.objectContaining({ price: 0, serviceAt: "2030-01-15T08:00:00.000Z" }),
  );
});

it.each([
  ["a negative price", { price: -1 }, "invalid_price"],
  ["more than two decimals", { price: 10.555 }, "invalid_price"],
  ["a price as text", { price: "100" }, "invalid_price"],
  ["a past service date", { serviceAt: "2020-01-01T10:00" }, "service_at_in_past"],
  ["a malformed date", { serviceAt: "15/06/2030 18:30" }, "invalid_service_at"],
  ["an impossible date", { serviceAt: "2030-02-30T10:00" }, "invalid_service_at"],
  ["an impossible hour", { serviceAt: "2030-06-15T25:00" }, "invalid_service_at"],
])("rejects %s and saves nothing", async (_, body, error) => {
  await send("PATCH", `/provider/experiences/${draftId}`, {
    price: 100,
    serviceAt: "2030-06-15T18:30",
  });
  const response = await send("PATCH", `/provider/experiences/${draftId}`, {
    ...body,
    title: "No debe cambiar",
  });
  expect(response.status).toBe(400);
  expect(await response.json()).toEqual({ error });
  const reopened = await send("GET", `/provider/experiences/${draftId}`);
  expect(await reopened.json()).toEqual(
    expect.objectContaining({
      title: "Velero",
      price: 100,
      serviceAt: "2030-06-15T16:30:00.000Z",
    }),
  );
});

it("rejects a past date when the draft is created", async () => {
  const response = await send("POST", "/provider/experiences", {
    title: "Jet",
    serviceAt: "2020-01-01T10:00",
  });
  expect(response.status).toBe(400);
  expect(await response.json()).toEqual({ error: "service_at_in_past" });
  const { results } = await env.DB.prepare("SELECT id FROM experiences").all();
  expect(results).toHaveLength(1);
});

it("does not let another provider set the price", async () => {
  const other = await signup("b@example.com");
  const response = await send("PATCH", `/provider/experiences/${draftId}`, { price: 1 }, other);
  expect(response.status).toBe(403);
});

it.each([
  ["2030-03-31T01:30", "2030-03-31T00:30:00.000Z"], // before the spring change (UTC+1)
  ["2030-03-31T03:30", "2030-03-31T01:30:00.000Z"], // after it (UTC+2)
  ["2030-10-27T04:00", "2030-10-27T03:00:00.000Z"], // after the autumn change (UTC+1)
])("reads %s as Madrid time", (local, iso) => {
  expect(new Date(madridLocalToUnix(local) * 1000).toISOString()).toBe(iso);
});
