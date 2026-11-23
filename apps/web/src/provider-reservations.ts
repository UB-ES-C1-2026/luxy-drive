import { client, type JsonEndpoint, type ProposedApi } from "./api";
import {
  isReservationSummary,
  type ReservationStatus,
  type ReservationSummary,
} from "./reservation";

export type Decision = Exclude<ReservationStatus, "pending">;
type ProviderReservation = ReservationSummary & { clientName: string };

// Contrato propuesto para US-020.b (#109). El servidor aplica las reglas de SP-003.
declare module "./api" {
  interface ApiContracts {
    providerReservations: ProposedApi<{
      "/api/provider/reservations": { $get: JsonEndpoint<Record<string, never>> };
      "/api/provider/reservations/:id": {
        $patch: JsonEndpoint<{ param: { id: string }; json: { status: Decision } }>;
      };
    }>;
  }
}

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
  if (res.status === 401) return { status: "expired" } as const;
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
  if (res.status === 401) return "expired";
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
