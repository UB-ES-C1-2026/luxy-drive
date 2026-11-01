import {
  AmenityList,
  BookingCard,
  Button,
  ButtonLink,
  CalendarDays,
  Caravan,
  ChevronLeft,
  CircleAlert,
  Container,
  EmptyState,
  formatPriceCents,
  Heading,
  type ListingCategory,
  ListingPhoto,
  Logo,
  Notice,
  OfferBadge,
  Plane,
  Sailboat,
  Search,
  Skeleton,
  Sparkles,
  Text,
  TextLink,
  TopNav,
  Users,
} from "@luxydrive/ui";
import { createFileRoute, createLink, Link, useRouter } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { client } from "../api";
import { splitPrice } from "../price";

export const Route = createFileRoute("/experiencias/$id")({
  loader: async ({ params }) => {
    const res = await client.api.experiences[":id"].$get({ param: { id: params.id } });
    if (res.status === 200) return { status: "available" as const, experience: await res.json() };
    // 410: existe pero ya no se ofrece. La API no devuelve sus datos.
    if (res.status === 410) return { status: "not_available" as const };
    if (res.status === 404 || res.status === 400) return { status: "not_found" as const };
    throw new Error("experience_unavailable");
  },
  pendingComponent: DetailLoading,
  errorComponent: DetailError,
  component: ExperienceDetail,
});

const BackLink = createLink(TextLink);
const CatalogButton = createLink(ButtonLink);

const categoryLabel: Record<ListingCategory, string> = {
  jet: "Jet privado",
  yacht: "Yate",
  camper: "Autocaravana",
};

const categoryIcon: Record<ListingCategory, ReactNode> = {
  jet: <Plane aria-hidden />,
  yacht: <Sailboat aria-hidden />,
  camper: <Caravan aria-hidden />,
};

const offerBadge = {
  standard: null,
  empty_leg: <OfferBadge icon={<Sparkles aria-hidden />}>Empty leg</OfferBadge>,
  last_minute: <OfferBadge>Última hora</OfferBadge>,
};

// La API manda la fecha en UTC; aquí siempre la enseñamos en hora de Madrid.
const serviceDay = new Intl.DateTimeFormat("es-ES", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "Europe/Madrid",
});
const serviceTime = new Intl.DateTimeFormat("es-ES", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Madrid",
});

function formatService(iso: string) {
  const date = new Date(iso);
  return `${serviceDay.format(date)} · ${serviceTime.format(date)}`;
}

const persons = (n: number) => (n === 1 ? "1 persona" : `${n} personas`);

// Precio por persona con la capacidad completa. Si no sale exacto a céntimos, se dice
// cuántas personas pagan un céntimo menos para que la suma sea el precio total.
function PerPersonPrice({ price, capacity }: { price: number; capacity: number }) {
  const { base, higher, extra } = splitPrice(price, capacity);
  const rest = capacity - extra;

  return (
    <>
      <p>
        {formatPriceCents(extra > 0 ? higher : base)} por persona ({persons(capacity)})
      </p>
      {extra > 0 && (
        <p>
          {rest === 1 ? "1 persona paga" : `${rest} personas pagan`} {formatPriceCents(base)} para
          que la suma sea exactamente el total.
        </p>
      )}
    </>
  );
}

