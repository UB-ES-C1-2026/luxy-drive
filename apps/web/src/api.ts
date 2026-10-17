import type { AppType } from "@luxydrive/api";
import { hc } from "hono/client";

// Cliente tipado: rutas, params y respuestas vienen directamente de apps/api.
// Uso: const res = await client.api.<ruta>.$get();
export const client = hc<AppType>("/");
