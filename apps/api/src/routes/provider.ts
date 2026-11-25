import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { type AuthEnv, requireRole, requireUser, sameOrigin } from "../auth/session";
import { madridLocalToUnix } from "../madrid-time";
import { draftBody, draftChanges, draftError } from "../schemas/draft";
import { offerBody, offerError } from "../schemas/offer";
import { profileBody, profileError } from "../schemas/provider-profile";

type ProfileRow = {
  id: number;
  user_id: number;
  trade_name: string;
  description: string;
  phone: string;
};

const toProfile = (row: ProfileRow) => ({
  id: row.id,
  tradeName: row.trade_name,
  description: row.description,
  phone: row.phone,
});

const invalid = (schema: typeof profileBody | ReturnType<typeof profileBody.partial>) =>
  zValidator("json", schema, (result, c) => {
    if (!result.success) return c.json({ error: profileError(result.error) }, 400);
  });

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
  withdrawn_at: number | null;
};

const LISTING_COLUMNS =
  "id, provider_id, title, description, category, vehicle, location, capacity, price_cents, service_at, published, withdrawn_at";

function listingStatus(row: ListingRow) {
  if (row.published === 0) return "draft" as const;
  return row.withdrawn_at === null ? ("published" as const) : ("withdrawn" as const);
}

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
    status: listingStatus(row),
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

// Text fields a published listing needs; an empty one would leave it incomplete.
const EDITABLE_TEXT = ["description", "vehicle", "location"] as const;

type OfferStateRow = {
  provider_id: number | null;
  published: 0 | 1;
  offer_active: 0 | 1;
  offer_type: "standard" | "last_minute" | "empty_leg";
  offer_expires_at: number | null;
  service_at: number | null;
  price_cents: number | null;
  original_price_cents: number | null;
};

const OFFER_STATE_COLUMNS =
  "provider_id, published, offer_active, offer_type, offer_expires_at, service_at, price_cents, original_price_cents";

// A special offer is running while its type is not standard and it has not expired.
const specialRunning = (row: OfferStateRow, now: number) =>
  row.offer_type !== "standard" && (row.offer_expires_at ?? 0) > now;

const validOffer = zValidator("json", offerBody, (result, c) => {
  if (!result.success) return c.json({ error: offerError(result.error) }, 400);
});

