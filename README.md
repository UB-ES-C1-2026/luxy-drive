# LuxyDrive

Marketplace de experiencias en vehículos de lujo (jets privados, yates y autocaravanas). Proyecto de Enginyeria del Software (UB).

| Entorno | URL | Rama | Se despliega cuando… |
| --- | --- | --- | --- |
| dev | https://dev.luxydrive.workers.dev | `dev` (generada) | se abre una PR contra `staging` o se hace push a ella, o cambia `staging` |
| staging | https://staging.luxydrive.workers.dev | `staging` | se mergea una PR en `staging` |
| producción | https://app.luxydrive.workers.dev | `main` | se crea un tag `v*` sobre `main` |

## Stack

Monorepo con pnpm workspaces.

```
apps/web        Front estático: Vite + React + TypeScript + TanStack Router + Tailwind
apps/api        API: Hono en un Cloudflare Worker, con D1 (SQLite) como base de datos
packages/ui     @luxydrive/ui: única librería de componentes del front (basada en DESIGN.md)
```

Cada entorno es **un solo Worker de Cloudflare**: sirve los archivos estáticos de `apps/web/dist` (gratis, sin ejecutar código) y solo ejecuta Hono para `/api/*`. Front y API comparten origen, así que no hay CORS. El front llama a la API con el cliente tipado de Hono (`apps/web/src/api.ts`).

## Empezar

Requisitos: Node 22 y pnpm (`corepack enable`).

```bash
pnpm install
pnpm dev          # front en http://localhost:5173 (con proxy de /api a wrangler en :8787)
```

En local, D1 se simula en `apps/api/.wrangler/`: no hace falta cuenta de Cloudflare.

| Comando | Qué hace |
| --- | --- |
| `pnpm lint` / `pnpm format` | Biome (lint + formato) |
| `pnpm typecheck` | TypeScript en todos los paquetes |
| `pnpm test` | Tests (la API usa Vitest dentro del runtime de Workers) |
| `pnpm build` | Build del front |
| `pnpm db:new <nombre>` | Crea una migración D1 en `apps/api/migrations/` |

## Estrategia de ramas

```
feature/*  ──PR──►  staging  ──PR──►  main  ──tag v*──►  producción
               │
               └──► dev = staging + todas las PRs abiertas contra staging
```

1. **Crea tu rama desde `staging`**: `feature/US-001-browse`, `fix/...`, `chore/...`.
2. **Abre una PR contra `staging`** en cuanto tengas algo. Cada push a tu rama regenera `dev` (staging + todas las PRs abiertas) y la despliega en https://dev.luxydrive.workers.dev. Así pruebas tu cambio junto con el de los demás.
3. Si tu PR choca con `staging` o con otra PR anterior, queda fuera de `dev` y recibe la etiqueta `dev-conflict`: actualiza tu rama con `staging` y resuelve el conflicto. La etiqueta `no-dev` excluye una PR a propósito.
4. Cuando está probada en dev y revisada (1 aprobación + CI en verde), **squash merge a `staging`** → se despliega en staging (preproducción, la que prueba QA).
5. **Release:** PR `staging → main` (merge commit). Después, crea el tag desde `main`:
   ```bash
   git switch main && git pull
   git tag v0.1.0 && git push origin v0.1.0
   ```
   El tag despliega a producción.
6. **Hotfix:** rama `hotfix/...` desde `main` → PR a `main` → tag. Al mergear, se abre solo un issue "Back-merge pendiente": abre la PR `main → staging` y mérgeala con merge commit para que staging no pierda el arreglo.

Reglas del equipo: a `staging` y `main` solo se llega por PR con CI en verde y 1 aprobación; `main` solo acepta PRs desde `staging` o `hotfix/*` (el check `source-branch` falla si no); `dev` solo la escribe GitHub Actions. **Nunca hagas push directo a `staging`, `main` ni `dev`.**

## Base de datos (D1)

- Una base de datos por entorno: `luxydrive-dev`, `luxydrive-staging`, `luxydrive-prod`.
- La CI aplica las migraciones pendientes antes de cada despliegue.
- **Nunca edites una migración ya mergeada**: crea una nueva con `pnpm db:new`.
- En dev las migraciones de PRs se acumulan (aunque la PR se cierre). Si dev queda inconsistente: Actions → **Reset dev DB** → escribe `reset-dev`. Borra las tablas de dev, reaplica las migraciones y carga `apps/api/seed/dev.sql` si existe.

## Despliegue y credenciales

Los despliegues los hace siempre GitHub Actions; nadie necesita acceso a Cloudflare para desarrollar.

- Secret `CLOUDFLARE_API_TOKEN`: token con permisos de Workers, D1 y R2 de la cuenta.
- Variable `CLOUDFLARE_ACCOUNT_ID`.
- Configuración de los tres entornos: `apps/api/wrangler.jsonc`.

| Workflow | Disparador |
| --- | --- |
| `ci.yml` | PR contra `staging` o `main` |
| `dev.yml` | PRs contra `staging` y push a `staging` |
| `deploy-staging.yml` | push a `staging` |
| `deploy-production.yml` | tag `v*` en `main` |
| `main-guard.yml` | PR contra `main` |
| `back-merge.yml` | push a `main` |
| `reset-dev-db.yml` | manual |
