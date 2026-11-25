import { type Actor, expect, inDays, madridLocal, test } from "../support/actors";

// US-016 · Ofrecer una plaza de última hora o sin usar — https://trello.com/c/CYQcxvYr

type Offer = {
  id: number;
  price: number;
  originalPrice: number;
  offerType: string;
  offerExpiresAt: string;
};

async function offersFor(actor: Actor, listingId: number) {
  const res = await actor.get("/api/offers");
  expect(res.status(), "consultar las ofertas").toBe(200);
  return ((await res.json()) as Offer[]).filter((offer) => offer.id === listingId);
}

test("US-016 · C1 · La oferta aparece en ofertas con su precio y su vigencia", async ({
  signUp,
  visitor,
}) => {
  const provider = await signUp("provider");
  const listing = await provider.publishListing();
  const until = inDays(1);

  const created = await provider.post(`/api/provider/experiences/${listing.id}/offer`, {
    type: "last_minute",
    price: 650.5,
    until: madridLocal(until),
  });
  expect(created.status(), "publicar la oferta").toBe(201);

  const [offer] = await offersFor(visitor, listing.id);
  expect(offer).toMatchObject({ price: 650.5, originalPrice: 1000, offerType: "last_minute" });
  expect(new Date(offer?.offerExpiresAt ?? 0)).toEqual(until);
});

// La caducidad no se puede forzar desde fuera sin esperar: la cubren los tests de la API
// (apps/api/test). Aquí se comprueba la otra mitad del criterio, la oferta retirada.
test("US-016 · C2 · Una oferta retirada no aparece en ofertas", async ({ signUp, visitor }) => {
  const provider = await signUp("provider");
  const listing = await provider.publishListing();
  const created = await provider.post(`/api/provider/experiences/${listing.id}/offer`, {
    type: "empty_leg",
    price: 700,
    until: madridLocal(inDays(1)),
  });
  expect(created.status(), "publicar la oferta").toBe(201);
  expect(await offersFor(visitor, listing.id)).toHaveLength(1);

  const ended = await provider.delete(`/api/provider/experiences/${listing.id}/offer`);
  expect(ended.status(), "retirar la oferta").toBe(200);

  expect(await offersFor(visitor, listing.id)).toHaveLength(0);
});

test("US-016 · C3 · Con una oferta activa no se puede activar otra: queda un solo precio", async ({
  signUp,
  visitor,
}) => {
  const provider = await signUp("provider");
  const listing = await provider.publishListing();
  const first = await provider.post(`/api/provider/experiences/${listing.id}/offer`, {
    type: "last_minute",
    price: 800,
    until: madridLocal(inDays(2)),
  });
  expect(first.status(), "publicar la primera oferta").toBe(201);

  const second = await provider.post(`/api/provider/experiences/${listing.id}/offer`, {
    type: "empty_leg",
    price: 500,
    until: madridLocal(inDays(1)),
  });
  expect(second.status()).toBe(409);
  expect(await second.json()).toEqual({ error: "offer_active" });

  const offers = await offersFor(visitor, listing.id);
  expect(offers).toHaveLength(1);
  expect(offers[0]).toMatchObject({ price: 800, offerType: "last_minute" });
});
