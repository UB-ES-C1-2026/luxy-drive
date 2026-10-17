import {
  AccountButton,
  AmenityList,
  BookingBar,
  BookingCard,
  Button,
  Calendar,
  Caravan,
  CategoryTabs,
  Chip,
  ColorSwatch,
  Container,
  type DateRange,
  Dialog,
  Divider,
  EmptyState,
  Footer,
  Globe,
  Heading,
  HeartButton,
  IconButton,
  ListingCard,
  ListingCardSkeleton,
  ListingGrid,
  ListingPhoto,
  Logo,
  MapPin,
  NewTag,
  Notice,
  OfferBadge,
  Plane,
  Plus,
  ProviderCard,
  Rating,
  RatingDisplay,
  ReviewCard,
  Sailboat,
  Search,
  SearchBar,
  Section,
  ShieldCheck,
  Skeleton,
  Snowflake,
  Sparkles,
  Stepper,
  Text,
  TextInput,
  TextLink,
  TopNav,
  Utensils,
  Wifi,
  X,
} from "@luxydrive/ui";
import { createFileRoute } from "@tanstack/react-router";
import { type ReactNode, useState } from "react";
import { client } from "../api";

// Página temporal: catálogo de todos los componentes de @luxydrive/ui (Sprint 0).
export const Route = createFileRoute("/")({
  loader: async () => {
    try {
      const res = await client.api.health.$get();
      return await res.json();
    } catch {
      return null;
    }
  },
  component: ComponentCatalog,
});

const colors: [string, string][] = [
  ["primary", "#ff385c"],
  ["primary-active", "#e00b41"],
  ["primary-disabled", "#ffd1da"],
  ["canvas", "#ffffff"],
  ["surface-soft", "#f7f7f7"],
  ["surface-strong", "#f2f2f2"],
  ["hairline", "#dddddd"],
  ["hairline-soft", "#ebebeb"],
  ["border-strong", "#c1c1c1"],
  ["ink", "#222222"],
  ["body", "#3f3f3f"],
  ["muted", "#6a6a6a"],
  ["muted-soft", "#929292"],
  ["error", "#c13515"],
  ["legal-link", "#428bff"],
];

const categories = [
  { id: "jet", label: "Jets privados", icon: <Plane aria-hidden /> },
  { id: "yacht", label: "Yates", icon: <Sailboat aria-hidden /> },
  { id: "camper", label: "Autocaravanas", icon: <Caravan aria-hidden />, isNew: true },
];

const footerColumns = [
  {
    title: "Ayuda",
    links: [
      { label: "Centro de ayuda", href: "#" },
      { label: "Cancelaciones", href: "#" },
    ],
  },
  {
    title: "Proveedores",
    links: [
      { label: "Publica tu vehículo", href: "#" },
      { label: "Recursos para proveedores", href: "#" },
    ],
  },
  {
    title: "LuxyDrive",
    links: [
      { label: "Quiénes somos", href: "#" },
      { label: "Privacidad", href: "#" },
    ],
  },
];

