import {
  Avatar,
  Button,
  ButtonLink,
  CircleCheck,
  Container,
  Divider,
  EmptyState,
  Heading,
  LogIn,
  Logo,
  Notice,
  Pencil,
  Phone,
  Section,
  Skeleton,
  Text,
  TextArea,
  TextInput,
  TopNav,
  User,
} from "@luxydrive/ui";
import { createFileRoute, createLink, Link, useRouter } from "@tanstack/react-router";
import { type FormEvent, type ReactNode, useState } from "react";
import { client } from "../api";

export const Route = createFileRoute("/proveedor/perfil")({
  loader: async () => {
    const res = await client.api.provider.profile.$get();
    if (res.ok) return { status: "ok", profile: await res.json() } as const;
    // 401 y 403 los pone el middleware de /api/provider, así que no están en el tipo de la respuesta.
    const status: number = res.status;
    if (status === 404) return { status: "none" } as const;
    if (status === 401) return { status: "unauthorized" } as const;
    if (status === 403) return { status: "forbidden" } as const;
    throw new Error("profile_unavailable");
  },
  pendingComponent: ProfileLoading,
  errorComponent: ProfileError,
  component: ProviderProfile,
});

const CatalogButton = createLink(ButtonLink);

type Fields = { tradeName: string; description: string; phone: string };
type Field = keyof Fields;
type Profile = Fields & { id: number };

// Misma regla que apps/api/src/schemas/provider-profile.ts, para avisar de todos los campos a la vez.
const phonePattern = /^\+?\d(?:[ -]?\d){8,14}$/;

const requiredMessage: Record<Field, string> = {
  tradeName: "Escribe el nombre comercial.",
  description: "Escribe una descripción de tu empresa.",
  phone: "Escribe un teléfono de contacto.",
};
const invalidPhoneMessage = "Teléfono no válido: de 9 a 15 cifras, con + delante si quieres.";

const fieldByError = {
  invalid_trade_name: ["tradeName", requiredMessage.tradeName],
  invalid_description: ["description", requiredMessage.description],
  invalid_phone: ["phone", invalidPhoneMessage],
} as const;

function validate(values: Fields) {
  const errors: Partial<Record<Field, string>> = {};
  for (const field of ["tradeName", "description", "phone"] as const) {
    if (!values[field].trim()) errors[field] = requiredMessage[field];
  }
  if (!errors.phone && !phonePattern.test(values.phone.trim())) errors.phone = invalidPhoneMessage;
  return errors;
}

function ProviderProfile() {
  const data = Route.useLoaderData();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState<"created" | "updated" | null>(null);

  if (data.status === "unauthorized") return <SignedOut />;

  if (data.status === "forbidden") {
    return (
      <ProfilePage>
        <EmptyState
          icon={<User aria-hidden />}
          title="Esta página es para proveedores"
          description="Has entrado con una cuenta de cliente. El perfil de empresa solo existe en las cuentas de proveedor."
          action={
            <CatalogButton to="/experiencias" variant="secondary">
              Ver experiencias
            </CatalogButton>
          }
        />
      </ProfilePage>
    );
  }

  const onSaved = async (kind: "created" | "updated") => {
    await router.invalidate();
    setEditing(false);
    setSaved(kind);
  };

  if (data.status === "none") {
    return (
      <ProfilePage subtitle="Cuéntales a los clientes quién eres. Podrás cambiarlo cuando quieras.">
        <ProfileForm onSaved={onSaved} />
      </ProfilePage>
    );
  }

  if (editing) {
    return (
      <ProfilePage subtitle="Cambia los datos que necesites y guarda.">
        <ProfileForm profile={data.profile} onSaved={onSaved} onCancel={() => setEditing(false)} />
      </ProfilePage>
    );
  }

  return (
    <ProfilePage>
      {saved && (
        <Notice
          icon={<CircleCheck />}
          title={saved === "created" ? "Perfil creado" : "Cambios guardados"}
        >
          Así ven los clientes tu empresa.
        </Notice>
      )}
      <ProfileView
        profile={data.profile}
        onEdit={() => {
          setSaved(null);
          setEditing(true);
        }}
      />
    </ProfilePage>
  );
}

function ProfileView({ profile, onEdit }: { profile: Profile; onEdit: () => void }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Avatar name={profile.tradeName} size="lg" />
        <Heading as="h2" variant="display-lg" className="min-w-0 break-words">
          {profile.tradeName}
        </Heading>
      </div>
      <Text tone="body" className="whitespace-pre-line">
        {profile.description}
      </Text>
      <Divider />
      <dl className="flex flex-col gap-1">
        <dt>
          <Text as="span" variant="caption" tone="muted">
            Teléfono de contacto
          </Text>
        </dt>
        <dd className="flex items-center gap-2">
          <Phone aria-hidden className="size-4" />
          <Text as="span">{profile.phone}</Text>
        </dd>
      </dl>
      <div>
        <Button variant="secondary" onClick={onEdit}>
          <Pencil aria-hidden />
          Editar
        </Button>
      </div>
    </div>
  );
}

type FormProblem = { title: string; body: string; action?: ReactNode };

