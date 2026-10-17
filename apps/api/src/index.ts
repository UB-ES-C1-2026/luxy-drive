import { Hono } from "hono";
import type { Bindings } from "./env";

const app = new Hono<{ Bindings: Bindings }>().basePath("/api");

const routes = app.notFound((c) => c.json({ error: "not_found" }, 404));

export type AppType = typeof routes;
export default app;
