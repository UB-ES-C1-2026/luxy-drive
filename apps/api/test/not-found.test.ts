import { SELF } from "cloudflare:test";
import { expect, it } from "vitest";

it("responde 404 en JSON para rutas de API desconocidas", async () => {
  const res = await SELF.fetch("https://example.com/api/no-existe");
  expect(res.status).toBe(404);
  expect(await res.json()).toEqual({ error: "not_found" });
});
