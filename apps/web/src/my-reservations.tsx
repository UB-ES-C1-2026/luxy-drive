import { Button, EmptyState, Heading, Notice, Skeleton, Text } from "@luxydrive/ui";
import { useRouter } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { client, type JsonEndpoint, type ProposedApi } from "./api";
import {
  formatReservationDate,
  isReservationSummary,
  type ReservationSummary,
  reservationStatusLabel,
} from "./reservation";
import { setSessionUser } from "./session";

// Contrato propuesto para US-019.b (#112). La identidad la determina la cookie de sesión.
declare module "./api" {
  interface ApiContracts {
    myReservations: ProposedApi<{
      "/api/reservations": { $get: JsonEndpoint<Record<string, never>> };
    }>;
  }
}

type LoadState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; reservations: ReservationSummary[] };

export function MyReservations() {
  const router = useRouter();
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const active = useRef<AbortController | null>(null);

  // Cargar solo esta sección: la cuenta y el botón de salir siguen disponibles si falla la API.
  const refresh = useCallback(async () => {
    active.current?.abort();
    const controller = new AbortController();
    active.current = controller;
    const { signal } = controller;
    setState({ status: "loading" });
    try {
      const res = await client.api.reservations.$get({}, { init: { signal, cache: "no-store" } });
      if (signal.aborted) return;
      if (res.status === 401) {
        setSessionUser(null);
        await router.invalidate();
        return;
      }
      if (!res.ok) throw new Error("reservations_unavailable");
      const rows = await res.json();
      if (!Array.isArray(rows) || !rows.every(isReservationSummary)) {
        throw new Error("invalid_reservations");
      }
      if (!signal.aborted) setState({ status: "ready", reservations: rows });
    } catch {
      if (!signal.aborted) setState({ status: "error" });
    }
  }, [router]);

  useEffect(() => {
    void refresh();
    return () => active.current?.abort();
  }, [refresh]);

  return (
    <section
      aria-labelledby="my-reservations"
      aria-busy={state.status === "loading"}
      className="flex min-w-0 flex-col gap-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Heading as="h2" id="my-reservations" variant="display-sm">
          Mis reservas
        </Heading>
        {state.status === "ready" && (
          <Button variant="tertiary" size="sm" onClick={refresh}>
            Actualizar
          </Button>
        )}
      </div>
      {state.status === "loading" && (
        <div role="status" aria-label="Cargando mis reservas">
          <Skeleton className="h-16" />
        </div>
      )}
      {state.status === "error" && (
        <Notice
          tone="error"
          title="No se han podido cargar tus reservas"
          action={
            <Button variant="tertiary" size="sm" onClick={refresh}>
              Reintentar
            </Button>
          }
        />
      )}
      {state.status === "ready" &&
        (state.reservations.length === 0 ? (
          <EmptyState title="Aún no tienes reservas" />
        ) : (
          <ul aria-label="Mis reservas" className="flex flex-col gap-5">
            {state.reservations.map((request) => (
              <li
                key={request.id}
                className="flex min-w-0 flex-wrap items-start justify-between gap-2"
              >
                <div className="flex min-w-0 max-w-full flex-col gap-1">
                  <Heading as="h3" variant="title-md" className="break-words">
                    {request.experienceTitle}
                  </Heading>
                  <Text variant="body-sm" tone="muted">
                    <time dateTime={request.serviceAt}>
                      {formatReservationDate(request.serviceAt)}
                    </time>
                  </Text>
                </div>
                <Text as="strong" variant="body-sm">
                  {reservationStatusLabel[request.status]}
                </Text>
              </li>
            ))}
          </ul>
        ))}
    </section>
  );
}
