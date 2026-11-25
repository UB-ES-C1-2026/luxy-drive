import {
  Button,
  ButtonLink,
  ChevronLeft,
  ChoiceCards,
  CircleCheck,
  EmptyState,
  formatPrice,
  Notice,
  Plane,
  Search,
  Skeleton,
  Sparkles,
  Text,
  TextInput,
  TextLink,
} from "@luxydrive/ui";
import { createFileRoute, createLink, useRouter } from "@tanstack/react-router";
import { type FormEvent, useState } from "react";
import { client } from "../api";
import { nowInMadrid, toMadridLocal } from "../madrid-time";
import { parsePrice } from "../price";
import { ProviderOnly, ProviderPage, requireSession } from "../provider-page";
import { useSessionUser } from "../session";

export const Route = createFileRoute("/proveedor/anuncios/$id_/oferta")({
  beforeLoad: requireSession,
  loader: async ({ params }) => {
    const [listingRes, offersRes] = await Promise.all([
      client.api.provider.experiences[":id"].$get({ param: { id: params.id } }),
      client.api.offers.$get(),
    ]);
    const status: number = listingRes.status;
    if (status === 400 || status === 403 || status === 404) return { status: "not_found" } as const;
    if (!listingRes.ok || !offersRes.ok) throw new Error("offer_unavailable");
    const listing = await listingRes.json();
    // La oferta en curso no viene en el anuncio: se busca en las ofertas públicas.
    const current = (await offersRes.json()).find((offer) => offer.id === listing.id);
    return { status: "ok", listing, current } as const;
  },
  pendingComponent: OfferLoading,
  errorComponent: OfferError,
  component: OfferPage,
});

const BackLink = createLink(TextLink);
const PageButton = createLink(ButtonLink);

type OfferType = "last_minute" | "empty_leg";
type Field = "type" | "price" | "until";
type Problem = { title: string; body: string };

const offerLabel: Record<OfferType, string> = {
  last_minute: "Oferta flash",
  empty_leg: "Empty leg",
};

const expiryDate = new Intl.DateTimeFormat("es-ES", {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Madrid",
});

const errorField: Record<string, Field> = {
  invalid_offer_type: "type",
  invalid_price: "price",
  price_not_lower: "price",
  invalid_until: "until",
  until_in_past: "until",
  until_after_service: "until",
};

const sendFailed: Problem = {
  title: "No se ha podido publicar la oferta",
  body: "Comprueba tu conexión e inténtalo de nuevo. No hemos borrado lo que has escrito.",
};

const offerActive: Problem = {
  title: "Ya hay una oferta en curso en este anuncio",
  body: "Solo puede haber un precio activo a la vez, así que no hemos creado la nueva. Termina la oferta actual y vuelve a lanzarla.",
};

function OfferPage() {
  const data = Route.useLoaderData();
  const user = useSessionUser();

  if (user?.role !== "provider") return <ProviderOnly />;

  if (data.status !== "ok") {
    return (
      <ProviderPage>
        <EmptyState
          icon={<Search aria-hidden />}
          title="No encontramos este anuncio"
          description="No existe o pertenece a otro proveedor. Solo puedes rebajar tus propios anuncios."
          action={
            <PageButton to="/proveedor" variant="secondary">
              Ir a mis anuncios
            </PageButton>
          }
        />
      </ProviderPage>
    );
  }

  const { listing, current } = data;

  return (
    <ProviderPage title="Lanzar una oferta" subtitle={listing.title}>
      <BackLink
        to="/proveedor/anuncios/$id"
        params={{ id: String(listing.id) }}
        className="inline-flex items-center gap-1 self-start"
      >
        <ChevronLeft aria-hidden className="size-4" />
        Volver al anuncio
      </BackLink>
      {listing.status !== "published" || listing.price === null || listing.serviceAt === null ? (
        <Notice title="Este anuncio todavía no admite ofertas" className="max-w-2xl">
          Solo se pueden rebajar anuncios publicados. Publícalo primero y vuelve aquí.
        </Notice>
      ) : (
        <>
          {current && <CurrentOffer offer={current} />}
          {/* Durante una oferta, `listing.price` es el rebajado; la API compara con el normal. */}
          <OfferForm
            id={listing.id}
            normalPrice={current?.originalPrice ?? listing.price}
            serviceAt={listing.serviceAt}
            running={current !== undefined}
          />
        </>
      )}
    </ProviderPage>
  );
}

function CurrentOffer({
  offer,
}: {
  offer: {
    id: number;
    offerType: OfferType;
    price: number;
    originalPrice: number;
    offerExpiresAt: string;
  };
}) {
  const router = useRouter();
  const [ending, setEnding] = useState(false);
  const [failed, setFailed] = useState(false);

  const end = async () => {
    setFailed(false);
    setEnding(true);
    try {
      const res = await client.api.provider.experiences[":id"].offer.$delete({
        param: { id: String(offer.id) },
      });
      const status: number = res.status;
      // 409: ya no había oferta (caducó mientras tanto). Recargar basta.
      if (res.ok || status === 409) return await router.invalidate();
      setFailed(true);
    } catch {
      setFailed(true);
    } finally {
      setEnding(false);
    }
  };

  return (
    <Notice
      icon={<Sparkles />}
      title={`${offerLabel[offer.offerType]} en curso`}
      className="max-w-2xl"
      action={
        <Button variant="tertiary" size="sm" className="h-auto" onClick={end} disabled={ending}>
          {ending ? "Terminando…" : "Terminar oferta"}
        </Button>
      }
    >
      {formatPrice(offer.price)} (antes {formatPrice(offer.originalPrice)}) hasta el{" "}
      {expiryDate.format(new Date(offer.offerExpiresAt))}. Para lanzar otra, termina esta primero.
      {failed && (
        <Text as="span" variant="body-sm" tone="error" className="block">
          No se ha podido terminar. Inténtalo de nuevo.
        </Text>
      )}
    </Notice>
  );
}

