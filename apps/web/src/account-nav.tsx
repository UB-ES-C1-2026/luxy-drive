import { AccountMenu, AccountMenuLink, Avatar } from "@luxydrive/ui";
import { createLink } from "@tanstack/react-router";
import { useSessionUser } from "./session";

const MenuLink = createLink(AccountMenuLink);

/** Menú de cuenta de la barra superior: el usuario con sesión o el acceso para visitantes. */
export function AccountNav() {
  const user = useSessionUser();

  if (!user) {
    return (
      <AccountMenu className="mb-3 md:mb-0">
        <MenuLink to="/registro" strong>
          Crear cuenta
        </MenuLink>
      </AccountMenu>
    );
  }

  return (
    <AccountMenu
      name={user.name}
      avatar={<Avatar name={user.name} size="sm" />}
      className="mb-3 md:mb-0"
    >
      <MenuLink to="/cuenta" strong>
        Mi cuenta
      </MenuLink>
    </AccountMenu>
  );
}
