import {
  Button,
  ButtonLink,
  ChevronLeft,
  Container,
  EmptyState,
  Heading,
  ListingCard,
  ListingCardSkeleton,
  type ListingCategory,
  ListingGrid,
  Logo,
  Notice,
  OfferBadge,
  Section,
  Sparkles,
  Text,
  TextLink,
  TopNav,
} from "@luxydrive/ui";
import { createFileRoute, createLink, Link, useRouter } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { client } from "../api";

export const Route = createFileRoute("/ofertas")({
  loader: async () => {
    const res = await client.api.offers.$get();
    if (!res.ok) throw new Error("offers_unavailable");
    return res.json();
  },
  pendingComponent: OffersLoading,
  errorComponent: OffersError,
  component: Offers,
});

const BackLink = createLink(TextLink);
const CatalogButton = createLink(ButtonLink);

const categoryLabel: Record<ListingCategory, string> = {
  jet: "Jet privado",
  yacht: "Yate",
  camper: "Autocaravana",
};

const offerBadge = {
  empty_leg: <OfferBadge icon={<Sparkles aria-hidden />}>Empty leg</OfferBadge>,
  last_minute: <OfferBadge>Oferta flash</OfferBadge>,
};

// La API manda las fechas en UTC; aquí siempre las enseñamos en hora de Madrid.
const serviceDate = new Intl.DateTimeFormat("es-ES", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Madrid",
});
const expiryDate = new Intl.DateTimeFormat("es-ES", {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Madrid",
});

function Offers() {
  // La API ya excluye las caducadas; esto cubre las que caducan con la página abierta.
  const offers = Route.useLoaderData().filter(
    (offer) => new Date(offer.offerExpiresAt).getTime() > Date.now(),
  );

  if (offers.length === 0) {
    return (
      <OffersPage>
        <EmptyState
          icon={<Sparkles aria-hidden />}
          title="Ahora mismo no hay ofertas activas"
          description="Las ofertas flash y los empty legs aparecen aquí en cuanto un proveedor publica uno. Mientras, puedes ver todas las experiencias disponibles."
          action={
            <CatalogButton to="/experiencias" variant="secondary">
              Ver todas las experiencias
            </CatalogButton>
          }
        />
      </OffersPage>
    );
  }

  const count = offers.length;

  return (
    <OffersPage subtitle={count === 1 ? "1 oferta activa" : `${count} ofertas activas`}>
      <ListingGrid>
        {offers.map((offer) => (
          <li key={offer.id}>
            <ListingCard
              category={offer.category}
              image={{ src: `/images/${offer.category}.jpg`, alt: categoryLabel[offer.category] }}
              badge={offerBadge[offer.offerType]}
              title={offer.title}
              href={`/experiencias/${offer.id}`}
              location={`${categoryLabel[offer.category]} · ${offer.location} · ${serviceDate.format(new Date(offer.serviceAt))}`}
              dates={`Oferta hasta el ${expiryDate.format(new Date(offer.offerExpiresAt))}`}
              price={offer.price}
              originalPrice={offer.originalPrice}
              priceUnit={offer.priceUnit}
            />
          </li>
        ))}
      </ListingGrid>
    </OffersPage>
  );
}

function OffersLoading() {
  return (
    <OffersPage>
      <ListingGrid aria-busy="true" aria-label="Cargando ofertas">
        {[1, 2, 3, 4].map((n) => (
          <li key={n}>
            <ListingCardSkeleton />
          </li>
        ))}
      </ListingGrid>
    </OffersPage>
  );
}

function OffersError() {
  const router = useRouter();

  return (
    <OffersPage>
      <Notice
        tone="error"
        title="No se han podido cargar las ofertas"
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
    </OffersPage>
  );
}

function OffersPage({ subtitle, children }: { subtitle?: string; children: ReactNode }) {
  return (
    <>
      <TopNav
        brand={
          <Link to="/" aria-label="LuxyDrive, inicio" className="mb-3 md:mb-0">
            <Logo />
          </Link>
        }
      />
      <main>
        <Container size="wide">
          <Section className="flex flex-col gap-8">
            <BackLink to="/experiencias" className="inline-flex items-center gap-1 self-start">
              <ChevronLeft aria-hidden className="size-4" />
              Volver al catálogo
            </BackLink>
            <div className="flex flex-col gap-1">
              <Heading as="h1" variant="display-xl">
                Ofertas flash y empty legs
              </Heading>
              <Text tone="muted">
                {subtitle
                  ? `${subtitle}, de la que caduca antes a la que caduca después.`
                  : "Precios con descuento durante un tiempo limitado."}
              </Text>
            </div>
            {children}
          </Section>
        </Container>
      </main>
    </>
  );
}
