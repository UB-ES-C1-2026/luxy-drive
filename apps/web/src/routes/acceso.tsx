import {
  Button,
  Container,
  Heading,
  Logo,
  Notice,
  Section,
  Text,
  TextInput,
  TextLink,
  TopNav,
} from "@luxydrive/ui";
import { createFileRoute, createLink, Link, useRouter } from "@tanstack/react-router";
import { type FormEvent, useState } from "react";
import { client } from "../api";
import { safeRedirect } from "../redirect";
import { setSessionUser } from "../session";

export const Route = createFileRoute("/acceso")({
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => ({
    redirect: safeRedirect(search.redirect),
  }),
  component: Login,
});

const PageLink = createLink(TextLink);

type Fields = { email: string; password: string };
type Field = keyof Fields;

const requiredMessage: Record<Field, string> = {
  email: "Escribe tu email.",
  password: "Escribe tu contraseña.",
};

type Problem = "credentials" | "network";

function Login() {
  const { redirect } = Route.useSearch();
  const router = useRouter();
  const [values, setValues] = useState<Fields>({ email: "", password: "" });
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [problem, setProblem] = useState<Problem | null>(null);
  const [sending, setSending] = useState(false);

  const change = (field: Field) => (event: { target: { value: string } }) => {
    setValues((current) => ({ ...current, [field]: event.target.value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setProblem(null);
    const invalid: Partial<Record<Field, string>> = {};
    if (!values.email.trim()) invalid.email = requiredMessage.email;
    if (!values.password) invalid.password = requiredMessage.password;
    setErrors(invalid);
    const first = (["email", "password"] as const).find((field) => invalid[field]);
    if (first) return document.getElementById(`login-${first}`)?.focus();

    setSending(true);
    try {
      const res = await client.api.auth.login.$post({
        json: { email: values.email.trim(), password: values.password },
      });
      if (res.status === 200) {
        const user = await res.json();
        setSessionUser(user);
        return router.history.push(
          redirect ?? (user.role === "provider" ? "/proveedor" : "/cuenta"),
        );
      }
      // Email inexistente y contraseña incorrecta dan el mismo 401: no revelamos qué cuentas existen.
      setProblem(res.status === 401 ? "credentials" : "network");
    } catch {
      setProblem("network");
    } finally {
      setSending(false);
    }
  };

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
          <Section className="mx-auto flex max-w-xl flex-col gap-8">
            <div className="flex flex-col gap-1">
              <Heading as="h1" variant="display-xl">
                Inicia sesión
              </Heading>
              <Text tone="muted">
                {redirect
                  ? "Para ver esta página tienes que entrar en tu cuenta."
                  : "Entra para reservar y ver tu cuenta."}
              </Text>
            </div>
            <form noValidate onSubmit={submit} className="flex flex-col gap-5">
              {problem === "credentials" && (
                <Notice tone="error" title="Email o contraseña incorrectos">
                  Revisa los datos e inténtalo de nuevo.
                </Notice>
              )}
              {problem === "network" && (
                <Notice tone="error" title="No se ha podido iniciar sesión">
                  Comprueba tu conexión e inténtalo de nuevo.
                </Notice>
              )}
              <TextInput
                id="login-email"
                label="Email"
                type="email"
                autoComplete="email"
                value={values.email}
                onChange={change("email")}
                error={errors.email}
                required
              />
              <TextInput
                id="login-password"
                label="Contraseña"
                type="password"
                autoComplete="current-password"
                value={values.password}
                onChange={change("password")}
                error={errors.password}
                required
              />
              <Button type="submit" fullWidth disabled={sending}>
                {sending ? "Entrando…" : "Iniciar sesión"}
              </Button>
            </form>
            <Text variant="body-sm" tone="muted">
              ¿Aún no tienes cuenta? <PageLink to="/registro">Crea una</PageLink>
            </Text>
          </Section>
        </Container>
      </main>
    </>
  );
}
