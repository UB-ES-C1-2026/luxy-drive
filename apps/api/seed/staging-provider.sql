-- Proveedor de demo de staging (TR-005). Todo es ficticio.
-- Se carga después de seed/dev.sql y de registrar proveedor.demo@luxydrive.test con
-- POST /api/auth/signup/provider (lo hace el workflow "Seed staging"). La contraseña no
-- vive en el repo: la cuenta se crea por la API para que el hash use el AUTH_PEPPER de staging.
-- Se puede repetir: el perfil se actualiza y los anuncios se vuelven a asignar.

INSERT INTO provider_profiles (user_id, trade_name, description, phone)
SELECT id, 'Luxy Demo Charters',
       'Proveedor ficticio para las demos: jets, yates y autocaravanas.',
       '+34 600 000 000'
FROM users
WHERE email = 'proveedor.demo@luxydrive.test' AND role = 'provider'
ON CONFLICT (user_id) DO UPDATE SET
  trade_name = excluded.trade_name,
  description = excluded.description,
  phone = excluded.phone;

-- Dos anuncios disponibles de cada categoría pasan a ser del proveedor de demo.
UPDATE experiences
SET provider_id = (
  SELECT id FROM users WHERE email = 'proveedor.demo@luxydrive.test' AND role = 'provider'
)
WHERE id IN (1, 2, 6, 7, 11, 12);
