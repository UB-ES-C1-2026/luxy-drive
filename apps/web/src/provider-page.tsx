import {
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
import { createLink, Link, type ParsedLocation, redirect } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { AccountNav } from "./account-nav";
import { loadSession } from "./session";

const PageButton = createLink(ButtonLink);

/** `beforeLoad` de la zona de proveedor: sin sesión, a iniciar sesión y de vuelta aquí. */
export async function requireSession({ location }: { location: ParsedLocation }) {
  if (!(await loadSession())) {
    throw redirect({ to: "/acceso", search: { redirect: location.href } });
  }
}

/** Página de la zona de proveedor: barra superior y columna de contenido. */
export function ProviderPage({
  title,
  subtitle,
  children,
}: {
  title?: string;
  subtitle?: string;
  children: ReactNode;
}) {
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
          <Section className="flex flex-col gap-6">
            {title && (
              <div className="flex flex-col gap-1">
                <Heading as="h1" variant="display-xl">
                  {title}
                </Heading>
                {subtitle && <Text tone="muted">{subtitle}</Text>}
              </div>
            )}
            {children}
          </Section>
        </Container>
      </main>
    </>
  );
}

// La API responde 403 a un cliente en /api/provider/*; aquí se le explica por qué.
export function ProviderOnly() {
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
