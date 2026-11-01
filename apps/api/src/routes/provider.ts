import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { type AuthEnv, requireRole, requireUser, sameOrigin } from "../auth/session";
import { madridLocalToUnix } from "../madrid-time";
import { draftBody, draftChanges, draftError } from "../schemas/draft";

type ListingRow = {
  id: number;
  provider_id: number | null;
  title: string;
  description: string | null;
  category: "jet" | "yacht" | "camper" | null;
  vehicle: string | null;
  location: string | null;
  capacity: number | null;
  price_cents: number | null;
  service_at: number | null;
  published: 0 | 1;
};

const LISTING_COLUMNS =
  "id, provider_id, title, description, category, vehicle, location, capacity, price_cents, service_at, published";

function toListing(row: ListingRow) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category,
    vehicle: row.vehicle,
    location: row.location,
    capacity: row.capacity,
    price: row.price_cents === null ? null : row.price_cents / 100,
    currency: "EUR" as const,
    priceUnit: "experiencia completa" as const,
    serviceAt: row.service_at === null ? null : new Date(row.service_at * 1000).toISOString(),
    status: row.published === 1 ? ("published" as const) : ("draft" as const),
  };
}

const listingParams = z.object({
  id: z
    .string()
    .regex(/^[1-9]\d{0,14}$/)
    .transform(Number),
});

const validId = zValidator("param", listingParams, (result, c) => {
  if (!result.success) return c.json({ error: "invalid_id" } as const, 400);
});

const validDraft = <T extends typeof draftBody | typeof draftChanges>(schema: T) =>
  zValidator("json", schema, (result, c) => {
    if (!result.success) return c.json({ error: draftError(result.error) }, 400);
  });

// What the catalog and the detail show; the database also refuses a published listing
// without them. Price and service date come first: they are the usual ones (US-010).
const REQUIRED_TO_PUBLISH = [
  ["price_cents", "price"],
  ["service_at", "serviceAt"],
  ["description", "description"],
  ["category", "category"],
  ["vehicle", "vehicle"],
  ["location", "location"],
  ["capacity", "capacity"],
] as const satisfies readonly (readonly [keyof ListingRow, string])[];

// Price in cents and service time in Unix seconds, or a 400 telling what to fix.
function priceAndDate(changes: { price?: number; serviceAt?: string }) {
  const priceCents = changes.price === undefined ? null : Math.round(changes.price * 100);
  const serviceAt = changes.serviceAt === undefined ? null : madridLocalToUnix(changes.serviceAt);
  const past = serviceAt !== null && serviceAt <= Math.floor(Date.now() / 1000);
  return { priceCents, serviceAt, past };
}

