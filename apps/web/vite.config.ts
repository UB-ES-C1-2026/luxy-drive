import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [tanstackRouter({ target: "react", autoCodeSplitting: true }), react(), tailwindcss()],
  server: {
    // En local la API corre con `wrangler dev` en el 8787; en Cloudflare comparten origen.
    // El Worker compara `Origin` con el origen que deduce de `Host` (localhost:8787), así que
    // el proxy reescribe ambos; si no, las escrituras desde 5173 dan 403 invalid_origin.
    proxy: {
      "/api": {
        target: "http://localhost:8787",
        changeOrigin: true,
        headers: { origin: "http://localhost:8787" },
      },
    },
  },
});
