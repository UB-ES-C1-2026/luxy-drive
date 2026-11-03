import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { DraftStep } from "../draft-wizard";
import { ProviderOnly, ProviderPage, requireSession } from "../provider-page";
import { useSessionUser } from "../session";

export const Route = createFileRoute("/proveedor/anuncios/nuevo")({
  beforeLoad: requireSession,
  component: NewDraft,
});

function NewDraft() {
  const user = useSessionUser();
  const navigate = useNavigate();

  if (user?.role !== "provider") return <ProviderOnly />;

  // La primera pregunta crea el borrador; las demás ya van sobre su página.
  return (
    <ProviderPage>
      <DraftStep
        index={0}
        onSaved={async (draft) => {
          await navigate({
            to: "/proveedor/anuncios/$id",
            params: { id: String(draft.id) },
            search: { paso: 2 },
          });
        }}
      />
    </ProviderPage>
  );
}
