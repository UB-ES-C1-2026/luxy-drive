import { Hono } from "hono";
import type { Bindings } from "./env";
import { auth } from "./routes/auth";
import { experiences } from "./routes/experiences";
import { offers } from "./routes/offers";
import { provider } from "./routes/provider";

const app = new Hono<{ Bindings: Bindings }>().basePath("/api");

const routes = app
  .route("/auth", auth)
  .route("/experiences", experiences)
  .route("/offers", offers)
  .route("/provider", provider)
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
