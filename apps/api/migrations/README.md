# Migraciones D1

- Crea una nueva con `pnpm db:new <nombre>` (prefijo de fecha/hora).
- Nunca edites una migración que ya esté en `staging`: crea otra.
- La CI las aplica antes de desplegar cada entorno. En `dev` se acumulan; si dev queda inconsistente, lanza la Action **Reset dev DB**.
