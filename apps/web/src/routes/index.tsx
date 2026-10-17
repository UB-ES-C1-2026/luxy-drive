import { Button } from "@luxydrive/ui";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-16">
      <h1 className="text-4xl font-semibold">LuxyDrive</h1>
      <p className="text-neutral-600">Esqueleto del Sprint 0.</p>
      <div>
        <Button>Explorar</Button>
      </div>
    </main>
  );
}
