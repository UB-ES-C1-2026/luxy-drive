import { expect, test } from "../support/actors";

// US-014 · Dejar de ofrecer un anuncio — https://trello.com/c/9wR1He2b

test("US-014 · C1 · Un anuncio retirado desaparece del catálogo", async ({ signUp, visitor }) => {
  const provider = await signUp("provider");
  const listing = await provider.publishListing();
  expect(await visitor.catalogIds()).toContain(listing.id);

  const withdrawn = await provider.post(`/api/provider/experiences/${listing.id}/withdraw`);
  expect(withdrawn.status(), "retirar el anuncio").toBe(200);

  expect(await visitor.catalogIds()).not.toContain(listing.id);
  const detail = await visitor.get(`/api/experiences/${listing.id}`);
  expect(detail.status()).toBe(410);
});

test("US-014 · C2 · No puede retirar el anuncio de otro proveedor, que sigue disponible", async ({
  signUp,
  visitor,
}) => {
  const owner = await signUp("provider");
  const other = await signUp("provider");
  const listing = await owner.publishListing();

  const attempt = await other.post(`/api/provider/experiences/${listing.id}/withdraw`);
  expect(attempt.status()).toBe(403);

  expect(await visitor.catalogIds()).toContain(listing.id);
});
