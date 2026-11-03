import { Container, Heading, Logo, Section, Text, TextLink, TopNav } from "@luxydrive/ui";
import { createFileRoute, createLink, Link, useNavigate } from "@tanstack/react-router";
import { setSessionUser } from "../session";
import { SignupForm } from "../signup-form";

export const Route = createFileRoute("/registro")({
  component: Signup,
});

const PageLink = createLink(TextLink);

function Signup() {
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
                Crea tu cuenta
              </Heading>
              <Text tone="muted">Reserva jets, yates y autocaravanas con una sola cuenta.</Text>
            </div>
            <SignupForm
              onSignedUp={async (user) => {
                setSessionUser(user);
                await navigate({ to: "/cuenta" });
              }}
            />
            <Text variant="body-sm" tone="muted">
              ¿Ya tienes cuenta? <PageLink to="/acceso">Inicia sesión</PageLink> · ¿Ofreces
              experiencias? <PageLink to="/proveedor/registro">Regístrate como proveedor</PageLink>
            </Text>
          </Section>
        </Container>
      </main>
    </>
  );
}
