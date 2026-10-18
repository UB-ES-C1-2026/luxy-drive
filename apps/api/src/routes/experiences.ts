import { Hono } from "hono";
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

export const experiences = new Hono<{ Bindings: Bindings }>().get("/", async (c) => {
  const now = Math.floor(Date.now() / 1000);
  try {
    const { results } = await c.env.DB.prepare(
      `SELECT id, title, category, location, service_at, price_cents, offer_type
       FROM experiences
       WHERE published = 1 AND offer_active = 1
         AND offer_expires_at > ? AND service_at > ?
       ORDER BY service_at, id`,
    )
      .bind(now, now)
      .all<ExperienceSummaryRow>();

    return c.json(
      results.map((row) => ({
        id: row.id,
        title: row.title,
        category: row.category,
        location: row.location,
        serviceAt: new Date(row.service_at * 1000).toISOString(),
        price: row.price_cents / 100,
        currency: "EUR" as const,
        priceUnit: "experiencia completa" as const,
        offerType: row.offer_type,
      })),
      200,
    );
  } catch {
    return c.json({ error: "internal_error" } as const, 500);
  }
});