function ComponentCatalog() {
  const health = Route.useLoaderData();
  const [category, setCategory] = useState("jet");
  const [saved, setSaved] = useState<Record<string, boolean>>({ marbella: true });
  const [chips, setChips] = useState<string[]>(["empty-leg"]);
  const [passengers, setPassengers] = useState(2);
  const [children, setChildren] = useState(0);
  const [month, setMonth] = useState(() => new Date());
  const [range, setRange] = useState<DateRange>({});
  const [dialogOpen, setDialogOpen] = useState(false);

  const toggleSaved = (id: string) => (value: boolean) =>
    setSaved((current) => ({ ...current, [id]: value }));
  const toggleChip = (id: string) =>
    setChips((current) =>
      current.includes(id) ? current.filter((chip) => chip !== id) : [...current, id],
    );

  return (
    <>
      <TopNav
        brand={
          <a href="/" aria-label="LuxyDrive, inicio">
            <Logo />
          </a>
        }
        center={<CategoryTabs items={categories} value={category} onChange={setCategory} />}
        actions={
          <>
            <span className="hidden lg:inline-flex">
              <Button variant="tertiary" size="sm">
                Publica tu vehículo
              </Button>
            </span>
            <IconButton variant="ghost" aria-label="Idioma y moneda">
              <Globe aria-hidden />
            </IconButton>
            <AccountButton />
          </>
        }
      />

      <main>
        <Container>
          <Section className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <Heading as="h1" variant="display-xl">
                Componentes de @luxydrive/ui
              </Heading>
              <Text tone="muted">
                Catálogo del sistema de diseño (DESIGN.md). Todo lo que ves aquí sale de
                packages/ui.
              </Text>
            </div>
            <SearchBar
              segments={[
                { label: "Dónde", placeholder: "Busca destinos o rutas" },
                { label: "Cuándo", placeholder: "Añade fechas" },
                { label: "Quién", placeholder: "¿Cuántos sois?" },
              ]}
            />
            {health ? (
              <Notice title={`API: ${health.status} · BD: ${health.db} · entorno: ${health.env}`}>
                El front llama a /api/health, que consulta D1.
              </Notice>
            ) : (
              <Notice tone="error" title="La API no responde">
                En local, arranca la API con pnpm dev.
              </Notice>
            )}
          </Section>

          <Divider />
          <CatalogSection title="Colores" description="Tokens de color. Un solo acento: primary.">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6">
              {colors.map(([token, value]) => (
                <ColorSwatch key={token} token={token} value={value} />
              ))}
            </div>
          </CatalogSection>

          <Divider />
          <CatalogSection title="Tipografía" description="Inter en toda la interfaz.">
            <div className="flex flex-col gap-4">
              <Heading as="h3" variant="rating-display">
                4,92
              </Heading>
              <Heading as="h3" variant="display-xl">
                display-xl · Experiencias de lujo a tu alcance
              </Heading>
              <Heading as="h3" variant="display-lg">
                display-lg · Jet privado Marbella → Madrid
              </Heading>
              <Heading as="h3" variant="display-md">
                display-md · Qué incluye
              </Heading>
              <Heading as="h3" variant="display-sm">
                display-sm · Antes de reservar
              </Heading>
              <Heading as="h3" variant="title-md">
                title-md · Yate Sunseeker 76
              </Heading>
              <Text>body-md · Texto corrido por defecto para descripciones largas.</Text>
              <Text variant="body-sm" tone="muted">
                body-sm · Datos de tarjeta, fechas y precios.
              </Text>
              <Text variant="caption">caption · Etiquetas de campos</Text>
              <Text variant="caption-sm" tone="muted">
                caption-sm · © 2026 LuxyDrive
              </Text>
            </div>
          </CatalogSection>

          <Divider />
          <CatalogSection title="Botones y enlaces">
            <div className="flex flex-col gap-6">
              <div className="flex flex-wrap items-center gap-3">
                <Button>Solicitar reserva</Button>
                <Button variant="secondary">Guardar</Button>
                <Button variant="tertiary">Mostrar más</Button>
                <Button variant="pill">Publica tu vehículo</Button>
                <Button icon={<Search aria-hidden className="size-4" />}>Buscar</Button>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button size="sm">Continuar</Button>
                <Button variant="secondary" size="sm">
                  Cancelar
                </Button>
                <Button disabled>No disponible</Button>
                <Button variant="secondary" disabled>
                  Deshabilitado
                </Button>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <IconButton aria-label="Añadir">
                  <Plus aria-hidden />
                </IconButton>
                <IconButton variant="outline" aria-label="Cerrar">
                  <X aria-hidden />
                </IconButton>
                <IconButton variant="ghost" aria-label="Ubicación">
                  <MapPin aria-hidden />
                </IconButton>
                <div className="w-24">
                  <ListingPhoto category="yacht">
                    <HeartButton
                      saved={saved.demo ?? false}
                      onSavedChange={toggleSaved("demo")}
                      className="absolute top-2 right-2"
                    />
                  </ListingPhoto>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-6">
                <TextLink href="#">Enlace de texto</TextLink>
                <TextLink href="#" tone="brand">
                  Enlace de marca
                </TextLink>
                <TextLink href="#" tone="legal">
                  Términos y privacidad
                </TextLink>
              </div>
            </div>
          </CatalogSection>

          <Divider />
          <CatalogSection title="Badges, valoraciones y filtros">
            <div className="flex flex-col gap-6">
              <div className="flex flex-wrap items-center gap-3">
                <OfferBadge icon={<Sparkles aria-hidden />}>Empty leg</OfferBadge>
                <OfferBadge>Última hora</OfferBadge>
                <OfferBadge>Oferta flash</OfferBadge>
                <NewTag />
                <Rating value={4.92} reviewCount={38} />
              </div>
              <div className="flex flex-wrap gap-3">
                {[
                  ["empty-leg", "Empty legs"],
                  ["last-minute", "Última hora"],
                  ["crew", "Con tripulación"],
                  ["pets", "Admite mascotas"],
                ].map(([id, label]) => (
                  <Chip
                    key={id}
                    selected={chips.includes(id ?? "")}
                    onClick={() => toggleChip(id ?? "")}
                  >
                    {label}
                  </Chip>
                ))}
              </div>
            </div>
          </CatalogSection>

          <Divider />
          <CatalogSection title="Formularios">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <TextInput label="Correo electrónico" placeholder="tu@correo.com" type="email" />
              <TextInput
                label="Ciudad de salida"
                placeholder="Marbella"
                hint="Ciudad o aeropuerto"
              />
              <TextInput
                label="Teléfono"
                defaultValue="12"
                error="Introduce un teléfono válido"
                inputMode="tel"
              />
              <TextInput label="Código de oferta" placeholder="No disponible" disabled />
              <Stepper
                label="Adultos"
                description="13 años o más"
                value={passengers}
                onChange={setPassengers}
                min={1}
                max={12}
              />
              <Stepper
                label="Niños"
                description="De 2 a 12 años"
                value={children}
                onChange={setChildren}
                max={6}
              />
            </div>
          </CatalogSection>

          <Divider />
          <CatalogSection
            title="Tarjetas de anuncio"
            description="Foto primero. 1 → 2 → 4 columnas."
          >
            <ListingGrid>
              <li>
                <ListingCard
                  category="jet"
                  title="Jet privado Marbella → Madrid"
                  location="Marbella → Madrid"
                  dates="24 oct · 18:00"
                  price={4200}
                  originalPrice={9800}
                  priceUnit="experiencia completa"
                  rating={4.92}
                  reviewCount={38}
                  badge={<OfferBadge icon={<Sparkles aria-hidden />}>Empty leg</OfferBadge>}
                  href="#"
                  saved={saved.marbella ?? false}
                  onSavedChange={toggleSaved("marbella")}
                />
              </li>
              <li>
                <ListingCard
                  category="yacht"
                  title="Yate Sunseeker 76"
                  location="Ibiza"
                  dates="1–3 nov"
                  price={350}
                  priceUnit="/ persona"
                  rating={4.8}
                  reviewCount={12}
                  badge={<OfferBadge>Última hora</OfferBadge>}
                  href="#"
                  saved={saved.ibiza ?? false}
                  onSavedChange={toggleSaved("ibiza")}
                />
              </li>
              <li>
                <ListingCard
                  category="camper"
                  title="Autocaravana Hymer B-Klasse"
                  location="Barcelona"
                  dates="Disponible desde el 5 nov"
                  price={180}
                  priceUnit="/ noche"
                  href="#"
                  saved={saved.bcn ?? false}
                  onSavedChange={toggleSaved("bcn")}
                />
              </li>
              <li>
                <ListingCard
                  category="jet"
                  title="Citation XLS+ a Mallorca"
                  location="Madrid → Palma"
                  dates="30 oct · 10:30"
                  price={6900}
                  priceUnit="experiencia completa"
                  rating={5}
                  reviewCount={4}
                  href="#"
                  saved={saved.palma ?? false}
                  onSavedChange={toggleSaved("palma")}
                />
              </li>
            </ListingGrid>
          </CatalogSection>

          <Divider />
          <CatalogSection title="Detalle de anuncio">
            <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_380px]">
              <div className="flex flex-col gap-10">
                <ListingPhoto category="jet" aspect="landscape" />
                <div className="flex flex-col gap-1">
                  <Heading as="h3" variant="display-lg">
                    Jet privado Marbella → Madrid
                  </Heading>
                  <Text variant="body-sm" tone="muted">
                    Hasta 8 pasajeros · Salida 24 oct, 18:00 · Datos ficticios
                  </Text>
                </div>
                <div className="flex flex-col gap-4">
                  <Heading as="h4" variant="display-md">
                    Qué incluye
                  </Heading>
                  <AmenityList
                    items={[
                      { icon: <Wifi aria-hidden />, label: "Wi-Fi a bordo" },
                      { icon: <Utensils aria-hidden />, label: "Catering" },
                      { icon: <Snowflake aria-hidden />, label: "Climatización" },
                      { icon: <ShieldCheck aria-hidden />, label: "Seguro incluido" },
                    ]}
                  />
                </div>
                <RatingDisplay
                  value={4.92}
                  reviewCount={38}
                  stats={[
                    { label: "Puntualidad", value: "5,0" },
                    { label: "Comunicación", value: "4,9" },
                    { label: "Limpieza", value: "4,8" },
                  ]}
                />
                <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                  <ReviewCard author="Laura Pérez" date="Septiembre de 2026">
                    Todo salió perfecto: la tripulación fue muy amable, el avión estaba impecable y
                    salimos a la hora exacta. El precio del empty leg hizo que mereciera muchísimo
                    la pena. Repetiremos seguro en cuanto haya otra ruta disponible.
                  </ReviewCard>
                  <ReviewCard author="Marc Soler" date="Agosto de 2026">
                    Reservar fue sencillo y el proveedor respondió enseguida. Muy recomendable.
                  </ReviewCard>
                </div>
                <ProviderCard
                  name="Costa Air Charter"
                  verified
                  description="Operador ficticio de vuelos privados en la Costa del Sol."
                  stats={[
                    { label: "Reseñas", value: "214" },
                    { label: "Respuesta", value: "100 %" },
                    { label: "Años", value: "8" },
                  ]}
                />
              </div>
              <div className="lg:sticky lg:top-6 lg:self-start">
                <BookingCard
                  price={4200}
                  originalPrice={9800}
                  priceUnit="experiencia completa"
                  note="Todavía no se te cobrará nada"
                  breakdown={[
                    { label: "Vuelo Marbella → Madrid", amount: 4200 },
                    { label: "Tasas de aeropuerto", amount: 180 },
                  ]}
                >
                  <TextInput label="Salida" defaultValue="24 oct 2026 · 18:00" readOnly />
                  <Stepper
                    label="Pasajeros"
                    value={passengers}
                    onChange={setPassengers}
                    min={1}
                    max={8}
                  />
                </BookingCard>
              </div>
            </div>
            <div className="mt-10">
              <BookingBar price={4200} priceUnit="experiencia completa" detail="24 oct · 18:00" />
            </div>
          </CatalogSection>

          <Divider />
          <CatalogSection title="Calendario y diálogo">
            <div className="flex flex-col gap-10 md:flex-row md:items-start">
              <Calendar month={month} onMonthChange={setMonth} value={range} onChange={setRange} />
              <div className="flex flex-col items-start gap-3">
                <Text variant="body-sm" tone="muted">
                  Modal con el scrim al 50 %. Cierra con Esc o con la X.
                </Text>
                <Button variant="secondary" onClick={() => setDialogOpen(true)}>
                  Abrir diálogo
                </Button>
              </div>
            </div>
            <Dialog
              open={dialogOpen}
              onClose={() => setDialogOpen(false)}
              title="Inicia sesión o regístrate"
              footer={
                <>
                  <Button variant="tertiary" onClick={() => setDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={() => setDialogOpen(false)}>Continuar</Button>
                </>
              }
            >
              <div className="flex flex-col gap-4">
                <Heading as="h3" variant="display-sm">
                  Te damos la bienvenida a LuxyDrive
                </Heading>
                <TextInput label="Correo electrónico" type="email" placeholder="tu@correo.com" />
              </div>
            </Dialog>
          </CatalogSection>

          <Divider />
          <CatalogSection title="Estados" description="Vacío, error y carga.">
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
              <EmptyState
                icon={<Search aria-hidden />}
                title="No hay experiencias disponibles"
                description="Prueba con otras fechas o con otra categoría."
                action={<Button variant="secondary">Quitar filtros</Button>}
              />
              <div className="flex flex-col gap-4">
                <Notice
                  tone="error"
                  title="No se han podido cargar las experiencias"
                  action={
                    <Button variant="tertiary" size="sm" className="h-auto">
                      Reintentar
                    </Button>
                  }
                >
                  Comprueba tu conexión e inténtalo de nuevo.
                </Notice>
                <Notice title="Precio ilustrativo">
                  El precio de referencia tachado es un dato de demostración.
                </Notice>
                <Skeleton className="h-12" />
              </div>
              <ListingCardSkeleton />
            </div>
          </CatalogSection>
        </Container>
      </main>

      <Footer columns={footerColumns} />
    </>
  );
}

function CatalogSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <Section className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <Heading as="h2" variant="display-md">
          {title}
        </Heading>
        {description && <Text tone="muted">{description}</Text>}
      </div>
      {children}
    </Section>
  );
}
