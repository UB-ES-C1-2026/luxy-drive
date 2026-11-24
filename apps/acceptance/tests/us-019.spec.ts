import { expect, type Reservation, test } from "../support/actors";

// US-019 · Ver el estado de mis reservas — https://trello.com/c/nzX7sRIf

test("US-019 · C1 · El cliente ve sus reservas y el estado de cada una", async ({ signUp }) => {
  const provider = await signUp("provider");
  const client = await signUp("client");
  const listing = await provider.publishListing();
  await client.requestReservation(listing.id);

  const page = await client.context.newPage();
  await page.goto("/cuenta");

  const reservations = page.getByRole("list", { name: "Mis reservas" }).getByRole("listitem");
  await expect(reservations).toHaveCount(1);
  await expect(reservations.filter({ hasText: listing.title })).toContainText("Pendiente");
});

test("US-019 · C2 · Un cliente no accede a la reserva de otro cliente", async ({ signUp }) => {
  const provider = await signUp("provider");
  const client = await signUp("client");
  const other = await signUp("client");
  const listing = await provider.publishListing();
  const reservation = await client.requestReservation(listing.id);

  const mine = await client.get("/api/reservations");
  expect(mine.status()).toBe(200);
  expect(((await mine.json()) as Reservation[]).map((r) => r.id)).toEqual([reservation.id]);

  const theirs = await other.get("/api/reservations");
  expect(theirs.status()).toBe(200);
  expect(await theirs.json()).toEqual([]);
});
