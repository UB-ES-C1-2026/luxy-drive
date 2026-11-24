import { client } from "./api";
import {
  isReservationSummary,
  type ReservationStatus,
  type ReservationSummary,
} from "./reservation";

export type Decision = Exclude<ReservationStatus, "pending">;
type ProviderReservation = ReservationSummary & { clientName: string };

function isProviderReservation(value: unknown): value is ProviderReservation {
  return (
    isReservationSummary(value) && "clientName" in value && typeof value.clientName === "string"
  );
}

export async function listPendingRequests(signal: AbortSignal) {
  const res = await client.api.provider.reservations.$get(
    {},
    { init: { signal, cache: "no-store" } },
  );
  // La sesión la comprueba un middleware: su 401 no aparece en los tipos de la ruta.
  const status: number = res.status;
  if (status === 401) return { status: "expired" } as const;
  if (!res.ok) throw new Error("requests_unavailable");
  const rows = await res.json();
  if (!Array.isArray(rows) || !rows.every(isProviderReservation)) {
    throw new Error("invalid_requests");
  }
  return { status: "ok", requests: rows.filter((row) => row.status === "pending") } as const;
}

export async function decideRequest(id: number, status: Decision) {
  const res = await client.api.provider.reservations[":id"].$patch({
    param: { id: String(id) },
    json: { status },
  });
  const code: number = res.status;
  if (code === 401) return "expired";
  if (res.status === 409) return "conflict";
  if (!res.ok) throw new Error("decision_unavailable");
  const saved = await res.json();
  if (
    !saved ||
    typeof saved !== "object" ||
    !("id" in saved) ||
    saved.id !== id ||
    !("status" in saved) ||
    saved.status !== status
  ) {
    throw new Error("unconfirmed_decision");
  }
  return "saved";
}
