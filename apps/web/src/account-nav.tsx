import { Avatar, ButtonLink, Text, User } from "@luxydrive/ui";
import { createLink } from "@tanstack/react-router";
import { useSessionUser } from "./session";

const NavButton = createLink(ButtonLink);

/** Parte derecha de la barra superior: el usuario con sesión o el acceso para visitantes. */
export function AccountNav() {
  const user = useSessionUser();

  if (!user) {
    return (
      <div className="mb-3 flex items-center gap-2 md:mb-0">
        {/* En móvil solo el icono: con "Ver ofertas" no cabe el texto. */}
        <NavButton to="/acceso" variant="secondary" size="sm" aria-label="Iniciar sesión">
          <User aria-hidden className="size-4" />
          <span className="hidden md:inline">Iniciar sesión</span>
        </NavButton>
        {/* En móvil, "Crear cuenta" queda en la pantalla de acceso. */}
        <span className="hidden md:block">
          <NavButton to="/registro" variant="tertiary" size="sm">
            Crear cuenta
          </NavButton>
        </span>
      </div>
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
