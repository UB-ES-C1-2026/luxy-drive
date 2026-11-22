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

async function published() {
  const created = await send("POST", "/provider/experiences", complete);
  const { id } = (await created.json()) as { id: number };
  await send("POST", `/provider/experiences/${id}/publish`);
  return id;
}

async function detail(id: number) {
  const response = await SELF.fetch(`${base}/experiences/${id}`);
  return { status: response.status, body: (await response.json()) as Record<string, unknown> };
}

async function offerEnd(id: number) {
  const row = await env.DB.prepare(
    "SELECT service_at, offer_expires_at FROM experiences WHERE id = ?",
  )
    .bind(id)
    .first<{ service_at: number; offer_expires_at: number }>();
  return row;
}

beforeEach(async () => {
  await env.DB.prepare("DELETE FROM experiences").run();
  await env.DB.prepare("DELETE FROM sessions").run();
  await env.DB.prepare("DELETE FROM users").run();
  cookie = await signup("a@example.com");
});

it("shows the corrected data of a published listing in the catalog and the detail", async () => {
  const id = await published();
  const response = await send("PATCH", `/provider/experiences/${id}`, {
    title: "Velero en la bahía de Palma",
    location: "Palma → Cabrera",
    price: 1200.5,
  });
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual(
    expect.objectContaining({ id, status: "published", location: "Palma → Cabrera" }),
  );

  const catalog = await SELF.fetch(`${base}/experiences`);
  expect(await catalog.json()).toEqual([
    expect.objectContaining({ id, title: "Velero en la bahía de Palma", price: 1200.5 }),
  ]);
  const { status, body } = await detail(id);
  expect(status).toBe(200);
  expect(body).toEqual(expect.objectContaining({ location: "Palma → Cabrera", price: 1200.5 }));
});

it("moves the end of a standard offer with a new service date", async () => {
  const id = await published();
  const response = await send("PATCH", `/provider/experiences/${id}`, {
    serviceAt: "2030-07-01T10:00",
  });
  expect(response.status).toBe(200);
  const row = await offerEnd(id);
  expect(row?.offer_expires_at).toBe(row?.service_at);
  expect((await detail(id)).body.serviceAt).toBe("2030-07-01T08:00:00.000Z");
});

it("never lets a special offer outlast a service that moves earlier", async () => {
  const id = await published();
  const lateOffer = Math.floor(Date.parse("2030-06-10T00:00:00Z") / 1000);
  await env.DB.prepare(
    "UPDATE experiences SET offer_type = 'last_minute', offer_expires_at = ? WHERE id = ?",
  )
    .bind(lateOffer, id)
    .run();

  await send("PATCH", `/provider/experiences/${id}`, { serviceAt: "2030-06-05T10:00" });
  const earlier = await offerEnd(id);
  expect(earlier?.offer_expires_at).toBe(earlier?.service_at);

  await send("PATCH", `/provider/experiences/${id}`, { serviceAt: "2030-08-01T10:00" });
  const later = await offerEnd(id);
  expect(later?.offer_expires_at).toBe(earlier?.service_at);
});

it("does not let another provider correct the listing", async () => {
  const id = await published();
  const other = await signup("b@example.com");
  const response = await send("PATCH", `/provider/experiences/${id}`, { title: "Mío" }, other);
  expect(response.status).toBe(403);
  expect(await response.json()).toEqual({ error: "forbidden" });
  expect((await detail(id)).body.title).toBe("Velero en Palma");
});

it("does not leave a published listing incomplete", async () => {
  const id = await published();
  const response = await send("PATCH", `/provider/experiences/${id}`, {
    description: "",
    location: "",
    title: "Nuevo título",
  });
  expect(response.status).toBe(400);
  expect(await response.json()).toEqual({
    error: "missing_fields",
    fields: ["description", "location"],
  });
  const { body } = await detail(id);
  expect(body).toEqual(
    expect.objectContaining({
      title: "Velero en Palma",
      description: "Salida de tarde con patrón",
    }),
  );
});

it("does not move a published listing to the past", async () => {
  const id = await published();
  const response = await send("PATCH", `/provider/experiences/${id}`, {
    serviceAt: "2020-01-01T10:00",
  });
  expect(response.status).toBe(400);
  expect(await response.json()).toEqual({ error: "service_at_in_past" });
  expect((await detail(id)).status).toBe(200);
});

it("keeps letting a draft be emptied while it is still a draft", async () => {
  const created = await send("POST", "/provider/experiences", complete);
  const { id } = (await created.json()) as { id: number };
  const response = await send("PATCH", `/provider/experiences/${id}`, { description: "" });
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual(
    expect.objectContaining({ description: "", status: "draft" }),
  );
});
