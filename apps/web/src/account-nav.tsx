import {
  AccountMenu,
  AccountMenuButton,
  AccountMenuDivider,
  AccountMenuLink,
  Avatar,
} from "@luxydrive/ui";
import { createLink, useNavigate } from "@tanstack/react-router";
import { logout, useSessionUser } from "./session";

const MenuLink = createLink(AccountMenuLink);

/** Menú de cuenta de la barra superior: el usuario con sesión o el acceso para visitantes. */
export function AccountNav() {
  const user = useSessionUser();
  const navigate = useNavigate();

  if (!user) {
    return (
      <AccountMenu className="mb-3 md:mb-0">
        <MenuLink to="/acceso" strong>
          Iniciar sesión
        </MenuLink>
        <MenuLink to="/registro">Crear cuenta</MenuLink>
      </AccountMenu>
    );
  }

  const signOut = async () => {
    try {
      await logout();
      await navigate({ to: "/experiencias" });
    } catch {
      // Sin conexión la sesión sigue abierta; "Mi cuenta" permite reintentarlo con aviso.
      await navigate({ to: "/cuenta" });
    }
  };

  return (
    <AccountMenu
      name={user.name}
      avatar={<Avatar name={user.name} size="sm" />}
      className="mb-3 md:mb-0"
    >
      <MenuLink to="/cuenta" strong>
        Mi cuenta
      </MenuLink>
      <AccountMenuDivider />
      <AccountMenuButton onClick={signOut}>Cerrar sesión</AccountMenuButton>
    </AccountMenu>
  );
}
