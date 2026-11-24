import { expect, type Reservation, test } from "../support/actors";

// US-018 · Solicitar una experiencia disponible — https://trello.com/c/a2Z2lIzc

test("US-018 · C1 · El cliente solicita una oferta y ve su solicitud pendiente", async ({
  signUp,
}) => {
  const provider = await signUp("provider");
  const client = await signUp("client");
  const listing = await provider.publishListing();

  const page = await client.context.newPage();
  await page.goto(`/experiencias/${listing.id}`);
  await page.getByRole("button", { name: "Solicitar reserva" }).click();

  await expect(page.getByText("Solicitud pendiente")).toBeVisible();
});

test("US-018 · C2 · De dos solicitudes de la misma experiencia solo una queda confirmada", async ({
  signUp,
}) => {
  const provider = await signUp("provider");
  const listing = await provider.publishListing();
  const first = await (await signUp("client")).requestReservation(listing.id);
  const second = await (await signUp("client")).requestReservation(listing.id);

  // El proveedor intenta confirmar las dos a la vez.
  const decisions = await Promise.all(
    [first, second].map((request) =>
      provider.patch(`/api/provider/reservations/${request.id}`, { status: "confirmed" }),
    ),
  );
  expect(decisions.map((res) => res.status()).sort()).toEqual([200, 409]);

  const res = await provider.get("/api/provider/reservations");
  expect(res.status()).toBe(200);
  const statuses = ((await res.json()) as Reservation[])
    .filter((request) => request.experienceId === listing.id)
    .map((request) => request.status);
  expect(statuses.sort()).toEqual(["confirmed", "rejected"]);
});

// La caducidad no se puede forzar desde fuera sin esperar. Un anuncio retirado (US-014) deja
// de estar disponible por la misma regla que una oferta caducada.
test("US-018 · C3 · No se crea la reserva de un borrador ni de una oferta que ya no está disponible", async ({
  signUp,
}) => {
  const provider = await signUp("provider");
  const client = await signUp("client");
  const draft = await provider.createDraft();
  const gone = await provider.publishListing();
  const withdrawn = await provider.post(`/api/provider/experiences/${gone.id}/withdraw`);
  expect(withdrawn.status(), "retirar el anuncio").toBe(200);

  const onDraft = await client.post("/api/reservations", { experienceId: draft.id });
  expect(onDraft.status()).toBe(404);
  const onGone = await client.post("/api/reservations", { experienceId: gone.id });
  expect(onGone.status()).toBe(410);

  const received = await provider.get("/api/provider/reservations");
  expect(await received.json()).toEqual([]);

  const page = await client.context.newPage();
  await page.goto(`/experiencias/${gone.id}`);
  await expect(page.getByText("Esta experiencia ya no está disponible")).toBeVisible();
});