function ExperienceDetail() {
  const result = Route.useLoaderData();

  if (result.status === "not_found") {
    return (
      <DetailPage>
        <EmptyState
          icon={<Search aria-hidden />}
          title="No encontramos esta experiencia"
          description="Puede que el enlace esté mal escrito o que la experiencia se haya retirado."
          action={<CatalogButton to="/experiencias">Ver experiencias disponibles</CatalogButton>}
        />
      </DetailPage>
    );
  }

  if (result.status === "not_available") {
    return (
      <DetailPage>
        <EmptyState
          icon={<CircleAlert aria-hidden />}
          title="Esta experiencia ya no está disponible"
          description="La oferta ha caducado o la fecha de servicio ya ha pasado."
          action={<CatalogButton to="/experiencias">Ver experiencias disponibles</CatalogButton>}
        />
      </DetailPage>
    );
  }

  const { experience } = result;
  const people = experience.capacity === 1 ? "1 persona" : `Hasta ${experience.capacity} personas`;

  return (
    <DetailPage backLink>
      {/* Móvil: foto, título, precio y datos. Escritorio: título arriba y precio en el lateral. */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-[minmax(0,1fr)_280px] md:gap-x-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-x-16">
        <ListingPhoto
          category={experience.category}
          aspect="landscape"
          image={{
            src: `/images/${experience.category}.jpg`,
            alt: categoryLabel[experience.category],
          }}
          className="md:col-start-1 md:row-start-2"
        >
          {offerBadge[experience.offerType] && (
            <div className="absolute top-3 left-3">{offerBadge[experience.offerType]}</div>
          )}
        </ListingPhoto>

        <div className="flex flex-col gap-1 md:col-span-2 md:row-start-1">
          <Heading as="h1" variant="display-lg">
            {experience.title}
          </Heading>
          <Text tone="muted">
            {categoryLabel[experience.category]} · {experience.location}
          </Text>
        </div>

        <BookingCard
          price={experience.price}
          priceUnit={experience.priceUnit}
          priceDetail={<PerPersonPrice price={experience.price} capacity={experience.capacity} />}
          className="md:sticky md:top-6 md:col-start-2 md:row-span-2 md:row-start-2 md:self-start"
        />

        <div className="flex flex-col gap-8 md:col-start-1 md:row-start-3">
          <AmenityList
            items={[
              { icon: categoryIcon[experience.category], label: experience.vehicle },
              { icon: <Users aria-hidden />, label: people },
              { icon: <CalendarDays aria-hidden />, label: formatService(experience.serviceAt) },
            ]}
          />
          <section className="flex flex-col gap-3">
            <Heading as="h2" variant="display-md">
              Descripción
            </Heading>
            <Text tone="body">{experience.description}</Text>
          </section>
        </div>
      </div>
    </DetailPage>
  );
}

function DetailLoading() {
  return (
    <DetailPage backLink>
      <section aria-busy="true" aria-label="Cargando experiencia" className="flex flex-col gap-6">
        <Skeleton className="h-7 w-3/4 rounded-sm md:w-1/2" />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-[minmax(0,1fr)_280px] md:gap-x-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-x-16">
          <Skeleton className="aspect-[4/3]" />
          <Skeleton className="h-20" />
        </div>
        <Skeleton className="h-4 w-2/3 rounded-sm" />
        <Skeleton className="h-4 w-1/2 rounded-sm" />
      </section>
    </DetailPage>
  );
}

function DetailError() {
  const router = useRouter();

  return (
    <DetailPage backLink>
      <Notice
        tone="error"
        title="No se ha podido cargar la experiencia"
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
    </DetailPage>
  );
}

function DetailPage({ backLink = false, children }: { backLink?: boolean; children: ReactNode }) {
  return (
    <>
      <TopNav
        brand={
          <Link
            to="/"
            activeOptions={{ exact: true }}
            aria-label="LuxyDrive, inicio"
            className="mb-3 md:mb-0"
          >
            <Logo />
          </Link>
        }
      />
      <main>
        <Container size="narrow">
          <div className="flex flex-col gap-6 pt-8 pb-section md:pt-section">
            {backLink && (
              <BackLink
                to="/experiencias"
                activeOptions={{ exact: true }}
                className="inline-flex items-center gap-1 self-start"
              >
                <ChevronLeft aria-hidden className="size-4" />
                Volver al catálogo
              </BackLink>
            )}
            {children}
          </div>
        </Container>
      </main>
    </>
  );
}
