import {
  Button,
  Caravan,
  ChoiceCards,
  formatPrice,
  Heading,
  type ListingCategory,
  Notice,
  Plane,
  Sailboat,
  StepProgress,
  Text,
  TextArea,
  TextInput,
} from "@luxydrive/ui";
import type { InferResponseType } from "hono/client";
import { type FormEvent, type ReactNode, useState } from "react";
import { client } from "./api";
import { nowInMadrid, toMadridLocal } from "./madrid-time";
import { parsePrice } from "./price";

export type Draft = InferResponseType<(typeof client.api.provider.experiences)[":id"]["$get"], 200>;

export const categoryLabel: Record<ListingCategory, string> = {
  jet: "Jet privado",
  yacht: "Yate",
  camper: "Autocaravana",
};

const categoryIcon: Record<ListingCategory, ReactNode> = {
  jet: <Plane aria-hidden />,
  yacht: <Sailboat aria-hidden />,
  camper: <Caravan aria-hidden />,
};

type Step = {
  field:
    | "title"
    | "category"
    | "vehicle"
    | "location"
    | "capacity"
    | "price"
    | "serviceAt"
    | "description";
  kind: "text" | "choice" | "number" | "price" | "datetime" | "long";
  /** Etiqueta corta, para el resumen. */
  label: string;
  question: string;
  help?: string;
  placeholder?: string;
  /** Qué corregir si la respuesta no vale. */
  invalid: string;
  /** Mismas reglas que apps/api/src/schemas/draft.ts. */
  valid: (value: string) => boolean;
  /** Valor guardado → texto del campo. */
  read: (draft: Draft) => string;
  /** Cómo se ve en el resumen, si no es el mismo texto. */
  show?: (draft: Draft) => string;
};

const upTo = (max: number) => (value: string) => value.trim().length <= max;

const serviceDate = new Intl.DateTimeFormat("es-ES", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Madrid",
});
const wholeNumber = /^\d+$/;

