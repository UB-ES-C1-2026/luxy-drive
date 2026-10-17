# AGENTS.md

Instrucciones para agentes de IA (y humanos) que trabajan en este repo. Lee también el [README](README.md).

## Proyecto

Monorepo pnpm. `apps/web` (Vite + React + TanStack Router + Tailwind, front estático), `apps/api` (Hono en Cloudflare Workers + D1), `packages/ui` (`@luxydrive/ui`).

## Comandos

```bash
pnpm install
pnpm dev         # front :5173 + API :8787
pnpm lint        # Biome; `pnpm format` para arreglar
pnpm typecheck
pnpm test
pnpm build
pnpm db:new <nombre_snake_case>
```

Antes de dar una tarea por terminada: `pnpm lint && pnpm typecheck && pnpm build && pnpm test` deben pasar.

## Reglas

- **Front:** usa solo componentes de `@luxydrive/ui`. Si falta uno, créalo en `packages/ui` siguiendo `DESIGN.md`; no estilices componentes sueltos en `apps/web`.
- **Rutas:** archivos en `apps/web/src/routes/` (TanStack Router genera `routeTree.gen.ts`, no lo edites).
- **API:** todas las rutas cuelgan de `/api`. Encadena las rutas en `apps/api/src/index.ts` para que `AppType` las incluya y el front las llame con `client` (`apps/web/src/api.ts`), nunca con `fetch` a mano.
- **Base de datos:** cambios de esquema solo con una migración nueva (`pnpm db:new`). Nunca edites una migración existente.
- **Tests:** cada endpoint nuevo lleva su test en `apps/api/test/` (Vitest con `SELF.fetch`).
- **Ramas:** trabaja en una rama desde `staging` y abre la PR contra `staging`. No hagas push a `staging`, `main` ni `dev`.
- **Secretos:** nunca en el código ni en `wrangler.jsonc`. Variables locales en `apps/api/.dev.vars` (ignorado por git).
- Marca en la descripción de la PR qué partes ha generado un agente; un humano del equipo la revisa y responde de ella.
