import { Hono } from "hono";
import { type AuthEnv, requireRole, requireUser, sameOrigin } from "../auth/session";

// Every provider function hangs from here, behind a provider session.
export const provider = new Hono<AuthEnv>().use(sameOrigin, requireUser, requireRole("provider"));
