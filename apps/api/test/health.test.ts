import { SELF } from "cloudflare:test";
import { expect, it } from "vitest";

it("GET /api/health responde ok cuando la base de datos contesta", async () => {
  const res = await SELF.fetch("https://example.com/api/health");
  expect(res.status).toBe(200);
  expect(await res.json()).toEqual({ status: "ok", env: "local", db: "ok" });
});
