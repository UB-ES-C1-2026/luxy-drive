import {
  Button,
  ButtonLink,
  ChevronLeft,
  CircleCheck,
  EmptyState,
  Notice,
  Search,
  Skeleton,
  Text,
  TextLink,
} from "@luxydrive/ui";
import { createFileRoute, createLink, useNavigate, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { client } from "../api";
import { type Draft, DraftStep, steps } from "../draft-wizard";
import { ProviderOnly, ProviderPage, requireSession } from "../provider-page";
import { useSessionUser } from "../session";

export const Route = createFileRoute("/proveedor/anuncios/$id")({
  // Sin `paso` se ve el resumen del anuncio; con `paso`, esa pregunta.
  validateSearch: (search: Record<string, unknown>): { paso?: number } => {
    const step = Number(search.paso);
    return { paso: Number.isInteger(step) && step >= 1 && step <= steps.length ? step : undefined };
  },
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
  component: DraftPage,
});

const BackLink = createLink(TextLink);
const PageButton = createLink(ButtonLink);
const EditLink = createLink(TextLink);

function DraftPage() {
  const data = Route.useLoaderData();
  const { paso } = Route.useSearch();
  const user = useSessionUser();
  const router = useRouter();
  const navigate = useNavigate({ from: Route.fullPath });

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

  if (paso !== undefined && draft.status === "draft") {
    const goTo = async (step: number | undefined) => {
      await navigate({ search: { paso: step } });
      await router.invalidate();
    };
    return (
      <ProviderPage>
        <DraftStep
          key={`${draft.id}-${paso}`}
          draft={draft}
          index={paso - 1}
          onSaved={async (_saved, exit) => {
            if (exit) {
              await navigate({ to: "/proveedor" });
              return;
            }
            await goTo(paso < steps.length ? paso + 1 : undefined);
          }}
          onBack={paso > 1 ? () => goTo(paso - 1) : undefined}
        />
      </ProviderPage>
    );
  }

  return <DraftSummary draft={draft} />;
}

type PublishProblem = { title: string; body: string; fields: string[] };

function DraftSummary({ draft }: { draft: Draft }) {
  const router = useRouter();
  const [problem, setProblem] = useState<PublishProblem | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [justPublished, setJustPublished] = useState(false);
  const pending = steps.findIndex((step) => !step.read(draft).trim());
  const isDraft = draft.status === "draft";

  const publish = async () => {
    setProblem(null);
    setPublishing(true);
    try {
      const res = await client.api.provider.experiences[":id"].publish.$post({
        param: { id: String(draft.id) },
      });
      if (res.ok) {
        setJustPublished(true);
        return await router.invalidate();
      }
      const status: number = res.status;
      if (status === 400) {
        const body = await res.json();
        if ("fields" in body) {
          // La API dice exactamente qué falta: se resume arriba y se marca en cada fila.
          const missing: string[] = body.fields;
          const labels = steps.filter((step) => missing.includes(step.field));
          return setProblem({
            title: `Para publicar falta: ${labels.map((step) => step.label).join(", ")}`,
            body: "El anuncio sigue siendo un borrador y no aparece en el catálogo.",
            fields: labels.map((step) => step.field),
          });
        }
        if (body.error === "service_at_in_past") {
          return setProblem({
            title: "La fecha de servicio ya ha pasado",
            body: "Cambia la fecha y hora por una futura y vuelve a publicar. El anuncio sigue oculto.",
            fields: ["serviceAt"],
          });
        }
      }
      if (status === 409) return await router.invalidate();
      setProblem({
        title: "No se ha podido publicar",
        body: "Comprueba tu conexión e inténtalo de nuevo.",
        fields: [],
      });
    } catch {
      setProblem({
        title: "No se ha podido publicar",
        body: "Comprueba tu conexión e inténtalo de nuevo.",
        fields: [],
      });
    } finally {
      setPublishing(false);
    }
  };

  return (
    <ProviderPage
      title={draft.title}
      subtitle={
        isDraft ? "Borrador: no aparece en el catálogo." : "Publicado: ya aparece en el catálogo."
      }
    >
      <BackLink to="/proveedor" className="inline-flex items-center gap-1 self-start">
        <ChevronLeft aria-hidden className="size-4" />
        Mis anuncios
      </BackLink>
      {isDraft && !problem && (
        <Notice icon={<CircleCheck />} title="Borrador guardado" className="max-w-2xl">
          Cada respuesta se guarda al pasar a la siguiente. Puedes salir y seguir otro día.
        </Notice>
      )}
      {problem && (
        <Notice tone="error" title={problem.title} className="max-w-2xl">
          {problem.body}
        </Notice>
      )}
      {!isDraft && (
        <Notice
          icon={<CircleCheck />}
          title={justPublished ? "Anuncio publicado" : "Este anuncio está publicado"}
          className="max-w-2xl"
        >
          Los visitantes ya pueden encontrarlo en el catálogo a su precio normal.
        </Notice>
      )}
      <dl className="flex max-w-2xl flex-col divide-y divide-hairline border-y border-hairline">
        {steps.map((step, index) => {
          const shown = (step.show ?? step.read)(draft).trim();
          const missing = problem?.fields.includes(step.field) ?? false;
          return (
            <div key={step.field} className="flex items-start justify-between gap-4 py-4">
              <div className="flex min-w-0 flex-col gap-1">
                <dt>
                  <Text as="span" variant="caption" tone="muted">
                    {step.label}
                  </Text>
                </dt>
                <dd className="flex flex-col gap-1 break-words whitespace-pre-line">
                  <Text as="span" tone={shown ? "ink" : "muted"}>
                    {shown || "Sin rellenar"}
                  </Text>
                  {missing && (
                    <Text as="span" variant="body-sm" tone="error">
                      {shown ? "Cámbiala por una fecha futura." : "Falta para publicar."}
                    </Text>
                  )}
                </dd>
              </div>
              {isDraft && (
                <EditLink
                  from={Route.fullPath}
                  search={{ paso: index + 1 }}
                  aria-label={`Editar: ${step.label}`}
                >
                  {missing ? "Completar" : "Editar"}
                </EditLink>
              )}
            </div>
          );
        })}
      </dl>
      <div className="flex flex-wrap gap-3">
        {isDraft ? (
          <>
            <Button onClick={publish} disabled={publishing}>
              {publishing ? "Publicando…" : "Publicar anuncio"}
            </Button>
            {pending >= 0 && (
              <PageButton from={Route.fullPath} search={{ paso: pending + 1 }} variant="secondary">
                Seguir rellenando
              </PageButton>
            )}
          </>
        ) : (
          <PageButton to="/experiencias/$id" params={{ id: String(draft.id) }}>
            Ver en el catálogo
          </PageButton>
        )}
      </div>
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
        className="flex max-w-2xl flex-col gap-6"
      >
        <Skeleton className="h-1" />
        <Skeleton className="h-10 w-96 max-w-full" />
        <Skeleton className="h-14" />
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
