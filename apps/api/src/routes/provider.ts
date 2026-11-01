import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { type AuthEnv, requireRole, requireUser, sameOrigin } from "../auth/session";
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
  published: 0 | 1;
};

const LISTING_COLUMNS =
  "id, provider_id, title, description, category, vehicle, location, capacity, published";

function toListing(row: ListingRow) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category,
    vehicle: row.vehicle,
    location: row.location,
    capacity: row.capacity,
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

// Every provider function hangs from here, behind a provider session.
export const provider = new Hono<AuthEnv>()
  .use(sameOrigin, requireUser, requireRole("provider"))
  .post("/experiences", validDraft(draftBody), async (c) => {
    const draft = c.req.valid("json");
    try {
      const row = await c.env.DB.prepare(
        `INSERT INTO experiences
           (provider_id, title, description, category, vehicle, location, capacity, published)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0)
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
    try {
      // Ownership and draft state are part of the WHERE: nothing else can be changed.
      const row = await c.env.DB.prepare(
        `UPDATE experiences
         SET title = COALESCE(?, title),
             description = COALESCE(?, description),
             category = COALESCE(?, category),
             vehicle = COALESCE(?, vehicle),
             location = COALESCE(?, location),
             capacity = COALESCE(?, capacity)
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
  });
