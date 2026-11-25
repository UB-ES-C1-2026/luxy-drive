import { expect, type Reservation, test } from "../support/actors";

// US-020 · Resolver una solicitud — https://trello.com/c/Tc8TT3JP

test("US-020 · C1 · El cliente ve el estado que ha decidido el proveedor", async ({ signUp }) => {
  const provider = await signUp("provider");
  const client = await signUp("client");
  const accepted = await client.requestReservation((await provider.publishListing()).id);
  const rejected = await client.requestReservation((await provider.publishListing()).id);

  const accept = await provider.patch(`/api/provider/reservations/${accepted.id}`, {
    status: "confirmed",
  });
  expect(accept.status(), "aceptar la solicitud").toBe(200);
  const reject = await provider.patch(`/api/provider/reservations/${rejected.id}`, {
    status: "rejected",
  });
  expect(reject.status(), "rechazar la solicitud").toBe(200);

  // Lo que ve el cliente en "Mis reservas" (US-019).
  const res = await client.get("/api/reservations");
  expect(res.status(), "consultar mis reservas").toBe(200);
  const seen = new Map(((await res.json()) as Reservation[]).map((r) => [r.id, r.status]));
  expect(seen.get(accepted.id)).toBe("confirmed");
  expect(seen.get(rejected.id)).toBe("rejected");
});

test("US-020 · C2 · No puede resolver la solicitud de otro proveedor y el estado no cambia", async ({
  signUp,
}) => {
  const owner = await signUp("provider");
  const other = await signUp("provider");
  const client = await signUp("client");
  const request = await client.requestReservation((await owner.publishListing()).id);

  const attempt = await other.patch(`/api/provider/reservations/${request.id}`, {
    status: "confirmed",
  });
  expect(attempt.status()).toBe(403);

  const res = await owner.get("/api/provider/reservations");
  expect(res.status()).toBe(200);
  const current = ((await res.json()) as Reservation[]).find((r) => r.id === request.id);
  expect(current?.status).toBe("pending");
});
