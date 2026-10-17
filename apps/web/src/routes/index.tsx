import { Button } from "@luxydrive/ui";
import { createFileRoute } from "@tanstack/react-router";
import { client } from "../api";

export const Route = createFileRoute("/")({
  loader: async () => {
    const res = await client.api.health.$get();
    return res.json();
  },
  component: Home,
});

function Home() {
  const health = Route.useLoaderData();

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-16">
      <h1 className="text-4xl font-semibold">LuxyDrive</h1>
      <p className="text-neutral-600">Esqueleto del Sprint 0.</p>
      <p className="text-sm text-neutral-500" data-testid="health">
        API: {health.status} · BD: {health.db} · entorno: {health.env}
      </p>
      <div>
        <Button>Explorar</Button>
      </div>
    </main>
  );
}
