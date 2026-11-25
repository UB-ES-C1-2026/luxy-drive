export const reservationStatusLabel = {
  pending: "Pendiente",
  confirmed: "Confirmada",
  rejected: "Rechazada",
};

export type ReservationStatus = keyof typeof reservationStatusLabel;

export type ReservationSummary = {
  id: number;
  experienceTitle: string;
  serviceAt: string;
  status: ReservationStatus;
};

export function isReservationSummary(value: unknown): value is ReservationSummary {
  if (!value || typeof value !== "object") return false;
  return (
    "id" in value &&
    typeof value.id === "number" &&
    Number.isSafeInteger(value.id) &&
    value.id > 0 &&
    "experienceTitle" in value &&
    typeof value.experienceTitle === "string" &&
    "serviceAt" in value &&
    typeof value.serviceAt === "string" &&
    Number.isFinite(Date.parse(value.serviceAt)) &&
    "status" in value &&
    (value.status === "pending" || value.status === "confirmed" || value.status === "rejected")
  );
}

const serviceDate = new Intl.DateTimeFormat("es-ES", {
  timeZone: "Europe/Madrid",
  dateStyle: "medium",
  timeStyle: "short",
});

export function formatReservationDate(iso: string) {
  return serviceDate.format(new Date(iso));
}
