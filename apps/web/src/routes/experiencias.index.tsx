import {
  Button,
  ButtonLink,
  Caravan,
  CategoryTabs,
  Container,
  EmptyState,
  Heading,
  LayoutGrid,
  ListingCard,
  ListingCardSkeleton,
  type ListingCategory,
  ListingGrid,
  Logo,
  Notice,
  OfferBadge,
  Plane,
  Sailboat,
  Search,
  Section,
  Sparkles,
  Text,
  TextInput,
  TopNav,
} from "@luxydrive/ui";
import { createFileRoute, createLink, Link, useRouter } from "@tanstack/react-router";
import { type FormEvent, type ReactNode, useState } from "react";
import { client } from "../api";

const categories = ["jet", "yacht", "camper"] as const satisfies readonly ListingCategory[];

type CatalogSearch = {
  category?: ListingCategory;
  location?: string;
};

function isCategory(value: unknown): value is ListingCategory {
  return categories.some((category) => category === value);
}

// El router intenta leer cada parámetro como JSON: "?location=123" llega como número.
function searchText(value: unknown) {
  const text = typeof value === "string" || typeof value === "number" ? String(value).trim() : "";
  return text || undefined;
}

export const Route = createFileRoute("/experiencias/")({
  // Los filtros viven en la URL para que un enlace compartido los conserve.
  // Una categoría desconocida se ignora y se ven todas.
  validateSearch: (search: Record<string, unknown>): CatalogSearch => ({
    category: isCategory(search.category) ? search.category : undefined,
    location: searchText(search.location),
  }),
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => {
    const res = await client.api.experiences.$get({
      query: { category: deps.category, location: deps.location },
    });
    // Un 400 es un filtro que la API rechaza: se explica al usuario en vez de fallar.
    if (res.status === 400) return { status: "invalid" as const, error: (await res.json()).error };
    if (!res.ok) throw new Error("experiences_unavailable");
    return { status: "ok" as const, experiences: await res.json() };
  },
  pendingComponent: CatalogLoading,
  errorComponent: CatalogError,
  component: Catalog,
});

const CatalogButton = createLink(ButtonLink);

const categoryLabel: Record<ListingCategory, string> = {
  jet: "Jet privado",
  yacht: "Yate",
  camper: "Autocaravana",
};

const categoryTabs = [
  { id: "all", label: "Todas", icon: <LayoutGrid aria-hidden /> },
  { id: "jet", label: "Jets privados", icon: <Plane aria-hidden /> },
  { id: "yacht", label: "Yates", icon: <Sailboat aria-hidden /> },
  { id: "camper", label: "Autocaravanas", icon: <Caravan aria-hidden /> },
];

const invalidFilterMessage = {
  invalid_category: "La categoría elegida no existe.",
  invalid_location: "La ciudad no es válida. Escribe un nombre de hasta 100 caracteres.",
  invalid_date: "Alguna de las fechas no es válida.",
  invalid_date_range: "La fecha de fin es anterior a la de inicio.",
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
  const result = Route.useLoaderData();
  const { category, location } = Route.useSearch();
  const navigate = Route.useNavigate();
  const clearFilters = () => navigate({ search: {} });

  if (result.status === "invalid") {
    return (
      <CatalogPage>
        <Notice
          tone="error"
          title="No podemos aplicar estos filtros"
          action={
            <Button variant="tertiary" size="sm" className="h-auto" onClick={clearFilters}>
              Limpiar filtros
            </Button>
          }
        >
          {invalidFilterMessage[result.error]}
        </Notice>
      </CatalogPage>
    );
  }

  const { experiences } = result;

  if (experiences.length === 0) {
    return (
      <CatalogPage>
        {location ? (
          <EmptyState
            icon={<Search aria-hidden />}
            title="No hay experiencias con estos filtros"
            description="Prueba con otra ciudad o quita algún filtro."
            action={
              <Button variant="secondary" onClick={clearFilters}>
                Limpiar filtros
              </Button>
            }
          />
        ) : category ? (
          <EmptyState
            icon={<Search aria-hidden />}
            title="No hay experiencias en esta categoría"
            description="Prueba con otra categoría o vuelve a mirar en unos días."
            action={
              <CatalogButton to="/experiencias" search={{}} variant="secondary">
                Ver todas las experiencias
              </CatalogButton>
            }
          />
        ) : (
          <EmptyState
            icon={<Search aria-hidden />}
            title="No hay experiencias disponibles"
            description="Vuelve a mirar en unos días."
          />
        )}
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
              href={`/experiencias/${experience.id}`}
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

function CategoryFilter() {
  const { category } = Route.useSearch();
  const navigate = Route.useNavigate();

  return (
    <CategoryTabs
      aria-label="Filtrar por categoría"
      items={categoryTabs}
      value={category ?? "all"}
      onChange={(id) =>
        navigate({
          search: (prev) => ({ ...prev, category: isCategory(id) ? id : undefined }),
        })
      }
    />
  );
}

function CatalogFilters() {
  const { location } = Route.useSearch();
  // La clave reinicia el formulario cuando la URL cambia desde fuera (limpiar, atrás).
  return <FiltersForm key={location ?? ""} />;
}

function FiltersForm() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const [city, setCity] = useState(search.location ?? "");
  const hasFilters = search.location !== undefined;

  function submit(event: FormEvent) {
    event.preventDefault();
    navigate({ search: (prev) => ({ ...prev, location: city.trim() || undefined }) });
  }

  return (
    <search>
      <form
        aria-label="Filtrar experiencias"
        onSubmit={submit}
        className="flex flex-col gap-3 md:flex-row md:items-end"
      >
        <TextInput
          label="Ciudad"
          type="search"
          name="location"
          placeholder="Palma, Málaga, Ibiza…"
          maxLength={100}
          value={city}
          onChange={(event) => setCity(event.target.value)}
          className="md:flex-1"
        />
        <div className="flex items-center gap-4">
          <Button type="submit" icon={<Search aria-hidden />} className="md:h-14">
            Buscar
          </Button>
          {hasFilters && (
            <Button type="button" variant="tertiary" onClick={() => navigate({ search: {} })}>
              Limpiar filtros
            </Button>
          )}
        </div>
      </form>
    </search>
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
        center={<CategoryFilter />}
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
            <CatalogFilters />
            {children}
          </Section>
        </Container>
      </main>
    </>
  );
}