function ProfileForm({
  profile,
  onSaved,
  onCancel,
}: {
  profile?: Profile;
  onSaved: (kind: "created" | "updated") => Promise<void>;
  onCancel?: () => void;
}) {
  const router = useRouter();
  const [values, setValues] = useState<Fields>({
    tradeName: profile?.tradeName ?? "",
    description: profile?.description ?? "",
    phone: profile?.phone ?? "",
  });
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [problem, setProblem] = useState<FormProblem | null>(null);
  const [saving, setSaving] = useState(false);

  const change = (field: Field) => (event: { target: { value: string } }) => {
    setValues((current) => ({ ...current, [field]: event.target.value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const showErrors = (next: Partial<Record<Field, string>>) => {
    setErrors(next);
    const first = (["tradeName", "description", "phone"] as const).find((field) => next[field]);
    if (first) document.getElementById(`profile-${first}`)?.focus();
  };

  const retry = (
    <Button variant="tertiary" size="sm" className="h-auto" onClick={() => router.invalidate()}>
      Recargar
    </Button>
  );

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setProblem(null);
    const invalid = validate(values);
    if (Object.keys(invalid).length > 0) return showErrors(invalid);

    const json = {
      tradeName: values.tradeName.trim(),
      description: values.description.trim(),
      phone: values.phone.trim(),
    };
    setSaving(true);
    try {
      const res = profile
        ? await client.api.provider.profile[":id{[0-9]+}"].$patch({
            param: { id: String(profile.id) },
            json,
          })
        : await client.api.provider.profile.$post({ json });
      if (res.ok) return await onSaved(profile ? "updated" : "created");

      if (res.status === 400) {
        const { error } = await res.json();
        if (error in fieldByError) {
          const [field, message] = fieldByError[error as keyof typeof fieldByError];
          return showErrors({ [field]: message });
        }
      }
      const status: number = res.status;
      if (status === 401) {
        return setProblem({
          title: "Tu sesión ha caducado",
          body: "Vuelve a iniciar sesión para guardar el perfil.",
          action: (
            <ButtonLink href="/acceso" variant="tertiary" size="sm" className="h-auto">
              Iniciar sesión
            </ButtonLink>
          ),
        });
      }
      if (status === 409) {
        return setProblem({
          title: "Ya tienes un perfil de empresa",
          body: "Esta cuenta ya creó su perfil. Recarga para verlo y editarlo.",
          action: retry,
        });
      }
      if (status === 403) {
        return setProblem({
          title: "No puedes editar este perfil",
          body: "Solo puedes cambiar el perfil de tu propia cuenta de proveedor.",
        });
      }
      if (status === 404) {
        return setProblem({
          title: "Este perfil ya no existe",
          body: "Recarga la página para ver el estado actual.",
          action: retry,
        });
      }
      setProblem({
        title: "No se ha podido guardar",
        body: "Comprueba tu conexión e inténtalo de nuevo.",
      });
    } catch {
      setProblem({
        title: "No se ha podido guardar",
        body: "Comprueba tu conexión e inténtalo de nuevo.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form noValidate onSubmit={submit} className="flex max-w-xl flex-col gap-5">
      {problem && (
        <Notice tone="error" title={problem.title} action={problem.action}>
          {problem.body}
        </Notice>
      )}
      <TextInput
        id="profile-tradeName"
        label="Nombre comercial"
        autoComplete="organization"
        value={values.tradeName}
        onChange={change("tradeName")}
        error={errors.tradeName}
        required
      />
      <TextArea
        id="profile-description"
        label="Descripción"
        hint="Qué ofreces y dónde operas."
        value={values.description}
        onChange={change("description")}
        error={errors.description}
        required
      />
      <TextInput
        id="profile-phone"
        label="Teléfono de contacto"
        type="tel"
        autoComplete="tel"
        placeholder="+34 612 345 678"
        value={values.phone}
        onChange={change("phone")}
        error={errors.phone}
        required
      />
      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={saving}>
          {saving ? "Guardando…" : profile ? "Guardar cambios" : "Crear perfil"}
        </Button>
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel} disabled={saving}>
            Cancelar
          </Button>
        )}
      </div>
    </form>
  );
}

function SignedOut() {
  return (
    <ProfilePage>
      <EmptyState
        icon={<LogIn aria-hidden />}
        title="Inicia sesión para ver tu perfil"
        description="El perfil de empresa solo lo ven y lo editan los proveedores con sesión iniciada."
        action={<ButtonLink href="/acceso">Iniciar sesión</ButtonLink>}
      />
    </ProfilePage>
  );
}

function ProfileLoading() {
  return (
    <ProfilePage>
      <div
        role="status"
        aria-busy="true"
        aria-label="Cargando el perfil"
        className="flex max-w-xl flex-col gap-6"
      >
        <div className="flex items-center gap-4">
          <Skeleton className="size-16" />
          <Skeleton className="h-7 w-48" />
        </div>
        <Skeleton className="h-24" />
        <Skeleton className="h-12 w-40" />
      </div>
    </ProfilePage>
  );
}

function ProfileError() {
  const router = useRouter();

  return (
    <ProfilePage>
      <Notice
        tone="error"
        title="No se ha podido cargar el perfil"
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
    </ProfilePage>
  );
}

function ProfilePage({ subtitle, children }: { subtitle?: string; children: ReactNode }) {
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
        <Container size="narrow">
          <Section className="flex flex-col gap-8">
            <div className="flex flex-col gap-1">
              <Heading as="h1" variant="display-xl">
                Perfil de empresa
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
