import {
  Avatar,
  Button,
  ButtonLink,
  Container,
  Heading,
  Logo,
  Notice,
  Section,
  Text,
  TopNav,
} from "@luxydrive/ui";
import { createFileRoute, createLink, Link, redirect, useNavigate } from "@tanstack/react-router";
import { type ReactNode, useState } from "react";
import { AccountNav } from "../account-nav";
import { loadSession, logout, useSessionUser } from "../session";

export const Route = createFileRoute("/cuenta")({
  // Página privada: sin sesión, a iniciar sesión y de vuelta aquí.
  beforeLoad: async ({ location }) => {
    if (!(await loadSession())) {
      throw redirect({ to: "/acceso", search: { redirect: location.href } });
    }
  },
  component: Account,
});

const PageButton = createLink(ButtonLink);

const roleLabel = { client: "Cuenta de cliente", provider: "Cuenta de proveedor" };

function Account() {
  const user = useSessionUser();
  const navigate = useNavigate();
  const [leaving, setLeaving] = useState(false);
  const [failed, setFailed] = useState(false);

  // Tras cerrar sesión el componente aún se pinta un instante antes de navegar.
  if (!user) return <AccountPage>{null}</AccountPage>;

  const signOut = async () => {
    setFailed(false);
    setLeaving(true);
    try {
      await logout();
      await navigate({ to: "/experiencias" });
    } catch {
      setFailed(true);
      setLeaving(false);
    }
  };

  return (
    <AccountPage>
      {failed && (
        <Notice tone="error" title="No se ha podido cerrar la sesión">
          Comprueba tu conexión e inténtalo de nuevo.
        </Notice>
      )}
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
      <div className="flex flex-wrap gap-3">
        <PageButton to="/experiencias">Ver experiencias</PageButton>
        <Button variant="secondary" onClick={signOut} disabled={leaving}>
          {leaving ? "Cerrando sesión…" : "Cerrar sesión"}
        </Button>
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
