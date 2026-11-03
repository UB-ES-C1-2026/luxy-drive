import { Avatar, ButtonLink, Text, User } from "@luxydrive/ui";
import { createLink } from "@tanstack/react-router";
import { useSessionUser } from "./session";

const NavButton = createLink(ButtonLink);

/** Parte derecha de la barra superior: el usuario con sesión o el acceso para visitantes. */
export function AccountNav() {
  const user = useSessionUser();

  if (!user) {
    return (
      // En móvil solo el icono: con "Ver ofertas" no cabe el texto.
      <NavButton
        to="/registro"
        variant="secondary"
        size="sm"
        aria-label="Crear cuenta"
        className="mb-3 md:mb-0"
      >
        <User aria-hidden className="size-4" />
        <span className="hidden md:inline">Crear cuenta</span>
      </NavButton>
    );
  }

  return (
    <NavButton
      to="/cuenta"
      variant="tertiary"
      size="sm"
      aria-label={`Mi cuenta: ${user.name}`}
      className="mb-3 gap-2 md:mb-0"
    >
      <Avatar name={user.name} size="sm" />
      <Text as="span" variant="body-sm" className="hidden max-w-40 truncate md:inline">
        {user.name}
      </Text>
    </NavButton>
  );
}
