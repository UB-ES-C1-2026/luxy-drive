import type { AppType } from "@luxydrive/api";
import type { Hono } from "hono";
import { hc } from "hono/client";
import type { BlankEnv, Schema } from "hono/types";
import type { StatusCode } from "hono/utils/http-status";

// Las historias con la API aún en desarrollo añaden aquí solo su contrato de transporte.
// Al integrar el endpoint, AppType aporta los tipos y se retira la declaración provisional.
export interface ApiContracts {
  implemented: AppType;
}

export type ProposedApi<Routes extends Schema> = Hono<BlankEnv, Routes>;
export type JsonEndpoint<Input> = {
  input: Input;
  output: unknown;
  outputFormat: "json";
  status: StatusCode;
};

export const client = hc<ApiContracts[keyof ApiContracts]>("/");