function OfferForm({
  id,
  normalPrice,
  serviceAt,
  running,
}: {
  id: number;
  normalPrice: number;
  serviceAt: string;
  /** Hay una oferta especial en curso. */
  running: boolean;
}) {
  const router = useRouter();
  const [type, setType] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [until, setUntil] = useState("");
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [problem, setProblem] = useState<Problem | null>(null);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const serviceLocal = toMadridLocal(new Date(serviceAt));

  const messages: Record<Field, string> = {
    type: "Elige si es una oferta flash o un empty leg.",
    price: `Escribe un precio en euros menor que el normal (${formatPrice(normalPrice)}), con dos decimales como máximo.`,
    until: `Elige una fecha y hora futura, como tarde la del servicio (${expiryDate.format(new Date(serviceAt))}).`,
  };

  // Mismas reglas que la API; las fechas en formato datetime-local se comparan como texto.
  const check = () => {
    const amount = parsePrice(newPrice);
    const found: Partial<Record<Field, string>> = {};
    if (!type) found.type = messages.type;
    if (amount === null || amount >= normalPrice) found.price = messages.price;
    if (!until || until <= nowInMadrid() || until > serviceLocal) found.until = messages.until;
    return { amount, found };
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setProblem(null);
    setDone(false);
    const { amount, found } = check();
    setErrors(found);
    if (Object.keys(found).length > 0 || amount === null) return;

    setSaving(true);
    try {
      const res = await client.api.provider.experiences[":id"].offer.$post({
        param: { id: String(id) },
        json: { type: type as OfferType, price: amount, until },
      });
      if (res.ok) {
        setType("");
        setNewPrice("");
        setUntil("");
        setDone(true);
        return await router.invalidate();
      }
      const status: number = res.status;
      if (status === 400) {
        const { error } = await res.json();
        const field = errorField[error];
        if (field) return setErrors({ [field]: messages[field] });
      }
      if (status === 401) {
        return setProblem({
          title: "Tu sesión ha caducado",
          body: "Vuelve a iniciar sesión para lanzar la oferta.",
        });
      }
      if (status === 409) {
        const { error } = await res.json();
        if (error === "offer_active") {
          await router.invalidate();
          return setProblem(offerActive);
        }
        return setProblem({
          title: "Este anuncio ya no admite ofertas",
          body: "Puede que lo hayas retirado o que la fecha de servicio ya haya pasado.",
        });
      }
      setProblem(sendFailed);
    } catch {
      setProblem(sendFailed);
    } finally {
      setSaving(false);
    }
  };

  // Al terminar la oferta en curso, los avisos sobre ella ya no aplican.
  const shownProblem = problem === offerActive && !running ? null : problem;

  return (
    <form noValidate onSubmit={submit} className="flex max-w-2xl flex-col gap-6">
      {done && running && (
        <Notice
          icon={<CircleCheck />}
          title="Oferta publicada"
          action={
            <PageButton to="/ofertas" variant="tertiary" size="sm" className="h-auto">
              Ver ofertas
            </PageButton>
          }
        >
          Ya aparece en la sección de ofertas con su precio y su vigencia.
        </Notice>
      )}
      {shownProblem && (
        <Notice tone="error" title={shownProblem.title}>
          {shownProblem.body}
        </Notice>
      )}
      <div className="flex flex-col gap-2">
        <Text tone="muted">Tipo de oferta</Text>
        <ChoiceCards
          label="Tipo de oferta"
          options={[
            { value: "last_minute", label: offerLabel.last_minute, icon: <Sparkles aria-hidden /> },
            { value: "empty_leg", label: offerLabel.empty_leg, icon: <Plane aria-hidden /> },
          ]}
          value={type}
          onChange={(next) => {
            setType(next);
            setErrors((old) => ({ ...old, type: undefined }));
          }}
        />
        {errors.type && (
          <Text variant="body-sm" tone="error">
            {errors.type}
          </Text>
        )}
      </div>
      <TextInput
        id="offer-price"
        label="Precio rebajado, por la experiencia completa"
        hint={`Precio normal: ${formatPrice(normalPrice)}.`}
        inputMode="decimal"
        placeholder="Por ejemplo, 900"
        value={newPrice}
        onChange={(event) => {
          setNewPrice(event.target.value);
          setErrors((old) => ({ ...old, price: undefined }));
        }}
        error={errors.price}
      />
      <TextInput
        id="offer-until"
        label="Válida hasta (hora de Madrid)"
        type="datetime-local"
        min={nowInMadrid()}
        max={serviceLocal}
        value={until}
        onChange={(event) => {
          setUntil(event.target.value);
          setErrors((old) => ({ ...old, until: undefined }));
        }}
        error={errors.until}
      />
      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={saving}>
          {saving ? "Publicando…" : "Publicar oferta"}
        </Button>
      </div>
    </form>
  );
}

function OfferLoading() {
  return (
    <ProviderPage>
      <div
        role="status"
        aria-busy="true"
        aria-label="Cargando el anuncio"
        className="flex max-w-2xl flex-col gap-6"
      >
        <Skeleton className="h-10 w-96 max-w-full" />
        <Skeleton className="h-24" />
        <Skeleton className="h-14" />
      </div>
    </ProviderPage>
  );
}

function OfferError() {
  const router = useRouter();

  return (
    <ProviderPage>
      <Notice
        tone="error"
        title="No se ha podido cargar el anuncio"
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
