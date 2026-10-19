import {
  Button,
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
  Search,
  Section,
  Sparkles,
  Text,
  TopNav,
} from "@luxydrive/ui";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { client } from "../api";

export const Route = createFileRoute("/experiencias/")({
  loader: async () => {
    const res = await client.api.experiences.$get();
    if (!res.ok) throw new Error("experiences_unavailable");
    return res.json();
  },
  pendingComponent: CatalogLoading,
  errorComponent: CatalogError,
  component: Catalog,
});

const categoryLabel: Record<ListingCategory, string> = {
  jet: "Jet privado",
  yacht: "Yate",
  camper: "Autocaravana",
};

const offerBadge = {
  standard: null,
  empty_leg: <OfferBadge icon={<Sparkles aria-hidden />}>Empty leg</OfferBadge>,
  last_minute: <OfferBadge>Última hora</OfferBadge>,
};

// La API manda la fecha en UTC; aquí siempre la enseñamos en hora de Madrid.
const serviceDate = new Intl.DateTimeFormat("es-ES", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Madrid",
});

function Catalog() {
  const experiences = Route.useLoaderData();

  if (experiences.length === 0) {
    return (
      <CatalogPage>
        <EmptyState
          icon={<Search aria-hidden />}
          title="No hay experiencias disponibles"
          description="Vuelve a mirar en unos días."
        />
      </CatalogPage>
    );
  }

  const count = experiences.length;

  return (
    <CatalogPage subtitle={count === 1 ? "1 experiencia" : `${count} experiencias`}>
      <ListingGrid>
        {experiences.map((experience) => (
          <li key={experience.id}>
            <ListingCard
              category={experience.category}
              image={{
                src: `/images/${experience.category}.jpg`,
                alt: categoryLabel[experience.category],
              }}
              badge={offerBadge[experience.offerType]}
              title={experience.title}
              location={`${categoryLabel[experience.category]} · ${experience.location}`}
              dates={serviceDate.format(new Date(experience.serviceAt))}
              price={experience.price}
              priceUnit={experience.priceUnit}
            />
          </li>
        ))}
      </ListingGrid>
    </CatalogPage>
  );
}

function CatalogLoading() {
  return (
    <CatalogPage>
      <ListingGrid aria-busy="true" aria-label="Cargando experiencias">
        {[1, 2, 3, 4].map((n) => (
          <li key={n}>
            <ListingCardSkeleton />
          </li>
        ))}
      </ListingGrid>
    </CatalogPage>
  );
}

function CatalogError() {
  const router = useRouter();

  return (
    <CatalogPage>
      <Notice
        tone="error"
        title="No se han podido cargar las experiencias"
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
    </CatalogPage>
  );
}

function CatalogPage({ subtitle, children }: { subtitle?: string; children: ReactNode }) {
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
            <div className="flex flex-col gap-1">
              <Heading as="h1" variant="display-xl">
                Experiencias disponibles
              </Heading>
              {subtitle && <Text tone="muted">{subtitle}</Text>}
            </div>
            {children}
          </Section>
        </Container>
      </main>
    </>
  );
}
