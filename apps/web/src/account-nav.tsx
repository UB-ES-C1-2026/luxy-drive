import {
  AccountMenu,
  AccountMenuButton,
  AccountMenuDivider,
  AccountMenuLink,
  Avatar,
  TopNavLink,
} from "@luxydrive/ui";
import { createLink, useNavigate } from "@tanstack/react-router";
import { logout, useSessionUser } from "./session";

const MenuLink = createLink(AccountMenuLink);
const NavLink = createLink(TopNavLink);

/** Menú de cuenta de la barra superior: el usuario con sesión o el acceso para visitantes. */
export function AccountNav() {
  const user = useSessionUser();
  const navigate = useNavigate();

  // Proveedores, a su zona; visitantes, a darse de alta como proveedor. Una cuenta de
  // cliente es para reservar, así que no se le ofrece.
  const providerArea = user?.role === "provider" ? "/proveedor" : "/proveedor/registro";
  const publishTo = user?.role === "provider" ? "/proveedor/anuncios/nuevo" : "/proveedor/registro";
  const publish = user?.role !== "client" && (
    // En móvil no cabe en la barra: está dentro del menú.
    <span className="hidden md:block">
      <NavLink to={publishTo}>Publica tu vehículo</NavLink>
    </span>
  );

  if (!user) {
    return (
      <div className="mb-3 flex items-center gap-2 md:mb-0">
        {publish}
        <AccountMenu>
          <MenuLink to="/acceso" strong>
            Iniciar sesión
          </MenuLink>
          <MenuLink to="/registro">Crear cuenta</MenuLink>
          <AccountMenuDivider />
          <MenuLink to="/proveedor/registro">Publica tu vehículo</MenuLink>
        </AccountMenu>
      </div>
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
    <div className="mb-3 flex items-center gap-2 md:mb-0">
      {publish}
      <AccountMenu name={user.name} avatar={<Avatar name={user.name} size="sm" />}>
        <MenuLink to="/cuenta" strong>
          Mi cuenta
        </MenuLink>
        {user.role === "provider" && <MenuLink to={providerArea}>Zona de proveedor</MenuLink>}
        <AccountMenuDivider />
        <AccountMenuButton onClick={signOut}>Cerrar sesión</AccountMenuButton>
      </AccountMenu>
    </div>
  );
}
