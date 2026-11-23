import { Button, ButtonLink, EmptyState, Heading, Notice, Skeleton, Text } from "@luxydrive/ui";
import { createFileRoute, createLink, redirect, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { ProviderOnly, ProviderPage, requireSession } from "../provider-page";
import { type Decision, decideRequest, listPendingRequests } from "../provider-reservations";
import { formatReservationDate } from "../reservation";
import { loadSession, setSessionUser, useSessionUser } from "../session";

export const Route = createFileRoute("/proveedor/solicitudes")({
  beforeLoad: requireSession,
  gcTime: 0,
  loader: {
    staleReloadMode: "blocking",
    handler: async ({ abortController, location }) => {
      const user = await loadSession();
      if (user?.role !== "provider") return [];
      const result = await listPendingRequests(abortController.signal);
      if (result.status === "expired") {
        setSessionUser(null);
        throw redirect({ to: "/acceso", search: { redirect: location.href } });
      }
      return result.requests;
    },
  },
  pendingComponent: RequestsLoading,
  errorComponent: RequestsError,
  component: ProviderRequests,
});

const BackLink = createLink(ButtonLink);
type Feedback = { tone: "info" | "error"; title: string };

function ProviderRequests() {
  const user = useSessionUser();
  const requests = Route.useLoaderData();
  const router = useRouter();
  const [savingId, setSavingId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  if (user?.role !== "provider") return <ProviderOnly />;

  async function decide(id: number, status: Decision) {
    setSavingId(id);
    setFeedback(null);
    try {
      const result = await decideRequest(id, status);
      if (result === "expired") {
        setSessionUser(null);
      } else if (result === "conflict") {
        setFeedback({
          tone: "info",
          title: "La solicitud ha cambiado. Revisa la lista actualizada.",
        });
      } else {
        setFeedback({
          tone: "info",
          title: status === "confirmed" ? "Solicitud confirmada" : "Solicitud rechazada",
        });
      }
    } catch {
      setFeedback({
        tone: "error",
        title: "No se ha podido verificar la decisión. Revisa las solicitudes pendientes.",
      });
    } finally {
      // Una decisión puede afectar a otras solicitudes de la misma experiencia.
      // Volver a leer también si se perdió la respuesta después de guardar.
      try {
        await router.invalidate({ sync: true });
      } finally {
        setSavingId(null);
      }
    }
  }

  return (
    <ProviderPage title="Solicitudes recibidas">
      <BackLink to="/proveedor" variant="tertiary" className="self-start">
        Volver a mis anuncios
      </BackLink>
      {feedback && <Notice tone={feedback.tone} title={feedback.title} />}
      {requests.length === 0 ? (
        <EmptyState title="No tienes solicitudes pendientes" />
      ) : (
        <ul
          aria-label="Solicitudes pendientes"
          aria-busy={savingId !== null}
          className="flex flex-col gap-6"
        >
          {requests.map((request) => (
            <li
              key={request.id}
              className="flex min-w-0 flex-wrap items-center justify-between gap-3"
            >
              <div className="flex min-w-0 max-w-full flex-col gap-1">
                <Heading as="h2" variant="title-md" className="break-words">
                  {request.experienceTitle}
                </Heading>
                <Text className="break-words">Solicitante: {request.clientName}</Text>
                <Text tone="muted" variant="body-sm">
                  <time dateTime={request.serviceAt}>
                    {formatReservationDate(request.serviceAt)}
                  </time>
                </Text>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  disabled={savingId !== null}
                  onClick={() => decide(request.id, "confirmed")}
                >
                  Aceptar
                </Button>
                <Button
                  variant="secondary"
                  disabled={savingId !== null}
                  onClick={() => decide(request.id, "rejected")}
                >
                  Rechazar
                </Button>
              </div>
              {savingId === request.id && (
                <Text role="status" variant="body-sm">
                  Guardando decisión…
                </Text>
              )}
            </li>
          ))}
        </ul>
      )}
    </ProviderPage>
  );
}

function RequestsLoading() {
  return (
    <ProviderPage title="Solicitudes recibidas">
      <div role="status" aria-label="Cargando solicitudes" aria-busy="true">
        <Skeleton className="h-16" />
      </div>
    </ProviderPage>
  );
}

function RequestsError() {
  const router = useRouter();
  return (
    <ProviderPage title="Solicitudes recibidas">
      <Notice
        tone="error"
        title="No se han podido cargar las solicitudes"
        action={
          <Button size="sm" variant="tertiary" onClick={() => router.invalidate()}>
            Reintentar
          </Button>
        }
      />
      <BackLink to="/proveedor" variant="tertiary" className="self-start">
        Volver a mis anuncios
      </BackLink>
    </ProviderPage>
  );
}
