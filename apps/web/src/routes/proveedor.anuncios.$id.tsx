import {
  Button,
  ButtonLink,
  ChevronLeft,
  CircleCheck,
  EmptyState,
  Notice,
  Search,
  Skeleton,
  TextLink,
} from "@luxydrive/ui";
import { createFileRoute, createLink, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { client } from "../api";
import { DraftForm } from "../draft-form";
import { ProviderOnly, ProviderPage, requireSession } from "../provider-page";
import { useSessionUser } from "../session";

export const Route = createFileRoute("/proveedor/anuncios/$id")({
  validateSearch: (search: Record<string, unknown>): { guardado?: boolean } => ({
    guardado: search.guardado === true ? true : undefined,
  }),
  beforeLoad: requireSession,
  loader: async ({ params }) => {
    const res = await client.api.provider.experiences[":id"].$get({ param: { id: params.id } });
    if (res.ok) return { status: "ok", draft: await res.json() } as const;
    // Un cliente también recibe 403 (middleware de rol); el componente lo distingue por la sesión.
    const status: number = res.status;
    if (status === 400 || status === 403 || status === 404) return { status: "not_found" } as const;
    throw new Error("draft_unavailable");
  },
  pendingComponent: DraftLoading,
  errorComponent: DraftError,
  component: EditDraft,
});

const BackLink = createLink(TextLink);
const PageButton = createLink(ButtonLink);

function EditDraft() {
  const data = Route.useLoaderData();
  const { guardado } = Route.useSearch();
  const user = useSessionUser();
  const router = useRouter();
  const [saved, setSaved] = useState(guardado === true);
  const [justPublished, setJustPublished] = useState(false);

  if (user?.role !== "provider") return <ProviderOnly />;

  if (data.status !== "ok") {
    return (
      <ProviderPage>
        <EmptyState
          icon={<Search aria-hidden />}
          title="No encontramos este anuncio"
          description="No existe o pertenece a otro proveedor. Solo puedes abrir tus propios anuncios."
          action={
            <PageButton to="/proveedor" variant="secondary">
              Ir a mis anuncios
            </PageButton>
          }
        />
      </ProviderPage>
    );
  }

  const { draft } = data;

  return (
    <ProviderPage
      title={draft.title}
      subtitle={
        draft.status === "draft"
          ? "Borrador: no aparece en el catálogo."
          : "Publicado: ya aparece en el catálogo."
      }
    >
      <BackLink to="/proveedor" className="inline-flex items-center gap-1 self-start">
        <ChevronLeft aria-hidden className="size-4" />
        Mis anuncios
      </BackLink>
      {draft.status === "published" ? (
        <>
          <Notice
            icon={<CircleCheck />}
            title={justPublished ? "Anuncio publicado" : "Este anuncio está publicado"}
            className="max-w-xl"
          >
            Los visitantes ya pueden encontrarlo en el catálogo a su precio normal.
          </Notice>
          <div>
            <PageButton to="/experiencias/$id" params={{ id: String(draft.id) }}>
              Ver en el catálogo
            </PageButton>
          </div>
        </>
      ) : (
        <>
          {saved && (
            <Notice icon={<CircleCheck />} title="Borrador guardado" className="max-w-xl">
              Puedes cerrar la página y seguir más tarde: lo encontrarás en tus anuncios.
            </Notice>
          )}
          <DraftForm
            key={draft.id}
            draft={draft}
            onSaved={async () => {
              setSaved(true);
            }}
            onPublished={async () => {
              setJustPublished(true);
              await router.invalidate();
            }}
          />
        </>
      )}
    </ProviderPage>
  );
}

function DraftLoading() {
  return (
    <ProviderPage>
      <div
        role="status"
        aria-busy="true"
        aria-label="Cargando el anuncio"
        className="flex max-w-xl flex-col gap-5"
      >
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-14" />
        <Skeleton className="h-14" />
        <Skeleton className="h-28" />
      </div>
    </ProviderPage>
  );
}

function DraftError() {
  const router = useRouter();

  return (
    <ProviderPage>
      <Notice
        tone="error"
        title="No se ha podido cargar el anuncio"
        action={
          <Button
            variant="tertiary"
            size="sm"
            className="h-auto"
            onClick={() => router.invalidate()}
          >
            Reintentar
          </Button>
        }
      >
        Comprueba tu conexión e inténtalo de nuevo.
      </Notice>
    </ProviderPage>
  );
}
