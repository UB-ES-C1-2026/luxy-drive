import { Button, ButtonLink, CircleCheck, Notice } from "@luxydrive/ui";
import { createLink } from "@tanstack/react-router";
import { useState } from "react";
import { client, type JsonEndpoint, type ProposedApi } from "./api";
import { setSessionUser, useSessionUser } from "./session";

// Contrato propuesto para US-018.b (#106).
declare module "./api" {
  interface ApiContracts {
    createReservation: ProposedApi<{
      "/api/reservations": { $post: JsonEndpoint<{ json: { experienceId: number } }> };
    }>;
  }
}

const PageButton = createLink(ButtonLink);

type RequestState = "idle" | "sending" | "pending" | "unavailable" | "error";

export function RequestReservation({ experienceId }: { experienceId: number }) {
  const user = useSessionUser();
  if (user?.role === "provider") return null;
  if (!user) {
    return (
      <PageButton to="/acceso" search={{ redirect: `/experiencias/${experienceId}` }}>
        Inicia sesión para solicitar
      </PageButton>
    );
  }

  return <ClientRequest key={`${user.id}-${experienceId}`} experienceId={experienceId} />;
}

function ClientRequest({ experienceId }: { experienceId: number }) {
  const [state, setState] = useState<RequestState>("idle");

  async function submit() {
    setState("sending");
    try {
      const res = await client.api.reservations.$post({ json: { experienceId } });
      if (res.status === 401) {
        setSessionUser(null);
        return;
      }
      if (res.status === 410) {
        setState("unavailable");
        return;
      }
      if (res.status === 404) {
        // Un borrador no aparece en el detalle público. Distinguirlo de una ruta de API ausente.
        const detail = await client.api.experiences[":id"].$get({
          param: { id: String(experienceId) },
        });
        setState(detail.status === 404 || detail.status === 410 ? "unavailable" : "error");
        return;
      }
      const body = await res.json();
      if (body && typeof body === "object") {
        if (res.ok && "status" in body && body.status === "pending") {
          setState("pending");
          return;
        }
        if (!res.ok && "error" in body && body.error === "not_available") {
          setState("unavailable");
          return;
        }
      }
      setState("error");
    } catch {
      setState("error");
    }
  }

  if (state === "pending") {
    return (
      <Notice icon={<CircleCheck />} title="Solicitud pendiente">
        El proveedor ha recibido tu solicitud.
      </Notice>
    );
  }
  if (state === "unavailable") {
    return (
      <Notice title="Esta experiencia ya no está disponible">
        La oferta ha caducado o el anuncio se ha retirado.
      </Notice>
    );
  }
  return (
    <div className="flex flex-col gap-3" aria-busy={state === "sending"}>
      {state === "error" && (
        <Notice tone="error" title="No se ha podido comprobar el envío">
          <PageButton to="/cuenta" size="sm" variant="tertiary">
            Consultar mis reservas
          </PageButton>
        </Notice>
      )}
      <Button disabled={state === "sending"} onClick={submit}>
        {state === "sending" ? "Enviando solicitud…" : "Solicitar reserva"}
      </Button>
    </div>
  );
}
