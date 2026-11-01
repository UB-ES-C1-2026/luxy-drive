import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { type AuthEnv, requireRole, requireUser, sameOrigin } from "../auth/session";
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
  });
