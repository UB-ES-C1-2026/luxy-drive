import {
  Avatar,
  Button,
  ButtonLink,
  Divider,
  Heading,
  Notice,
  Plus,
  Text,
  TextLink,
} from "@luxydrive/ui";
import { createFileRoute, createLink, useRouter } from "@tanstack/react-router";
import { client } from "../api";
import { categoryLabel } from "../draft-wizard";
import { ProviderOnly, ProviderPage, requireSession } from "../provider-page";
import { loadSession, useSessionUser } from "../session";

export const Route = createFileRoute("/proveedor/")({
  beforeLoad: requireSession,
  loader: async () => {
    // A un cliente no le pedimos sus anuncios: la página le explica que es zona de proveedor.
    if ((await loadSession())?.role !== "provider") return [];
    const res = await client.api.provider.experiences.$get();
    if (!res.ok) throw new Error("listings_unavailable");
    return res.json();
  },
  errorComponent: ListingsError,
  component: ProviderHome,
});

const PageButton = createLink(ButtonLink);
const ListingLink = createLink(TextLink);

function ProviderHome() {
  const user = useSessionUser();
  const listings = Route.useLoaderData();

  if (!user) return <ProviderPage>{null}</ProviderPage>;
  if (user.role !== "provider") return <ProviderOnly />;

  return (
    <ProviderPage>
      <div className="flex items-center gap-4">
        <Avatar name={user.name} size="lg" />
        <div className="flex min-w-0 flex-col gap-1">
          <Heading as="h1" variant="display-xl" className="break-words">
            Hola, {user.name}
          </Heading>
          <Text tone="muted">Cuenta de proveedor</Text>
        </div>
      </div>
      <Text tone="body">
        Empieza por el perfil de tu empresa: es lo que verán los clientes junto a tus anuncios.
      </Text>
      <div className="flex flex-wrap gap-3">
        {/* El perfil (US-008) es otra historia: enlace normal, no ruta tipada. */}
        <ButtonLink href="/proveedor/perfil" variant="secondary">
          Perfil de empresa
        </ButtonLink>
        <PageButton to="/proveedor/anuncios/nuevo">
          <Plus aria-hidden className="size-4" />
          Nuevo anuncio
        </PageButton>
      </div>
      <Divider />
      <section aria-labelledby="my-listings" className="flex flex-col gap-4">
        <Heading as="h2" id="my-listings" variant="display-sm">
          Tus anuncios
        </Heading>
        {listings.length === 0 ? (
          <Text tone="muted">
            Aún no tienes anuncios. Crea uno: puedes guardarlo como borrador y terminarlo después.
          </Text>
        ) : (
          <ul className="flex flex-col divide-y divide-hairline">
            {listings.map((listing) => (
              <li
                key={listing.id}
                className="flex flex-wrap items-center justify-between gap-2 py-4"
              >
                <div className="flex min-w-0 flex-col gap-1">
                  <ListingLink
                    to="/proveedor/anuncios/$id"
                    params={{ id: String(listing.id) }}
                    className="break-words"
                  >
                    {listing.title}
                  </ListingLink>
                  <Text variant="body-sm" tone="muted">
                    {[listing.category && categoryLabel[listing.category], listing.location]
                      .filter(Boolean)
                      .join(" · ") || "Sin categoría ni ubicación todavía"}
                  </Text>
                </div>
                <Text
                  as="span"
                  variant="body-sm"
                  tone={listing.status === "draft" ? "muted" : "ink"}
                >
                  {listing.status === "draft" ? "Borrador" : "Publicado"}
                </Text>
              </li>
            ))}
          </ul>
        )}
      </section>
    </ProviderPage>
  );
}

function ListingsError() {
  const router = useRouter();

  return (
    <ProviderPage>
      <Notice
        tone="error"
        title="No se han podido cargar tus anuncios"
        action={
          <Button
            variant="tertiary"
            size="sm"
            className="h-auto"
            onClick={() => router.invalidate()}
          >
            Reintentar
          </Button>
        }
      >
        Comprueba tu conexión e inténtalo de nuevo.
      </Notice>
    </ProviderPage>
  );
}
