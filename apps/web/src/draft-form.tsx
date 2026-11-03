import { Button, type ListingCategory, Notice, Select, TextArea, TextInput } from "@luxydrive/ui";
import type { InferResponseType } from "hono/client";
import { type FormEvent, useState } from "react";
import { client } from "./api";
import { nowInMadrid, toMadridLocal } from "./madrid-time";
import { parsePrice } from "./price";

export type Draft = InferResponseType<(typeof client.api.provider.experiences)[":id"]["$get"], 200>;

type Fields = {
  title: string;
  category: ListingCategory | "";
  vehicle: string;
  location: string;
  capacity: string;
  price: string;
  serviceAt: string;
  description: string;
};
type Field = keyof Fields;
const fieldOrder = [
  "title",
  "category",
  "vehicle",
  "location",
  "capacity",
  "price",
  "serviceAt",
  "description",
] as const;

export const categoryOptions: { value: ListingCategory; label: string }[] = [
  { value: "jet", label: "Jet privado" },
  { value: "yacht", label: "Yate" },
  { value: "camper", label: "Autocaravana" },
];

// Mismas reglas que apps/api/src/schemas/draft.ts, para avisar de todos los campos a la vez.
const messages: Record<Field, string> = {
  title: "Escribe un título de hasta 120 caracteres.",
  category: "Elige una categoría de la lista.",
  vehicle: "El vehículo admite hasta 120 caracteres.",
  location: "La ubicación admite hasta 120 caracteres.",
  capacity: "Escribe un número entero de personas, de 1 a 500.",
  price:
    "Escribe un precio en euros de 0 o más, con dos decimales como máximo (por ejemplo, 1200 o 1200,50).",
  serviceAt: "Escribe una fecha y una hora válidas.",
  description: "La descripción admite hasta 2000 caracteres.",
};

const pastServiceAt = "Esa fecha y hora ya han pasado: elige una fecha de servicio futura.";

const fieldByError: Record<string, Field> = {
  invalid_title: "title",
  invalid_category: "category",
  invalid_vehicle: "vehicle",
  invalid_location: "location",
  invalid_capacity: "capacity",
  invalid_price: "price",
  invalid_service_at: "serviceAt",
  invalid_description: "description",
};

function validate(values: Fields) {
  const errors: Partial<Record<Field, string>> = {};
  const title = values.title.trim();
  if (!title || title.length > 120) errors.title = messages.title;
  if (values.vehicle.trim().length > 120) errors.vehicle = messages.vehicle;
  if (values.location.trim().length > 120) errors.location = messages.location;
  if (values.description.trim().length > 2000) errors.description = messages.description;
  const capacity = values.capacity.trim();
  if (capacity && !(/^\d+$/.test(capacity) && Number(capacity) >= 1 && Number(capacity) <= 500)) {
    errors.capacity = messages.capacity;
  }
  if (values.price.trim() && parsePrice(values.price) === null) errors.price = messages.price;
  // Mismo formato y zona horaria en los dos lados: se pueden comparar como texto.
  if (values.serviceAt && values.serviceAt <= nowInMadrid()) errors.serviceAt = pastServiceAt;
  return errors;
}

function initialValues(draft?: Draft): Fields {
  return {
    title: draft?.title ?? "",
    category: draft?.category ?? "",
    vehicle: draft?.vehicle ?? "",
    location: draft?.location ?? "",
    capacity:
      draft?.capacity === null || draft?.capacity === undefined ? "" : String(draft.capacity),
    price:
      draft?.price === null || draft?.price === undefined
        ? ""
        : String(draft.price).replace(".", ","),
    serviceAt: draft?.serviceAt ? toMadridLocal(new Date(draft.serviceAt)) : "",
    description: draft?.description ?? "",
  };
}

// Solo se envía lo rellenado: un borrador puede estar incompleto.
function toJson(values: Fields) {
  const text = (value: string) => value.trim() || undefined;
  return {
    title: values.title.trim(),
    category: values.category || undefined,
    vehicle: text(values.vehicle),
    location: text(values.location),
    capacity: values.capacity.trim() ? Number(values.capacity) : undefined,
    price: values.price.trim() ? (parsePrice(values.price) ?? undefined) : undefined,
    serviceAt: values.serviceAt || undefined,
    description: text(values.description),
  };
}

