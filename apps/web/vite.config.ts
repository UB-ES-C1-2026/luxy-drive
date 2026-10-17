import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [tanstackRouter({ target: "react", autoCodeSplitting: true }), react(), tailwindcss()],
  server: {
    // En local la API corre con `wrangler dev` en el 8787; en Cloudflare comparten origen.
    proxy: { "/api": "http://localhost:8787" },
  },
});
