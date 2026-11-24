import { defineConfig, devices } from "@playwright/test";

// Tests de aceptación (TR-009): un test por criterio de las user stories, contra un entorno
// desplegado. Por defecto dev; ACCEPTANCE_BASE_URL permite apuntar a staging o a local.
const baseURL = process.env.ACCEPTANCE_BASE_URL ?? "https://dev.luxydrive.workers.dev";

// Los tests crean cuentas y anuncios de prueba: producción nunca los recibe.
if (new URL(baseURL).hostname === "app.luxydrive.workers.dev") {
  throw new Error("Los tests de aceptación no se ejecutan contra producción.");
}

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  reporter: process.env.CI ? [["list"], ["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    locale: "es-ES",
    timezoneId: "Europe/Madrid",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