type Problem = { title: string; body: string };
const networkProblem: Problem = {
  title: "No se ha podido guardar el borrador",
  body: "Comprueba tu conexión e inténtalo de nuevo. No hemos borrado lo que has escrito.",
};

/** Formulario del anuncio en borrador. Sin `draft` lo crea; con `draft` guarda los cambios. */
export function DraftForm({
  draft,
  onSaved,
}: {
  draft?: Draft;
  onSaved: (saved: Draft) => Promise<void>;
}) {
  const [values, setValues] = useState<Fields>(() => initialValues(draft));
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [problem, setProblem] = useState<Problem | null>(null);
  const [saving, setSaving] = useState(false);

  const change = (field: Field) => (event: { target: { value: string } }) => {
    setValues((current) => ({ ...current, [field]: event.target.value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const showErrors = (next: Partial<Record<Field, string>>) => {
    setErrors(next);
    const first = fieldOrder.find((field) => next[field]);
    if (first) document.getElementById(`draft-${first}`)?.focus();
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setProblem(null);
    const invalid = validate(values);
    if (Object.keys(invalid).length > 0) return showErrors(invalid);

    setSaving(true);
    try {
      const json = toJson(values);
      const res = draft
        ? await client.api.provider.experiences[":id"].$patch({
            param: { id: String(draft.id) },
            json,
          })
        : await client.api.provider.experiences.$post({ json });
      if (res.ok) {
        const saved = await res.json();
        setValues(initialValues(saved));
        return await onSaved(saved);
      }
      const status: number = res.status;
      if (status === 400) {
        const { error } = await res.json();
        if (error === "service_at_in_past") return showErrors({ serviceAt: pastServiceAt });
        const field = fieldByError[error];
        if (field) return showErrors({ [field]: messages[field] });
      }
      if (status === 401) {
        return setProblem({
          title: "Tu sesión ha caducado",
          body: "Vuelve a iniciar sesión para guardar el borrador.",
        });
      }
      if (status === 409) {
        return setProblem({
          title: "Este anuncio ya está publicado",
          body: "Los anuncios publicados ya no se editan como borrador.",
        });
      }
      setProblem(networkProblem);
    } catch {
      setProblem(networkProblem);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form noValidate onSubmit={submit} className="flex max-w-xl flex-col gap-5">
      {problem && (
        <Notice tone="error" title={problem.title}>
          {problem.body}
        </Notice>
      )}
      <TextInput
        id="draft-title"
        label="Título"
        hint="Es lo único obligatorio para guardar el borrador."
        value={values.title}
        onChange={change("title")}
        error={errors.title}
        maxLength={120}
        required
      />
      <Select
        id="draft-category"
        label="Categoría"
        placeholder="Sin elegir"
        options={categoryOptions}
        value={values.category}
        onChange={change("category")}
        error={errors.category}
      />
      <TextInput
        id="draft-vehicle"
        label="Vehículo"
        placeholder="Por ejemplo, Embraer Phenom 300"
        value={values.vehicle}
        onChange={change("vehicle")}
        error={errors.vehicle}
      />
      <TextInput
        id="draft-location"
        label="Ubicación o ruta"
        placeholder="Por ejemplo, Madrid → Palma"
        value={values.location}
        onChange={change("location")}
        error={errors.location}
      />
      <TextInput
        id="draft-capacity"
        label="Plazas"
        inputMode="numeric"
        hint="Número máximo de personas."
        value={values.capacity}
        onChange={change("capacity")}
        error={errors.capacity}
      />
      <TextInput
        id="draft-price"
        label="Precio (EUR)"
        inputMode="decimal"
        hint="Precio de la experiencia completa, no por persona."
        value={values.price}
        onChange={change("price")}
        error={errors.price}
      />
      <TextInput
        id="draft-serviceAt"
        label="Fecha y hora de servicio"
        type="datetime-local"
        hint="En hora de Madrid. Tiene que ser una fecha futura."
        min={nowInMadrid()}
        value={values.serviceAt}
        onChange={change("serviceAt")}
        error={errors.serviceAt}
      />
      <TextArea
        id="draft-description"
        label="Descripción"
        value={values.description}
        onChange={change("description")}
        error={errors.description}
      />
      <div>
        <Button type="submit" disabled={saving}>
          {saving ? "Guardando…" : "Guardar borrador"}
        </Button>
      </div>
    </form>
  );
}
