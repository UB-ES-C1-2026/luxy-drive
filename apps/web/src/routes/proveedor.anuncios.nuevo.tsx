import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { DraftForm } from "../draft-form";
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

  return (
    <ProviderPage
      title="Nuevo anuncio"
      subtitle="Se guarda como borrador: nadie lo verá en el catálogo hasta que lo publiques."
    >
      <DraftForm
        onSaved={async (draft) => {
          await navigate({
            to: "/proveedor/anuncios/$id",
            params: { id: String(draft.id) },
            search: { guardado: true },
          });
        }}
      />
    </ProviderPage>
  );
}
