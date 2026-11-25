import { expect, test } from "../support/actors";

// US-013 · Corregir un anuncio publicado — https://trello.com/c/KAvfrsSO

test("US-013 · C1 · Quien consulta el anuncio ve el dato corregido", async ({
  signUp,
  visitor,
}) => {
  const provider = await signUp("provider");
  const listing = await provider.publishListing();

  const saved = await provider.patch(`/api/provider/experiences/${listing.id}`, {
    location: "Mahón",
    price: 1250,
  });
  expect(saved.status(), "guardar la corrección").toBe(200);

  const detail = await visitor.get(`/api/experiences/${listing.id}`);
  expect(detail.status()).toBe(200);
  expect(await detail.json()).toMatchObject({ location: "Mahón", price: 1250 });
});

test("US-013 · C2 · No puede modificar el anuncio de otro proveedor, que sigue igual", async ({
  signUp,
  visitor,
}) => {
  const owner = await signUp("provider");
  const other = await signUp("provider");
  const listing = await owner.publishListing();

  const attempt = await other.patch(`/api/provider/experiences/${listing.id}`, {
    title: "QA · Título cambiado por otro proveedor",
  });
  expect(attempt.status()).toBe(403);

  const detail = await visitor.get(`/api/experiences/${listing.id}`);
  expect(detail.status()).toBe(200);
  expect(await detail.json()).toMatchObject({ title: listing.title });
});
