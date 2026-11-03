import { env, SELF } from "cloudflare:test";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import app from "../src/index";

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

async function draft(body: object = complete) {
  const response = await send("POST", "/provider/experiences", body);
  return ((await response.json()) as { id: number }).id;
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

afterEach(() => {
  vi.restoreAllMocks();
});

it("publishes a complete draft at its normal price and shows it in the catalog", async () => {
  const id = await draft();
  const response = await send("POST", `/provider/experiences/${id}/publish`);
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual(
    expect.objectContaining({ id, status: "published", price: 900 }),
  );

  expect(await catalogIds()).toEqual([id]);
  const detail = await SELF.fetch(`${base}/experiences/${id}`);
  expect(detail.status).toBe(200);
  expect(await detail.json()).toEqual(
    expect.objectContaining({ offerType: "standard", price: 900, location: "Palma" }),
  );
});

it.each([
  ["without price", { ...complete, price: undefined }, ["price"]],
  ["without service date", { ...complete, serviceAt: undefined }, ["serviceAt"]],
  [
    "without price or date",
    { ...complete, price: undefined, serviceAt: undefined },
    ["price", "serviceAt"],
  ],
  [
    "with only the title",
    { title: "Velero" },
    ["price", "serviceAt", "description", "category", "vehicle", "location", "capacity"],
  ],
])("says what is missing %s and keeps it hidden", async (_, body, fields) => {
  const id = await draft(body);
  const response = await send("POST", `/provider/experiences/${id}/publish`);
  expect(response.status).toBe(400);
  expect(await response.json()).toEqual({ error: "missing_fields", fields });
  expect(await catalogIds()).toEqual([]);
  const mine = await send("GET", `/provider/experiences/${id}`);
  expect(await mine.json()).toEqual(expect.objectContaining({ status: "draft" }));
});

it("does not publish a draft whose service date has passed", async () => {
  const id = await draft();
  await env.DB.prepare("UPDATE experiences SET service_at = ? WHERE id = ?")
    .bind(Math.floor(Date.now() / 1000) - 60, id)
    .run();
  const response = await send("POST", `/provider/experiences/${id}/publish`);
  expect(response.status).toBe(400);
  expect(await response.json()).toEqual({ error: "service_at_in_past" });
  expect(await catalogIds()).toEqual([]);
});

it("does not let another provider publish the draft", async () => {
  const id = await draft();
  const other = await signup("b@example.com");
  const response = await send("POST", `/provider/experiences/${id}/publish`, undefined, other);
  expect(response.status).toBe(403);
  expect(await response.json()).toEqual({ error: "forbidden" });
  const mine = await send("GET", `/provider/experiences/${id}`);
  expect(await mine.json()).toEqual(expect.objectContaining({ status: "draft" }));
  expect(await catalogIds()).toEqual([]);
});

it("does not publish the same listing twice", async () => {
  const id = await draft();
  await send("POST", `/provider/experiences/${id}/publish`);
  const again = await send("POST", `/provider/experiences/${id}/publish`);
  expect(again.status).toBe(409);
  expect(await again.json()).toEqual({ error: "already_published" });
});

it.each([
  ["999", 404, "not_found"],
  ["abc", 400, "invalid_id"],
])("answers id %s with %i", async (id, status, error) => {
  const response = await send("POST", `/provider/experiences/${id}/publish`);
  expect(response.status).toBe(status);
  expect(await response.json()).toEqual({ error });
});

it("requires a provider session and the own origin", async () => {
  const id = await draft();
  expect((await send("POST", `/provider/experiences/${id}/publish`, undefined, "")).status).toBe(
    401,
  );
  const foreign = await SELF.fetch(`${base}/provider/experiences/${id}/publish`, {
    method: "POST",
    headers: { origin: "https://evil.example", cookie },
  });
  expect(foreign.status).toBe(403);
  expect(await foreign.json()).toEqual({ error: "invalid_origin" });
});

it("returns a JSON error without database details", async () => {
  const id = await draft();
  const prepare = env.DB.prepare.bind(env.DB);
  vi.spyOn(env.DB, "prepare").mockImplementation((sql: string) => {
    if (sql.includes("SET published = 1")) throw new Error("private database details");
    return prepare(sql);
  });
  const response = await app.request(
    `${base}/provider/experiences/${id}/publish`,
    { method: "POST", headers: { origin, cookie } },
    env,
  );
  expect(response.status).toBe(500);
  expect(await response.json()).toEqual({ error: "internal_error" });
});
