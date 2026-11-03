import {
  Avatar,
  ButtonLink,
  Container,
  EmptyState,
  Heading,
  Logo,
  Section,
  Text,
  TopNav,
  User,
} from "@luxydrive/ui";
import { createFileRoute, createLink, Link, redirect } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { AccountNav } from "../account-nav";
import { loadSession, useSessionUser } from "../session";

export const Route = createFileRoute("/proveedor/")({
  // Zona privada: sin sesión, a iniciar sesión y de vuelta aquí.
  beforeLoad: async ({ location }) => {
    if (!(await loadSession())) {
      throw redirect({ to: "/acceso", search: { redirect: location.href } });
    }
  },
  component: ProviderHome,
});

const PageButton = createLink(ButtonLink);

function ProviderHome() {
  const user = useSessionUser();

  if (!user) return <ProviderPage>{null}</ProviderPage>;

  // La API responde 403 a un cliente en /api/provider/*; aquí se lo explicamos antes de que lo intente.
  if (user.role !== "provider") {
    return (
      <ProviderPage>
        <EmptyState
          icon={<User aria-hidden />}
          title="Esta zona es solo para proveedores"
          description="Has entrado con una cuenta de cliente. Publicar experiencias y gestionar una empresa son funciones de las cuentas de proveedor."
          action={
            <PageButton to="/experiencias" variant="secondary">
              Ver experiencias
            </PageButton>
          }
        />
      </ProviderPage>
    );
  }

  return (
    <ProviderPage>
      <div className="flex items-center gap-4">
        <Avatar name={user.name} size="lg" />
        <div className="flex min-w-0 flex-col gap-1">
          <Heading as="h1" variant="display-xl" className="break-words">
            Hola, {user.name}
          </Heading>
          <Text tone="muted">Cuenta de proveedor</Text>
        </div>
      </div>
      <Text tone="body">
        Empieza por el perfil de tu empresa: es lo que verán los clientes junto a tus anuncios.
      </Text>
      <div>
        {/* El perfil (US-008) es otra historia: enlace normal, no ruta tipada. */}
        <ButtonLink href="/proveedor/perfil">Crear el perfil de empresa</ButtonLink>
      </div>
    </ProviderPage>
  );
}

function ProviderPage({ children }: { children: ReactNode }) {
  return (
    <>
      <TopNav
        brand={
          <Link to="/" aria-label="LuxyDrive, inicio" className="mb-3 md:mb-0">
            <Logo />
          </Link>
        }
        actions={<AccountNav />}
      />
      <main>
        <Container size="narrow">
          <Section className="flex flex-col gap-6">{children}</Section>
        </Container>
      </main>
    </>
  );
}