/** Una pregunta por pantalla, en este orden. Solo el título es obligatorio. */
export const steps: Step[] = [
  {
    field: "title",
    kind: "text",
    label: "Título",
    question: "¿Cómo se llama tu experiencia?",
    help: "Es lo único obligatorio para guardar el borrador.",
    placeholder: "Por ejemplo, Vuelo privado Madrid → Palma",
    invalid: "Escribe un título de hasta 120 caracteres.",
    valid: (value) => value.trim().length > 0 && upTo(120)(value),
    read: (draft) => draft.title,
  },
  {
    field: "category",
    kind: "choice",
    label: "Categoría",
    question: "¿Qué tipo de vehículo es?",
    invalid: "Elige una categoría de la lista.",
    valid: (value) => !value || value in categoryLabel,
    read: (draft) => draft.category ?? "",
    show: (draft) => (draft.category ? categoryLabel[draft.category] : ""),
  },
  {
    field: "vehicle",
    kind: "text",
    label: "Vehículo",
    question: "¿Qué modelo es?",
    placeholder: "Por ejemplo, Embraer Phenom 300",
    invalid: "El vehículo admite hasta 120 caracteres.",
    valid: upTo(120),
    read: (draft) => draft.vehicle ?? "",
  },
  {
    field: "location",
    kind: "text",
    label: "Ubicación o ruta",
    question: "¿Dónde es, o qué ruta hace?",
    placeholder: "Por ejemplo, Madrid → Palma",
    invalid: "La ubicación admite hasta 120 caracteres.",
    valid: upTo(120),
    read: (draft) => draft.location ?? "",
  },
  {
    field: "capacity",
    kind: "number",
    label: "Plazas",
    question: "¿Cuántas personas caben como máximo?",
    placeholder: "Por ejemplo, 8",
    invalid: "Escribe un número entero de personas, de 1 a 500.",
    valid: (value) => {
      const text = value.trim();
      return !text || (wholeNumber.test(text) && Number(text) >= 1 && Number(text) <= 500);
    },
    read: (draft) => (draft.capacity === null ? "" : String(draft.capacity)),
    show: (draft) => (draft.capacity === null ? "" : `Hasta ${draft.capacity} personas`),
  },
  {
    field: "price",
    kind: "price",
    label: "Precio",
    question: "¿Cuánto cuesta la experiencia completa?",
    help: "En euros y por la experiencia completa, no por persona. El detalle calculará cuánto sale por persona.",
    placeholder: "Por ejemplo, 1.200",
    invalid:
      "Escribe un precio en euros de 0 o más, con dos decimales como máximo (por ejemplo, 1200 o 1200,50).",
    valid: (value) => !value.trim() || parsePrice(value) !== null,
    read: (draft) => (draft.price === null ? "" : String(draft.price).replace(".", ",")),
    show: (draft) =>
      draft.price === null ? "" : `${formatPrice(draft.price)} experiencia completa`,
  },
  {
    field: "serviceAt",
    kind: "datetime",
    label: "Fecha y hora de servicio",
    question: "¿Qué día y a qué hora es?",
    help: "En hora de Madrid. Tiene que ser una fecha futura.",
    invalid: "Esa fecha y hora ya han pasado: elige una fecha de servicio futura.",
    // Mismo formato y zona horaria en los dos lados: se pueden comparar como texto.
    valid: (value) => !value || value > nowInMadrid(),
    read: (draft) => (draft.serviceAt ? toMadridLocal(new Date(draft.serviceAt)) : ""),
    show: (draft) => (draft.serviceAt ? serviceDate.format(new Date(draft.serviceAt)) : ""),
  },
  {
    field: "description",
    kind: "long",
    label: "Descripción",
    question: "Cuéntales a los clientes cómo es la experiencia",
    help: "Qué incluye, cuánto dura y qué la hace especial.",
    invalid: "La descripción admite hasta 2000 caracteres.",
    valid: upTo(2000),
    read: (draft) => draft.description ?? "",
  },
];

const errorField: Record<string, Step["field"]> = {
  invalid_title: "title",
  invalid_category: "category",
  invalid_vehicle: "vehicle",
  invalid_location: "location",
  invalid_capacity: "capacity",
  invalid_price: "price",
  invalid_service_at: "serviceAt",
  service_at_in_past: "serviceAt",
  invalid_description: "description",
};

/** Texto del campo → cuerpo de la petición. Vacío no se envía: el borrador puede estar incompleto. */
function payload(step: Step, value: string) {
  const text = value.trim();
  if (!text) return {};
  if (step.kind === "number") return { [step.field]: Number(text) };
  if (step.kind === "price") return { price: parsePrice(text) ?? undefined };
  return { [step.field]: text };
}

type Problem = { title: string; body: string };

const saveFailed: Problem = {
  title: "No se ha podido guardar",
  body: "Comprueba tu conexión e inténtalo de nuevo. No hemos borrado lo que has escrito.",
};

/**
 * Una pregunta del borrador. "Siguiente" guarda la respuesta (la primera crea el borrador),
 * así que el proveedor puede dejarlo en cualquier paso y seguir otro día.
 */
