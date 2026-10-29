import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import type { Bindings } from "../env";

type ExperienceSummaryRow = {
  id: number;
  title: string;
  category: "jet" | "yacht" | "camper";
  location: string;
  service_at: number;
  price_cents: number;
  offer_type: "standard" | "empty_leg" | "last_minute";
};

type ExperienceDetailRow = ExperienceSummaryRow & {
  description: string;
  vehicle: string;
  capacity: number;
  available: 0 | 1;
};

const listQuery = z.object({
  category: z.enum(["jet", "yacht", "camper"]).optional(),
});

const detailParams = z.object({
  id: z
    .string()
    .regex(/^[1-9]\d{0,14}$/)
    .transform(Number),
});

function toSummary(row: ExperienceSummaryRow) {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    location: row.location,
    serviceAt: new Date(row.service_at * 1000).toISOString(),
    price: row.price_cents / 100,
    currency: "EUR" as const,
    priceUnit: "experiencia completa" as const,
    offerType: row.offer_type,
  };
}

export const experiences = new Hono<{ Bindings: Bindings }>()
  .get(
    "/",
    zValidator("query", listQuery, (result, c) => {
      if (!result.success) return c.json({ error: "invalid_category" } as const, 400);
    }),
    async (c) => {
      const { category = null } = c.req.valid("query");
      const now = Math.floor(Date.now() / 1000);
      try {
        const { results } = await c.env.DB.prepare(
          `SELECT id, title, category, location, service_at, price_cents, offer_type
           FROM experiences
           WHERE published = 1 AND offer_active = 1
             AND offer_expires_at > ? AND service_at > ?
             AND (? IS NULL OR category = ?)
           ORDER BY service_at, id`,
        )
          .bind(now, now, category, category)
          .all<ExperienceSummaryRow>();

        return c.json(results.map(toSummary), 200);
      } catch {
        return c.json({ error: "internal_error" } as const, 500);
      }
    },
  )
  .get(
    "/:id",
    zValidator("param", detailParams, (result, c) => {
      if (!result.success) return c.json({ error: "invalid_id" } as const, 400);
    }),
    async (c) => {
      const { id } = c.req.valid("param");
      const now = Math.floor(Date.now() / 1000);
      try {
        // Unpublished rows are drafts: they answer as if they did not exist.
        const row = await c.env.DB.prepare(
          `SELECT id, title, description, category, vehicle, location, service_at,
                  capacity, price_cents, offer_type,
                  (offer_active = 1 AND offer_expires_at > ? AND service_at > ?) AS available
           FROM experiences
           WHERE id = ? AND published = 1`,
        )
          .bind(now, now, id)
          .first<ExperienceDetailRow>();

        if (!row) return c.json({ error: "not_found" } as const, 404);
        if (row.available !== 1) return c.json({ error: "not_available" } as const, 410);

        return c.json(
          {
            ...toSummary(row),
            description: row.description,
            vehicle: row.vehicle,
            capacity: row.capacity,
          },
          200,
        );
      } catch {
        return c.json({ error: "internal_error" } as const, 500);
      }
    },
  );
