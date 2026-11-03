import { Container, Heading, Logo, Section, Text, TextLink, TopNav } from "@luxydrive/ui";
import { createFileRoute, createLink, Link, useNavigate } from "@tanstack/react-router";
import { setSessionUser } from "../session";
import { SignupForm } from "../signup-form";

export const Route = createFileRoute("/proveedor/registro")({
  component: ProviderSignup,
});

const PageLink = createLink(TextLink);

function ProviderSignup() {
  const navigate = useNavigate();

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
                Regístrate como proveedor
              </Heading>
              <Text tone="muted">
                Publica tus jets, yates y autocaravanas. Después crearás el perfil de tu empresa.
              </Text>
            </div>
            <SignupForm
              accountType="provider"
              onSignedUp={async (user) => {
                setSessionUser(user);
                await navigate({ to: "/proveedor" });
              }}
            />
            <Text variant="body-sm" tone="muted">
              ¿Ya tienes cuenta? <PageLink to="/acceso">Inicia sesión</PageLink> · ¿Quieres
              reservar? <PageLink to="/registro">Crea una cuenta de cliente</PageLink>
            </Text>
          </Section>
        </Container>
      </main>
    </>
  );
}
