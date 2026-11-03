/// <reference types="@cloudflare/workers-types" />

export type Bindings = {
  DB: D1Database;
  APP_ENV: "local" | "dev" | "staging" | "production";
  // Workers secret (`.dev.vars` in local). Never in D1, Git or wrangler.jsonc.
  AUTH_PEPPER: string;
};
