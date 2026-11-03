import { env, SELF } from "cloudflare:test";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import app from "../src/index";

const base = "https://example.com/api";
const origin = "https://example.com";

beforeEach(async () => {
  await env.DB.prepare("DELETE FROM experiences").run();
  await env.DB.prepare("DELETE FROM sessions").run();
  await env.DB.prepare("DELETE FROM users").run();
});

afterEach(() => {
  vi.restoreAllMocks();
});

function send(method: string, path: string, cookie: string, body?: unknown) {
  return SELF.fetch(`${base}${path}`, {
    method,
    headers: { "content-type": "application/json", origin, cookie },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

async function signup(email: string, role: "client" | "provider" = "provider") {
  const path = role === "provider" ? "/auth/signup/provider" : "/auth/signup";
  const response = await SELF.fetch(`${base}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", origin },
    body: JSON.stringify({ name: "Demo", email, password: "secret123" }),
  });
  return (response.headers.get("set-cookie") ?? "").split(";")[0] ?? "";
}

async function createDraft(cookie: string, body: unknown = { title: "Velero en Palma" }) {
  const response = await send("POST", "/provider/experiences", cookie, body);
  return { response, draft: (await response.json()) as { id: number } };
}

it("saves a listing with only the title as a draft", async () => {
  const cookie = await signup("a@example.com");
  const { response, draft } = await createDraft(cookie);
  expect(response.status).toBe(201);
  expect(draft).toEqual({
    id: expect.any(Number),
    title: "Velero en Palma",
    description: null,
    category: null,
    vehicle: null,
    location: null,
    capacity: null,
    status: "draft",
  });
});

it("returns the draft exactly as it was left and keeps editing it", async () => {
  const cookie = await signup("a@example.com");
  const { draft } = await createDraft(cookie, { title: "Velero", category: "yacht" });
  const edited = await send("PATCH", `/provider/experiences/${draft.id}`, cookie, {
    location: "Palma",
    capacity: 8,
  });
  expect(edited.status).toBe(200);

  const reopened = await send("GET", `/provider/experiences/${draft.id}`, cookie);
  expect(reopened.status).toBe(200);
  expect(await reopened.json()).toEqual(
    expect.objectContaining({
      title: "Velero",
      category: "yacht",
      location: "Palma",
      capacity: 8,
      status: "draft",
    }),
  );
});

it("lists only the provider's own listings", async () => {
  const a = await signup("a@example.com");
  const b = await signup("b@example.com");
  await createDraft(a, { title: "De A" });
  await createDraft(b, { title: "De B" });
  const response = await send("GET", "/provider/experiences", a);
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual([expect.objectContaining({ title: "De A" })]);
});

it("keeps drafts out of the public catalog and detail", async () => {
  const cookie = await signup("a@example.com");
  const { draft } = await createDraft(cookie);
  const catalog = await SELF.fetch(`${base}/experiences`);
  expect(await catalog.json()).toEqual([]);
  const detail = await SELF.fetch(`${base}/experiences/${draft.id}`);
  expect(detail.status).toBe(404);
});

it("does not let another provider see or change the draft", async () => {
  const a = await signup("a@example.com");
  const b = await signup("b@example.com");
  const { draft } = await createDraft(a);

  expect((await send("GET", `/provider/experiences/${draft.id}`, b)).status).toBe(403);
  const patch = await send("PATCH", `/provider/experiences/${draft.id}`, b, { title: "Mío" });
  expect(patch.status).toBe(403);
  expect(await patch.json()).toEqual({ error: "forbidden" });

  const unchanged = await send("GET", `/provider/experiences/${draft.id}`, a);
  expect(await unchanged.json()).toEqual(expect.objectContaining({ title: "Velero en Palma" }));
});

it("rejects clients and visitors", async () => {
  const client = await signup("c@example.com", "client");
  expect((await send("POST", "/provider/experiences", client, { title: "X" })).status).toBe(403);
  expect((await send("GET", "/provider/experiences", "")).status).toBe(401);
});

it.each([
  [{}, "invalid_title"],
  [{ title: "   " }, "invalid_title"],
  [{ title: "X", category: "boat" }, "invalid_category"],
  [{ title: "X", capacity: 0 }, "invalid_capacity"],
  [{ title: "X", capacity: 2.5 }, "invalid_capacity"],
])("rejects an invalid draft %j", async (body, error) => {
  const cookie = await signup("a@example.com");
  const response = await send("POST", "/provider/experiences", cookie, body);
  expect(response.status).toBe(400);
  expect(await response.json()).toEqual({ error });
});

it("does not let the title be emptied when editing", async () => {
  const cookie = await signup("a@example.com");
  const { draft } = await createDraft(cookie);
  const response = await send("PATCH", `/provider/experiences/${draft.id}`, cookie, {
    title: "",
  });
  expect(response.status).toBe(400);
  expect(await response.json()).toEqual({ error: "invalid_title" });
});

it.each([
  ["999", 404, "not_found"],
  ["abc", 400, "invalid_id"],
])("answers %s with %i", async (id, status, error) => {
  const cookie = await signup("a@example.com");
  const response = await send("GET", `/provider/experiences/${id}`, cookie);
  expect(response.status).toBe(status);
  expect(await response.json()).toEqual({ error });
});

it("does not edit a listing that is already published", async () => {
  const cookie = await signup("a@example.com");
  const { draft } = await createDraft(cookie, {
    title: "Velero",
    description: "Salida de tarde",
    category: "yacht",
    vehicle: "Velero de 12 m",
    location: "Palma",
    capacity: 6,
  });
  await env.DB.prepare(
    `UPDATE experiences SET service_at = ?, price_cents = ?, offer_expires_at = ?, published = 1
     WHERE id = ?`,
  )
    .bind(2000000000, 100000, 2000000000, draft.id)
    .run();
  const response = await send("PATCH", `/provider/experiences/${draft.id}`, cookie, {
    title: "Otro",
  });
  expect(response.status).toBe(409);
  expect(await response.json()).toEqual({ error: "already_published" });
});

it("never stores a published listing with missing fields", async () => {
  await expect(
    env.DB.prepare("INSERT INTO experiences (title, published) VALUES ('Incompleto', 1)").run(),
  ).rejects.toThrow();
});

it("returns a JSON error without database details", async () => {
  const cookie = await signup("a@example.com");
  const prepare = env.DB.prepare.bind(env.DB);
  vi.spyOn(env.DB, "prepare").mockImplementation((sql: string) => {
    if (sql.includes("INSERT INTO experiences")) throw new Error("private database details");
    return prepare(sql);
  });
  const response = await app.request(
    `${base}/provider/experiences`,
    {
      method: "POST",
      headers: { "content-type": "application/json", origin, cookie },
      body: JSON.stringify({ title: "X" }),
    },
    env,
  );
  expect(response.status).toBe(500);
  expect(await response.json()).toEqual({ error: "internal_error" });
});
