import { env, SELF } from "cloudflare:test";
import { beforeEach, expect, it } from "vitest";

const base = "https://example.com/api";
const origin = "https://example.com";

function call(method: string, path: string, cookie: string, body?: unknown) {
  return SELF.fetch(`${base}${path}`, {
    method,
    headers: { "content-type": "application/json", origin, cookie },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

async function account(email: string, path = "/auth/signup/provider") {
  const response = await SELF.fetch(`${base}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", origin },
    body: JSON.stringify({ name: "Demo", email, password: "secret123" }),
  });
  return (response.headers.get("set-cookie") ?? "").split(";")[0] ?? "";
}

const profile = {
  tradeName: "Demo Yachts",
  description: "Yates de demo en Barcelona",
  phone: "+34 612 345 678",
};

let owner: string;

beforeEach(async () => {
  await env.DB.prepare("DELETE FROM provider_profiles").run();
  await env.DB.prepare("DELETE FROM sessions").run();
  await env.DB.prepare("DELETE FROM users").run();
  owner = await account("owner@example.com");
});

it("creates the profile with trade name, description and contact", async () => {
  const response = await call("POST", "/provider/profile", owner, profile);
  expect(response.status).toBe(201);
  const created = await response.json();
  expect(created).toEqual({ id: expect.any(Number), ...profile });
  const mine = await call("GET", "/provider/profile", owner);
  expect(mine.status).toBe(200);
  expect(await mine.json()).toEqual(created);
});

it("responds 404 when the provider has no profile yet", async () => {
  const response = await call("GET", "/provider/profile", owner);
  expect(response.status).toBe(404);
  expect(await response.json()).toEqual({ error: "not_found" });
});

it("responds 409 to a second profile for the same provider", async () => {
  await call("POST", "/provider/profile", owner, profile);
  const response = await call("POST", "/provider/profile", owner, profile);
  expect(response.status).toBe(409);
  expect(await response.json()).toEqual({ error: "profile_exists" });
});

it("editing one field changes it in the profile", async () => {
  const { id } = await (await call("POST", "/provider/profile", owner, profile)).json<{
    id: number;
  }>();
  const response = await call("PATCH", `/provider/profile/${id}`, owner, { phone: "612 000 111" });
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ id, ...profile, phone: "612 000 111" });
  expect(await (await call("GET", "/provider/profile", owner)).json()).toMatchObject({
    phone: "612 000 111",
  });
});

it.each([
  ["tradeName", "invalid_trade_name"],
  ["description", "invalid_description"],
  ["phone", "invalid_phone"],
] as const)("an empty %s responds 400 and nothing is saved", async (field, error) => {
  const created = await call("POST", "/provider/profile", owner, { ...profile, [field]: " " });
  expect(created.status).toBe(400);
  expect(await created.json()).toEqual({ error });
  expect((await call("GET", "/provider/profile", owner)).status).toBe(404);

  const { id } = await (await call("POST", "/provider/profile", owner, profile)).json<{
    id: number;
  }>();
  const edited = await call("PATCH", `/provider/profile/${id}`, owner, { [field]: "" });
  expect(edited.status).toBe(400);
  expect(await edited.json()).toEqual({ error });
  expect(await (await call("GET", "/provider/profile", owner)).json()).toEqual({ id, ...profile });
});

it("a provider cannot edit another provider's profile (403) and it does not change", async () => {
  const { id } = await (await call("POST", "/provider/profile", owner, profile)).json<{
    id: number;
  }>();
  const intruder = await account("intruder@example.com");
  const response = await call("PATCH", `/provider/profile/${id}`, intruder, {
    tradeName: "Hacked",
  });
  expect(response.status).toBe(403);
  expect(await response.json()).toEqual({ error: "forbidden" });
  expect(await (await call("GET", "/provider/profile", owner)).json()).toEqual({ id, ...profile });
});

it("responds 404 when editing a profile that does not exist", async () => {
  const response = await call("PATCH", "/provider/profile/999", owner, { tradeName: "X" });
  expect(response.status).toBe(404);
});

it("a client account cannot create a profile (403)", async () => {
  const client = await account("client@example.com", "/auth/signup");
  const response = await call("POST", "/provider/profile", client, profile);
  expect(response.status).toBe(403);
});
