# AGENTS.md

Reglas obligatorias para cualquier agente (Claude Code, Codex, Cursor, Copilot…) y para quien lo dirige. Si una petición contradice estas reglas, para y pregunta.

## Mapa

- `apps/web`: front estático. Vite, React 19, TanStack Router (rutas por archivo en `src/routes/`), Tailwind 4.
- `apps/api`: Hono en Cloudflare Workers. D1 (SQLite) en el binding `DB`; migraciones en `apps/api/migrations/`.
- `packages/ui`: `@luxydrive/ui`, la única librería de componentes. Referencia visual: [`DESIGN.md`](DESIGN.md).
- Cada entorno (dev, staging, producción) es un solo Worker: sirve `apps/web/dist` y ejecuta Hono en `/api/*`. Su configuración está en `apps/api/wrangler.jsonc`.

## Flujo

1. **Una historia = una rama = una PR contra `staging`.** Crea desde `staging` una rama `feature/US-006-registro-cliente` o `feature/JS-001-ofertas`, sin letra de tarea. Cada tarea conserva su issue; sus responsables colaboran con commits separados en la rama compartida, sin force-push sobre trabajo ajeno. Mantén la PR en borrador hasta completar y verificar las tareas; incluye un `Closes #n` por issue resuelta. Para elementos técnicos sin historia usa su código (`chore/SP-002-auth-decisions`, `chore/TR-003-story-branches`, `fix/BUG-xxx-slug`). Las PRs ya abiertas continúan su revisión sin renombrarlas o agruparlas retroactivamente.
2. **Antes de programar, ten los criterios de aceptación.** Si no los tienes, pídelos. No inventes requisitos.
3. **Haz solo lo que pide la tarea.** Nada de refactors, renombrados ni dependencias de paso.
4. **Para dar algo por terminado**, esto tiene que pasar entero:
   ```bash
   pnpm lint && pnpm typecheck && pnpm build && pnpm test
   ```
   Nunca lo fuerces con `any`, `@ts-ignore`, `biome-ignore`, `.skip` ni borrando tests.
5. **La PR** lleva un título en Conventional Commits (`feat(api): …`) y rellena la [plantilla de PR](.github/pull_request_template.md): ID de la tarea, qué y por qué, cómo probarlo, qué ha generado el agente y el checklist de la Definition of Done. Un humano la revisa antes del merge.
6. **Nunca** hagas push a `staging`, `main` ni `dev`. Tampoco merges, tags, `wrangler deploy` ni comandos con `--remote`. Eso lo hacen las personas y la CI.

## Front (`apps/web`)

- Usa **solo componentes de `@luxydrive/ui`**. En `apps/web`, Tailwind sirve solo para layout (`flex`, `grid`, `gap`, márgenes). Colores, tipografía, bordes y sombras van dentro de `packages/ui`.
- **Si falta un componente**, créalo en `packages/ui/src/<nombre>.tsx`, expórtalo en `index.ts` y usa los tokens de `DESIGN.md`. Nada de colores hex sueltos.
- **Tipografía: Inter**, la única. Usa solo imágenes propias o con licencia, y nunca marcas ni logos de terceros.
- **Datos:** llama a la API solo con `client` (`apps/web/src/api.ts`), preferiblemente en el `loader` de la ruta. Nunca uses `fetch` a mano.
- **Rutas:** una ruta = un archivo en `src/routes/`. No edites `routeTree.gen.ts`, que es generado.
- **Accesibilidad:** usa elementos nativos (`button`, `a`, `label`), deja el foco visible, pon `alt` en las imágenes y diseña para móvil primero.

## API (`apps/api`)

- **Rutas:** todas cuelgan de `/api` y se encadenan en `src/index.ts`, para que `AppType` las exporte al front. Si crece, haz un archivo por recurso en `src/routes/` y móntalo con `app.route()`.
- **Validación:** valida toda entrada con `@hono/zod-validator` + `zod`. Añádelos en la primera PR que los necesite.
- **Errores:** responde con JSON `{ "error": "<codigo>" }` y el status HTTP correcto. Nunca expongas detalles internos.
- **SQL:** siempre `DB.prepare(sql).bind(...)`. Nunca concatenes valores dentro del SQL.
- **Bindings:** si añades uno nuevo, decláralo en `src/env.ts` y en `wrangler.jsonc`, tanto en el nivel superior como en los tres entornos.
- **Tests:** cada endpoint lleva su test en `apps/api/test/` con `SELF.fetch`, como mínimo con el caso correcto y un caso de error.

## Base de datos

- El esquema solo cambia con una migración nueva: `pnpm db:new <nombre_snake_case>`. **Nunca edites una migración existente.**
- Las migraciones deben ser compatibles con el código anterior, porque se aplican antes de desplegar. Por ejemplo, primero se añade una columna y en otra PR se borra la vieja.
- Los datos de ejemplo de dev van en `apps/api/seed/dev.sql`, siempre ficticios.

## Dependencias y seguridad

- **Dependencias:** solo si hacen falta de verdad. Instálalas con versión exacta (`pnpm add -E --filter <paquete> <dep>`) y justifícalas en la PR. Nada de servicios de pago.
- **Secretos:** nunca en el código, en los logs ni en `wrangler.jsonc`. En local van en `apps/api/.dev.vars`, que está en `.gitignore`.

## Estilo

- TypeScript estricto. El formato lo decide Biome (`pnpm format`).
- Código, nombres y commits en inglés; textos de la interfaz en español.
- Comentarios solo cuando explican el porqué.