export function DraftStep({
  draft,
  index,
  onSaved,
  onBack,
}: {
  draft?: Draft;
  index: number;
  /** `exit`: el proveedor ha pulsado "Guardar y salir". */
  onSaved: (saved: Draft, exit: boolean) => Promise<void>;
  onBack?: () => void;
}) {
  const step = steps[index];
  const [value, setValue] = useState(() => (draft && step ? step.read(draft) : ""));
  const [error, setError] = useState<string>();
  const [problem, setProblem] = useState<Problem | null>(null);
  const [saving, setSaving] = useState(false);
  if (!step) return null;
  const inputId = `draft-${step.field}`;

  const save = async (next: string, exit: boolean) => {
    setProblem(null);
    if (!step.valid(next)) {
      setError(step.invalid);
      document.getElementById(inputId)?.focus();
      return;
    }
    // Sin cambios no hace falta guardar.
    if (draft && next.trim() === step.read(draft).trim()) return onSaved(draft, exit);

    setSaving(true);
    try {
      const json = payload(step, next);
      const res = draft
        ? await client.api.provider.experiences[":id"].$patch({
            param: { id: String(draft.id) },
            json,
          })
        : await client.api.provider.experiences.$post({ json: { title: next.trim(), ...json } });
      if (res.ok) return await onSaved(await res.json(), exit);
      const status: number = res.status;
      if (status === 400) {
        const { error: code } = await res.json();
        if (errorField[code] === step.field) return setError(step.invalid);
      }
      if (status === 401) {
        return setProblem({
          title: "Tu sesión ha caducado",
          body: "Vuelve a iniciar sesión para seguir con el borrador.",
        });
      }
      if (status === 409) {
        return setProblem({
          title: "Este anuncio ya está publicado",
          body: "Los anuncios publicados ya no se editan como borrador.",
        });
      }
      setProblem(saveFailed);
    } catch {
      setProblem(saveFailed);
    } finally {
      setSaving(false);
    }
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    return save(value, submitter?.getAttribute("value") === "exit");
  };

  const change = (event: { target: { value: string } }) => {
    setValue(event.target.value);
    setError(undefined);
  };

  const empty = !value.trim();
  const last = index === steps.length - 1;

  return (
    <form noValidate onSubmit={submit} className="flex max-w-2xl flex-col gap-8">
      <StepProgress step={index + 1} total={steps.length} />
      <div className="flex flex-col gap-2">
        <Heading as="h1" variant="display-xl">
          {step.question}
        </Heading>
        {step.help && <Text tone="muted">{step.help}</Text>}
      </div>
      {problem && (
        <Notice tone="error" title={problem.title}>
          {problem.body}
        </Notice>
      )}
      {step.kind === "choice" ? (
        <ChoiceCards
          label={step.question}
          options={(Object.keys(categoryLabel) as ListingCategory[]).map((category) => ({
            value: category,
            label: categoryLabel[category],
            icon: categoryIcon[category],
          }))}
          value={value}
          onChange={(next) => {
            // Como en un formulario conversacional: elegir ya responde y pasa a la siguiente.
            setValue(next);
            void save(next, false);
          }}
        />
      ) : step.kind === "long" ? (
        <TextArea
          id={inputId}
          label={step.question}
          className="[&>label]:sr-only"
          rows={6}
          value={value}
          onChange={change}
          error={error}
          autoFocus
        />
      ) : step.kind === "datetime" ? (
        <TextInput
          id={inputId}
          label={step.question}
          className="[&>label]:sr-only"
          type="datetime-local"
          min={nowInMadrid()}
          value={value}
          onChange={change}
          error={error}
          autoFocus
        />
      ) : (
        <TextInput
          id={inputId}
          label={step.question}
          className="[&>label]:sr-only"
          inputMode={
            step.kind === "number" ? "numeric" : step.kind === "price" ? "decimal" : undefined
          }
          placeholder={step.placeholder}
          value={value}
          onChange={change}
          error={error}
          autoFocus
        />
      )}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" value="next" disabled={saving}>
          {saving
            ? "Guardando…"
            : last
              ? "Ver el resumen"
              : empty && step.field !== "title"
                ? "Saltar por ahora"
                : "Siguiente"}
        </Button>
        {onBack && (
          <Button variant="tertiary" onClick={onBack} disabled={saving}>
            Atrás
          </Button>
        )}
        {draft && (
          <Button
            type="submit"
            value="exit"
            variant="tertiary"
            disabled={saving}
            className="ml-auto"
          >
            Guardar y salir
          </Button>
        )}
      </div>
    </form>
  );
}
