import { useSyncExternalStore } from "react";

export type SessionUser = { id: number; name: string; role: "client" | "provider" };

// Usuario con sesión iniciada en esta pestaña. La cookie de sesión la gestiona la API.
let current: SessionUser | null = null;
const listeners = new Set<() => void>();

export function setSessionUser(user: SessionUser | null) {
  current = user;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useSessionUser() {
  return useSyncExternalStore(subscribe, () => current);
}
