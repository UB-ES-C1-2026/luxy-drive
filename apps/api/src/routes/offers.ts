import { Hono } from "hono";
import type { Bindings } from "../env";

type OfferRow = {
  id: number;
  title: string;
  category: "jet" | "yacht" | "camper";
  location: string;
  service_at: number;
  price_cents: number;
  original_price_cents: number;
  offer_type: "empty_leg" | "last_minute";
  offer_expires_at: number;
};

export const offers = new Hono<{ Bindings: Bindings }>().get("/", async (c) => {
  const now = Math.floor(Date.now() / 1000);
  try {
    // Without an original price above the current one there is no discount to show.
    const { results } = await c.env.DB.prepare(
      `SELECT id, title, category, location, service_at, price_cents,
              original_price_cents, offer_type, offer_expires_at
       FROM experiences
       WHERE published = 1 AND offer_active = 1
         AND offer_expires_at > ? AND service_at > ?
         AND offer_type IN ('last_minute', 'empty_leg')
         AND original_price_cents > price_cents
       ORDER BY offer_expires_at, id`,
    )
      .bind(now, now)
      .all<OfferRow>();

    return c.json(
      results.map((row) => ({
        id: row.id,
        title: row.title,
        category: row.category,
        location: row.location,
        serviceAt: new Date(row.service_at * 1000).toISOString(),
        price: row.price_cents / 100,
        originalPrice: row.original_price_cents / 100,
        currency: "EUR" as const,
        priceUnit: "experiencia completa" as const,
        offerType: row.offer_type,
        offerExpiresAt: new Date(row.offer_expires_at * 1000).toISOString(),
      })),
      200,
    );
  } catch {
    return c.json({ error: "internal_error" } as const, 500);
  }
});
