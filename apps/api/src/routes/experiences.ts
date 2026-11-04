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

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    // Rejects impossible days such as 2030-02-30 instead of rolling them over.
    const date = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
  });

const listQuery = z
  .object({
    category: z.enum(["jet", "yacht", "camper"]).optional(),
    location: z.string().trim().min(1).max(100).optional(),
    from: isoDate.optional(),
    to: isoDate.optional(),
  })
  .refine(({ from, to }) => !from || !to || from <= to, { path: ["range"] });

const madridOffset = new Intl.DateTimeFormat("en-US", {
  timeZone: "Europe/Madrid",
  timeZoneName: "longOffset",
});

// Unix seconds of 00:00 in Madrid on the given day (plus `days`). Madrid changes its
// offset at 01:00 UTC, so the offset at 00:00 UTC is already the one of local midnight.
function madridStartOfDay(date: string, days = 0) {
  const year = Number(date.slice(0, 4));
  const month = Number(date.slice(5, 7));
  const day = Number(date.slice(8, 10));
  const utcMidnight = Date.UTC(year, month - 1, day + days);
  const name = madridOffset.formatToParts(utcMidnight).find((part) => part.type === "timeZoneName");
  const [, sign, hours, minutes] = name?.value.match(/GMT([+-])(\d{2}):(\d{2})/) ?? [];
  const offset = (sign === "-" ? -1 : 1) * (Number(hours ?? 0) * 60 + Number(minutes ?? 0));
  return (utcMidnight - offset * 60_000) / 1000;
}

// SQLite only lowercases ASCII, so accents are removed here: "Málaga" matches "malaga".
function normalize(text: string) {
  return text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

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
      if (result.success) return;
      const field = result.error.issues[0]?.path[0];
      if (field === "location") return c.json({ error: "invalid_location" } as const, 400);
      if (field === "from" || field === "to") {
        return c.json({ error: "invalid_date" } as const, 400);
      }
      if (field === "range") return c.json({ error: "invalid_date_range" } as const, 400);
      return c.json({ error: "invalid_category" } as const, 400);
    }),
    async (c) => {
      const { category = null, location, from, to } = c.req.valid("query");
      const now = Math.floor(Date.now() / 1000);
      // The whole `to` day is included: the range ends at 00:00 of the next day.
      const fromAt = from ? madridStartOfDay(from) : null;
      const toAt = to ? madridStartOfDay(to, 1) : null;
      try {
        const { results } = await c.env.DB.prepare(
          `SELECT id, title, category, location, service_at, price_cents, offer_type
           FROM experiences
           WHERE published = 1 AND offer_active = 1
             AND offer_expires_at > ? AND service_at > ?
             AND (? IS NULL OR category = ?)
             AND (? IS NULL OR service_at >= ?)
             AND (? IS NULL OR service_at < ?)
           ORDER BY service_at, id`,
        )
          .bind(now, now, category, category, fromAt, fromAt, toAt, toAt)
          .all<ExperienceSummaryRow>();

        const matches = location
          ? results.filter((row) => normalize(row.location).includes(normalize(location)))
          : results;

        return c.json(matches.map(toSummary), 200);
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
