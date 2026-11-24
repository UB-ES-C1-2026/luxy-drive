import { Button, ButtonLink, CircleCheck, Notice } from "@luxydrive/ui";
import { createLink } from "@tanstack/react-router";
import { useState } from "react";
import { client } from "./api";
import { setSessionUser, useSessionUser } from "./session";

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
      // La sesión la comprueba un middleware: su 401 no aparece en los tipos de la ruta.
      const status: number = res.status;
      if (status === 401) {
        setSessionUser(null);
        return;
      }
      if (res.status === 201) {
        setState((await res.json()).status === "pending" ? "pending" : "error");
        return;
      }
      if (res.status === 409) {
        // Ya tenía una solicitud pendiente de esta experiencia.
        setState("pending");
        return;
      }
      // 404: borrador o inexistente. 410: caducada, retirada o ya reservada por otra persona.
      if (res.status === 404 || res.status === 410) {
        setState("unavailable");
        return;
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
        La oferta ha caducado, el anuncio se ha retirado o ya la ha reservado otra persona.
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
