import { Hono } from "hono";
import type { Bindings } from "./env";
import { experiences } from "./routes/experiences";

const app = new Hono<{ Bindings: Bindings }>().basePath("/api");

const routes = app
  .route("/experiences", experiences)
  .get("/health", async (c) => {
    try {
      await c.env.DB.prepare("SELECT 1").first();
      return c.json({ status: "ok", env: c.env.APP_ENV, db: "ok" } as const, 200);
    } catch {
      return c.json({ status: "degraded", env: c.env.APP_ENV, db: "error" } as const, 503);
    }
  })
  .notFound((c) => c.json({ error: "not_found" }, 404));

export type AppType = typeof routes;
export default app;
