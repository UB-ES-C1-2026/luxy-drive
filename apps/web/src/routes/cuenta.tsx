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
import { createFileRoute, createLink, Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { AccountNav } from "../account-nav";
import { useSessionUser } from "../session";

export const Route = createFileRoute("/cuenta")({
  component: Account,
});

const PageButton = createLink(ButtonLink);

const roleLabel = { client: "Cuenta de cliente", provider: "Cuenta de proveedor" };

function Account() {
  const user = useSessionUser();

  if (!user) {
    return (
      <AccountPage>
        <EmptyState
          icon={<User aria-hidden />}
          title="No has entrado en tu cuenta"
          description="Crea una cuenta para reservar experiencias."
          action={<PageButton to="/registro">Crear cuenta</PageButton>}
        />
      </AccountPage>
    );
  }

  return (
    <AccountPage>
      <div className="flex items-center gap-4">
        <Avatar name={user.name} size="lg" />
        <div className="flex min-w-0 flex-col gap-1">
          <Heading as="h1" variant="display-xl" className="break-words">
            Hola, {user.name}
          </Heading>
          <Text tone="muted">{roleLabel[user.role]}</Text>
        </div>
      </div>
      <Text tone="body">Tu sesión está iniciada. Ya puedes explorar y reservar experiencias.</Text>
      <div>
        <PageButton to="/experiencias">Ver experiencias</PageButton>
      </div>
    </AccountPage>
  );
}

function AccountPage({ children }: { children: ReactNode }) {
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
