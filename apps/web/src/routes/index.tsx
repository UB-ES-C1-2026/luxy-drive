import { createFileRoute, redirect } from "@tanstack/react-router";

// La portada de LuxyDrive es el catálogo de experiencias.
export const Route = createFileRoute("/")({
  beforeLoad: () => {
    throw redirect({ to: "/experiencias", replace: true });
  },
});
