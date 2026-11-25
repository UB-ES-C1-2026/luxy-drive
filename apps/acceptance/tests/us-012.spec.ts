import { expect, type Listing, test } from "../support/actors";

// US-012 · Ver mis anuncios — https://trello.com/c/StSpD38N

test("US-012 · C1 · El proveedor ve sus anuncios y el estado de cada uno", async ({ signUp }) => {
  const provider = await signUp("provider");
  const draft = await provider.createDraft();
  const published = await provider.publishListing();

  const page = await provider.context.newPage();
  await page.goto("/proveedor");

  const listings = page.getByRole("region", { name: "Tus anuncios" }).getByRole("listitem");
  await expect(listings).toHaveCount(2);
  await expect(listings.filter({ hasText: draft.title })).toContainText("Borrador");
  await expect(listings.filter({ hasText: published.title })).toContainText("Publicado");
});

test("US-012 · C2 · Los anuncios de otro proveedor no aparecen entre los suyos", async ({
  signUp,
}) => {
  const provider = await signUp("provider");
  const other = await signUp("provider");
  const own = await provider.publishListing();
  const foreign = await other.publishListing();

  const res = await provider.get("/api/provider/experiences");
  expect(res.status()).toBe(200);
  const ids = ((await res.json()) as Listing[]).map((listing) => listing.id);

  expect(ids).toEqual([own.id]);
  expect(ids).not.toContain(foreign.id);
});
