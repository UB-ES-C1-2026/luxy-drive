/// <reference types="@cloudflare/workers-types" />

export type Bindings = {
  DB: D1Database;
  APP_ENV: "local" | "dev" | "staging" | "production";
};