// Every provider function hangs from here, behind a provider session.
export const provider = new Hono<AuthEnv>()
  .use(sameOrigin, requireUser, requireRole("provider"))
  .post("/experiences", validDraft(draftBody), async (c) => {
    const draft = c.req.valid("json");
    const { priceCents, serviceAt, past } = priceAndDate(draft);
    if (past) return c.json({ error: "service_at_in_past" } as const, 400);
    try {
      const row = await c.env.DB.prepare(
        `INSERT INTO experiences
           (provider_id, title, description, category, vehicle, location, capacity,
            price_cents, service_at, published)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
         RETURNING ${LISTING_COLUMNS}`,
      )
        .bind(
          c.get("user").id,
          draft.title,
          draft.description ?? null,
          draft.category ?? null,
          draft.vehicle ?? null,
          draft.location ?? null,
          draft.capacity ?? null,
          priceCents,
          serviceAt,
        )
        .first<ListingRow>();
      if (!row) return c.json({ error: "internal_error" } as const, 500);
      return c.json(toListing(row), 201);
    } catch {
      return c.json({ error: "internal_error" } as const, 500);
    }
  })
  .get("/experiences", async (c) => {
    try {
      const { results } = await c.env.DB.prepare(
        `SELECT ${LISTING_COLUMNS} FROM experiences WHERE provider_id = ? ORDER BY id DESC`,
      )
        .bind(c.get("user").id)
        .all<ListingRow>();
      return c.json(results.map(toListing), 200);
    } catch {
      return c.json({ error: "internal_error" } as const, 500);
    }
  })
  .get("/experiences/:id", validId, async (c) => {
    const { id } = c.req.valid("param");
    try {
      const row = await c.env.DB.prepare(`SELECT ${LISTING_COLUMNS} FROM experiences WHERE id = ?`)
        .bind(id)
        .first<ListingRow>();
      if (!row) return c.json({ error: "not_found" } as const, 404);
      // Ownership, not only the role (SP-002): another provider's listing is off limits.
      if (row.provider_id !== c.get("user").id) {
        return c.json({ error: "forbidden" } as const, 403);
      }
      return c.json(toListing(row), 200);
    } catch {
      return c.json({ error: "internal_error" } as const, 500);
    }
  })
  .patch("/experiences/:id", validId, validDraft(draftChanges), async (c) => {
    const { id } = c.req.valid("param");
    const changes = c.req.valid("json");
    const userId = c.get("user").id;
    const { priceCents, serviceAt, past } = priceAndDate(changes);
    if (past) return c.json({ error: "service_at_in_past" } as const, 400);
    try {
      // Ownership and draft state are part of the WHERE: nothing else can be changed.
      const row = await c.env.DB.prepare(
        `UPDATE experiences
         SET title = COALESCE(?, title),
             description = COALESCE(?, description),
             category = COALESCE(?, category),
             vehicle = COALESCE(?, vehicle),
             location = COALESCE(?, location),
             capacity = COALESCE(?, capacity),
             price_cents = COALESCE(?, price_cents),
             service_at = COALESCE(?, service_at)
         WHERE id = ? AND provider_id = ? AND published = 0
         RETURNING ${LISTING_COLUMNS}`,
      )
        .bind(
          changes.title ?? null,
          changes.description ?? null,
          changes.category ?? null,
          changes.vehicle ?? null,
          changes.location ?? null,
          changes.capacity ?? null,
          priceCents,
          serviceAt,
          id,
          userId,
        )
        .first<ListingRow>();
      if (row) return c.json(toListing(row), 200);

      const existing = await c.env.DB.prepare(
        "SELECT provider_id, published FROM experiences WHERE id = ?",
      )
        .bind(id)
        .first<Pick<ListingRow, "provider_id" | "published">>();
      if (!existing) return c.json({ error: "not_found" } as const, 404);
      if (existing.provider_id !== userId) return c.json({ error: "forbidden" } as const, 403);
      return c.json({ error: "already_published" } as const, 409);
    } catch {
      return c.json({ error: "internal_error" } as const, 500);
    }
  })
  .post("/experiences/:id/publish", validId, async (c) => {
    const { id } = c.req.valid("param");
    const userId = c.get("user").id;
    const now = Math.floor(Date.now() / 1000);
    try {
      const row = await c.env.DB.prepare(`SELECT ${LISTING_COLUMNS} FROM experiences WHERE id = ?`)
        .bind(id)
        .first<ListingRow>();
      if (!row) return c.json({ error: "not_found" } as const, 404);
      if (row.provider_id !== userId) return c.json({ error: "forbidden" } as const, 403);
      if (row.published === 1) return c.json({ error: "already_published" } as const, 409);

      const missing = REQUIRED_TO_PUBLISH.filter(([column]) => row[column] === null).map(
        ([, field]) => field,
      );
      if (missing.length > 0) {
        return c.json({ error: "missing_fields" as const, fields: missing }, 400);
      }
      if ((row.service_at ?? 0) <= now) {
        return c.json({ error: "service_at_in_past" } as const, 400);
      }

      // Published at its normal price: a standard offer active until the service starts,
      // so it is "available" as defined in US-001. The WHERE repeats the checks above
      // in case the draft changed in between.
      const published = await c.env.DB.prepare(
        `UPDATE experiences
         SET published = 1, offer_active = 1, offer_type = 'standard',
             offer_expires_at = service_at
         WHERE id = ? AND provider_id = ? AND published = 0 AND service_at > ?
         RETURNING ${LISTING_COLUMNS}`,
      )
        .bind(id, userId, now)
        .first<ListingRow>();
      if (!published) return c.json({ error: "already_published" } as const, 409);
      return c.json(toListing(published), 200);
    } catch {
      return c.json({ error: "internal_error" } as const, 500);
    }
  });