function toOffer(row: OfferStateRow & { id: number }) {
  return {
    id: row.id,
    offerType: row.offer_type,
    price: (row.price_cents ?? 0) / 100,
    originalPrice: row.original_price_cents === null ? null : row.original_price_cents / 100,
    currency: "EUR" as const,
    priceUnit: "experiencia completa" as const,
    offerExpiresAt:
      row.offer_expires_at === null ? null : new Date(row.offer_expires_at * 1000).toISOString(),
  };
}

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
  .post("/profile", invalid(profileBody), async (c) => {
    const { tradeName, description, phone } = c.req.valid("json");
    try {
      const row = await c.env.DB.prepare(
        `INSERT INTO provider_profiles (user_id, trade_name, description, phone)
         VALUES (?, ?, ?, ?) RETURNING *`,
      )
        .bind(c.get("user").id, tradeName, description, phone)
        .first<ProfileRow>();
      if (!row) return c.json({ error: "internal_error" } as const, 500);
      return c.json(toProfile(row), 201);
    } catch (error) {
      if (String(error).includes("UNIQUE constraint failed: provider_profiles.user_id")) {
        return c.json({ error: "profile_exists" } as const, 409);
      }
      return c.json({ error: "internal_error" } as const, 500);
    }
  })
  .get("/profile", async (c) => {
    try {
      const row = await c.env.DB.prepare("SELECT * FROM provider_profiles WHERE user_id = ?")
        .bind(c.get("user").id)
        .first<ProfileRow>();
      if (!row) return c.json({ error: "not_found" } as const, 404);
      return c.json(toProfile(row), 200);
    } catch {
      return c.json({ error: "internal_error" } as const, 500);
    }
  })
  .patch("/profile/:id{[0-9]+}", invalid(profileBody.partial()), async (c) => {
    const id = Number(c.req.param("id"));
    const changes = c.req.valid("json");
    try {
      // Ownership is part of the WHERE: the role alone does not grant access (SP-002).
      const row = await c.env.DB.prepare(
        `UPDATE provider_profiles
         SET trade_name = COALESCE(?, trade_name),
             description = COALESCE(?, description),
             phone = COALESCE(?, phone)
         WHERE id = ? AND user_id = ? RETURNING *`,
      )
        .bind(
          changes.tradeName ?? null,
          changes.description ?? null,
          changes.phone ?? null,
          id,
          c.get("user").id,
        )
        .first<ProfileRow>();
      if (row) return c.json(toProfile(row), 200);
      const exists = await c.env.DB.prepare("SELECT 1 FROM provider_profiles WHERE id = ?")
        .bind(id)
        .first();
      return exists
        ? c.json({ error: "forbidden" } as const, 403)
        : c.json({ error: "not_found" } as const, 404);
    } catch {
      return c.json({ error: "internal_error" } as const, 500);
    }
  })
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
      const existing = await c.env.DB.prepare(
        "SELECT provider_id, published, withdrawn_at FROM experiences WHERE id = ?",
      )
        .bind(id)
        .first<Pick<ListingRow, "provider_id" | "published" | "withdrawn_at">>();
      if (!existing) return c.json({ error: "not_found" } as const, 404);
      if (existing.provider_id !== userId) return c.json({ error: "forbidden" } as const, 403);
      // A withdrawn listing (US-014) is not corrected any more.
      if (existing.withdrawn_at !== null) {
        return c.json({ error: "already_withdrawn" } as const, 409);
      }

      // A published listing can be corrected (US-013), but the catalog and the detail
      // must never show it with an empty field.
      if (existing.published === 1) {
        const emptied = EDITABLE_TEXT.filter((field) => changes[field] === "");
        if (emptied.length > 0) {
          return c.json({ error: "missing_fields" as const, fields: emptied }, 400);
        }
      }

      // Ownership is part of the WHERE, and so is not being withdrawn, in case that changed
      // in between: nothing else can be changed. A new service date also moves the end of
      // the offer: a standard offer lasts until the service starts, and a special one can
      // never outlast it.
      const row = await c.env.DB.prepare(
        `UPDATE experiences
         SET title = COALESCE(?, title),
             description = COALESCE(?, description),
             category = COALESCE(?, category),
             vehicle = COALESCE(?, vehicle),
             location = COALESCE(?, location),
             capacity = COALESCE(?, capacity),
             price_cents = COALESCE(?, price_cents),
             service_at = COALESCE(?, service_at),
             offer_expires_at = CASE
               WHEN published = 0 OR ? IS NULL THEN offer_expires_at
               WHEN offer_type = 'standard' THEN ?
               ELSE MIN(offer_expires_at, ?)
             END
         WHERE id = ? AND provider_id = ? AND withdrawn_at IS NULL
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
          serviceAt,
          serviceAt,
          serviceAt,
          id,
          userId,
        )
        .first<ListingRow>();
      if (!row) return c.json({ error: "already_withdrawn" } as const, 409);
      return c.json(toListing(row), 200);
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
  })
  .post("/experiences/:id/withdraw", validId, async (c) => {
    const { id } = c.req.valid("param");
    const userId = c.get("user").id;
    try {
      // Turning the offer off is enough to leave the catalog, the offers and the detail:
      // they only show "available" listings (US-001). The listing itself is kept.
      const row = await c.env.DB.prepare(
        `UPDATE experiences
         SET offer_active = 0, withdrawn_at = ?
         WHERE id = ? AND provider_id = ? AND published = 1 AND withdrawn_at IS NULL
         RETURNING ${LISTING_COLUMNS}`,
      )
        .bind(Math.floor(Date.now() / 1000), id, userId)
        .first<ListingRow>();
      if (row) return c.json(toListing(row), 200);

      const existing = await c.env.DB.prepare(
        "SELECT provider_id, published, withdrawn_at FROM experiences WHERE id = ?",
      )
        .bind(id)
        .first<Pick<ListingRow, "provider_id" | "published" | "withdrawn_at">>();
      if (!existing) return c.json({ error: "not_found" } as const, 404);
      if (existing.provider_id !== userId) return c.json({ error: "forbidden" } as const, 403);
      if (existing.published === 0) return c.json({ error: "not_published" } as const, 409);
      return c.json({ error: "already_withdrawn" } as const, 409);
    } catch {
      return c.json({ error: "internal_error" } as const, 500);
    }
  })
  .post("/experiences/:id/offer", validId, validOffer, async (c) => {
    const { id } = c.req.valid("param");
    const offer = c.req.valid("json");
    const userId = c.get("user").id;
    const now = Math.floor(Date.now() / 1000);
    const until = madridLocalToUnix(offer.until);
    const priceCents = Math.round(offer.price * 100);
    try {
      const row = await c.env.DB.prepare(
        `SELECT ${OFFER_STATE_COLUMNS} FROM experiences WHERE id = ?`,
      )
        .bind(id)
        .first<OfferStateRow>();
      if (!row) return c.json({ error: "not_found" } as const, 404);
      if (row.provider_id !== userId) return c.json({ error: "forbidden" } as const, 403);
      // Only a listing that people can find now can get an offer: not a draft, not a
      // withdrawn listing (its offer is off) and not one whose service has passed.
      if (row.published === 0 || row.offer_active === 0 || (row.service_at ?? 0) <= now) {
        return c.json({ error: "not_available" } as const, 409);
      }
      // One price at a time: a running special offer has to end first (US-016, C3).
      if (specialRunning(row, now)) return c.json({ error: "offer_active" } as const, 409);

      // The normal price is the original one of an expired special offer, if any.
      const normalCents =
        row.offer_type === "standard" ? row.price_cents : row.original_price_cents;
      if (normalCents === null || priceCents >= normalCents) {
        return c.json({ error: "price_not_lower" } as const, 400);
      }
      if (until <= now) return c.json({ error: "until_in_past" } as const, 400);
      if (until > (row.service_at ?? 0)) {
        return c.json({ error: "until_after_service" } as const, 400);
      }

      // The WHERE repeats the checks above in case the listing changed in between.
      const updated = await c.env.DB.prepare(
        `UPDATE experiences
         SET offer_type = ?, price_cents = ?, original_price_cents = ?, offer_expires_at = ?
         WHERE id = ? AND provider_id = ? AND published = 1 AND offer_active = 1
           AND service_at > ? AND NOT (offer_type <> 'standard' AND offer_expires_at > ?)
         RETURNING id, ${OFFER_STATE_COLUMNS}`,
      )
        .bind(offer.type, priceCents, normalCents, until, id, userId, now, now)
        .first<OfferStateRow & { id: number }>();
      if (!updated) return c.json({ error: "offer_active" } as const, 409);
      return c.json(toOffer(updated), 201);
    } catch {
      return c.json({ error: "internal_error" } as const, 500);
    }
  })
  .delete("/experiences/:id/offer", validId, async (c) => {
    const { id } = c.req.valid("param");
    const userId = c.get("user").id;
    try {
      // Ending a special offer, running or already expired, brings back the normal price
      // until the service starts, so the listing is available again at that price.
      const updated = await c.env.DB.prepare(
        `UPDATE experiences
         SET offer_type = 'standard', price_cents = original_price_cents,
             original_price_cents = NULL, offer_expires_at = service_at
         WHERE id = ? AND provider_id = ? AND offer_type <> 'standard'
           AND original_price_cents IS NOT NULL
         RETURNING id, ${OFFER_STATE_COLUMNS}`,
      )
        .bind(id, userId)
        .first<OfferStateRow & { id: number }>();
      if (updated) return c.json(toOffer(updated), 200);

      const row = await c.env.DB.prepare("SELECT provider_id FROM experiences WHERE id = ?")
        .bind(id)
        .first<Pick<OfferStateRow, "provider_id">>();
      if (!row) return c.json({ error: "not_found" } as const, 404);
      if (row.provider_id !== userId) return c.json({ error: "forbidden" } as const, 403);
      return c.json({ error: "no_active_offer" } as const, 409);
    } catch {
      return c.json({ error: "internal_error" } as const, 500);
    }
  });
