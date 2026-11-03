import { createRootRoute, Outlet } from "@tanstack/react-router";
import { loadSession } from "../session";

export const Route = createRootRoute({
  // Antes de pintar cualquier página sabemos si hay sesión (nombre en la barra, rutas privadas).
  beforeLoad: async () => {
    await loadSession();
  },
  component: () => (
    <div className="min-h-screen">
      <Outlet />
    </div>
  ),
});
