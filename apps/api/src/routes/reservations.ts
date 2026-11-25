import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { type AuthEnv, requireRole, requireUser, sameOrigin } from "../auth/session";
import { AVAILABLE } from "../availability";

export type ReservationRow = {
  id: number;
  experience_id: number;
  title: string;
  service_at: number;
  price_cents: number;
  status: "pending" | "confirmed" | "rejected";
  created_at: number;
  client_name: string;
};

// Every reservation query starts here, so client and provider see the same shape (SP-003).
export const RESERVATION_SELECT = `SELECT reservations.id, reservations.experience_id,
         experiences.title, experiences.service_at, reservations.price_cents,
         reservations.status, reservations.created_at, users.name AS client_name
  FROM reservations
  JOIN experiences ON experiences.id = reservations.experience_id
  JOIN users ON users.id = reservations.client_id`;

export function toReservation(row: ReservationRow) {
  return {
    id: row.id,
    experienceId: row.experience_id,
    experienceTitle: row.title,
    serviceAt: new Date(row.service_at * 1000).toISOString(),
    price: row.price_cents / 100,
    currency: "EUR" as const,
    status: row.status,
    createdAt: new Date(row.created_at * 1000).toISOString(),
  };
}

const requestBody = z.object({
  experienceId: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
});

// Client side of the reservations: the client is always the session user, never a field.
export const reservations = new Hono<AuthEnv>()
  .use(sameOrigin, requireUser, requireRole("client"))
  .post(
    "/",
    zValidator("json", requestBody, (result, c) => {
      if (!result.success) return c.json({ error: "invalid_experience_id" } as const, 400);
    }),
    async (c) => {
      const { experienceId } = c.req.valid("json");
      const clientId = c.get("user").id;
      const now = Math.floor(Date.now() / 1000);
      try {
        // Availability is checked in the same statement that inserts, so a listing that
        // stops being available in between never gets the request.
        const created = await c.env.DB.prepare(
          `INSERT INTO reservations (experience_id, client_id, status, price_cents, created_at)
           SELECT id, ?, 'pending', price_cents, ? FROM experiences
           WHERE id = ? AND ${AVAILABLE}
           RETURNING id`,
        )
          .bind(clientId, now, experienceId, now, now)
          .first<{ id: number }>();

        if (!created) {
          const listing = await c.env.DB.prepare("SELECT published FROM experiences WHERE id = ?")
            .bind(experienceId)
            .first<{ published: 0 | 1 }>();
          // Drafts answer as if they did not exist, like the public detail.
          if (listing?.published !== 1) return c.json({ error: "not_found" } as const, 404);
          return c.json({ error: "not_available" } as const, 410);
        }

        const row = await c.env.DB.prepare(`${RESERVATION_SELECT} WHERE reservations.id = ?`)
          .bind(created.id)
          .first<ReservationRow>();
        if (!row) return c.json({ error: "internal_error" } as const, 500);
        return c.json(toReservation(row), 201);
      } catch (error) {
        if (String(error).includes("UNIQUE constraint failed")) {
          return c.json({ error: "already_requested" } as const, 409);
        }
        return c.json({ error: "internal_error" } as const, 500);
      }
    },
  )
  // US-019.b: only the session client's own requests, soonest service first.
  .get("/", async (c) => {
    try {
      const { results } = await c.env.DB.prepare(
        `${RESERVATION_SELECT} WHERE reservations.client_id = ?
         ORDER BY experiences.service_at ASC, reservations.created_at DESC, reservations.id DESC`,
      )
        .bind(c.get("user").id)
        .all<ReservationRow>();
      return c.json(results.map(toReservation), 200);
    } catch {
      return c.json({ error: "internal_error" } as const, 500);
    }
  });
