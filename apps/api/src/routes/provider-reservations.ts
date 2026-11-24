import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import type { AuthEnv } from "../auth/session";
import { AVAILABLE } from "../availability";
import { RESERVATION_SELECT, type ReservationRow, toReservation } from "./reservations";

const toRequest = (row: ReservationRow) => ({ ...toReservation(row), clientName: row.client_name });

const params = z.object({
  id: z
    .string()
    .regex(/^[1-9]\d{0,14}$/)
    .transform(Number),
});

const decision = z.object({ status: z.enum(["confirmed", "rejected"]) });

type Target = {
  status: ReservationRow["status"];
  experience_id: number;
  provider_id: number | null;
  available: 0 | 1;
};

// Mounted inside the provider router, behind its provider session.
export const providerReservations = new Hono<AuthEnv>()
  .get("/", async (c) => {
    try {
      // Ownership is part of the WHERE: only requests on this provider's listings (SP-003).
      const { results } = await c.env.DB.prepare(
        `${RESERVATION_SELECT}
         WHERE experiences.provider_id = ?
         ORDER BY reservations.created_at DESC, reservations.id DESC`,
      )
        .bind(c.get("user").id)
        .all<ReservationRow>();
      return c.json(results.map(toRequest), 200);
    } catch {
      return c.json({ error: "internal_error" } as const, 500);
    }
  })
  .patch(
    "/:id",
    zValidator("param", params, (result, c) => {
      if (!result.success) return c.json({ error: "invalid_id" } as const, 400);
    }),
    zValidator("json", decision, (result, c) => {
      if (!result.success) return c.json({ error: "invalid_status" } as const, 400);
    }),
    async (c) => {
      const { id } = c.req.valid("param");
      const { status } = c.req.valid("json");
      const providerId = c.get("user").id;
      const now = Math.floor(Date.now() / 1000);
      try {
        const target = await c.env.DB.prepare(
          `SELECT reservations.status, reservations.experience_id, experiences.provider_id,
                  ${AVAILABLE} AS available
           FROM reservations JOIN experiences ON experiences.id = reservations.experience_id
           WHERE reservations.id = ?`,
        )
          .bind(now, now, id)
          .first<Target>();
        if (!target) return c.json({ error: "not_found" } as const, 404);
        if (target.provider_id !== providerId) return c.json({ error: "forbidden" } as const, 403);
        if (target.status !== "pending") return c.json({ error: "already_resolved" } as const, 409);
        if (status === "confirmed" && target.available !== 1) {
          return c.json({ error: "not_available" } as const, 409);
        }

        // The WHEREs repeat the checks above, so a decision taken in between is not
        // overwritten. Confirming rejects the other pending requests in the same
        // transaction, and only if the confirmation itself went through.
        const statements = [
          c.env.DB.prepare(
            `UPDATE reservations SET status = ?, decided_at = ?
             WHERE id = ? AND status = 'pending'
               AND (? = 'rejected' OR EXISTS (
                 SELECT 1 FROM experiences
                 WHERE experiences.id = reservations.experience_id AND ${AVAILABLE}
               ))
             RETURNING id`,
          ).bind(status, now, id, status, now, now),
        ];
        if (status === "confirmed") {
          statements.push(
            c.env.DB.prepare(
              `UPDATE reservations SET status = 'rejected', decided_at = ?
               WHERE experience_id = ? AND status = 'pending' AND id <> ?
                 AND EXISTS (SELECT 1 FROM reservations AS chosen
                             WHERE chosen.id = ? AND chosen.status = 'confirmed')
               RETURNING id`,
            ).bind(now, target.experience_id, id, id),
          );
        }
        const [decided] = await c.env.DB.batch<{ id: number }>(statements);
        if (!decided?.results.length) return c.json({ error: "already_resolved" } as const, 409);

        const row = await c.env.DB.prepare(`${RESERVATION_SELECT} WHERE reservations.id = ?`)
          .bind(id)
          .first<ReservationRow>();
        if (!row) return c.json({ error: "internal_error" } as const, 500);
        return c.json(toRequest(row), 200);
      } catch (error) {
        // Another request for this experience was confirmed at the same time.
        if (String(error).includes("UNIQUE constraint failed")) {
          return c.json({ error: "not_available" } as const, 409);
        }
        return c.json({ error: "internal_error" } as const, 500);
      }
    },
  );
