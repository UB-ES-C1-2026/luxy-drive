import { useSyncExternalStore } from "react";
import { client } from "./api";

export type SessionUser = { id: number; name: string; role: "client" | "provider" };

// Usuario con sesión iniciada en esta pestaña. La cookie de sesión la gestiona la API.
let current: SessionUser | null = null;
let loaded: Promise<SessionUser | null> | null = null;
const listeners = new Set<() => void>();

export function setSessionUser(user: SessionUser | null) {
  current = user;
  loaded = Promise.resolve(user);
  for (const listener of listeners) listener();
}

/** Pregunta a la API una sola vez quién tiene la sesión; las rutas lo esperan en `beforeLoad`. */
export function loadSession() {
  loaded ??= client.api.auth.me
    .$get()
    .then(async (res) => (res.ok ? await res.json() : null))
    .catch(() => null)
    .then((user) => {
      setSessionUser(user);
      return user;
    });
  return loaded;
}

export async function logout() {
  const res = await client.api.auth.logout.$post();
  if (!res.ok) throw new Error("logout_failed");
  setSessionUser(null);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useSessionUser() {
  return useSyncExternalStore(subscribe, () => current);
}
