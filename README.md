# LuxyDrive

Marketplace de experiencias en vehículos de lujo (jets privados, yates y autocaravanas). Proyecto de Enginyeria del Software (UB).

| Entorno | URL | Rama | Se despliega cuando… |
| --- | --- | --- | --- |
| dev | https://dev.luxydrive.workers.dev | `dev` (generada) | se abre una PR contra `staging` o se hace push a ella, o cambia `staging` |
| staging | https://staging.luxydrive.workers.dev | `staging` | se mergea una PR en `staging` |
| producción | https://app.luxydrive.workers.dev | `main` | se crea un tag `v*` sobre `main` |

## Equipo

| Persona | GitHub | Rol Scrum | Rol técnico (Sprint 0) | Rol técnico (Sprint 1) |
| --- | --- | --- | --- | --- |
| Alba Cano Iglesias | `albacano` | Product Owner | Frontend | Backend |
| Roger Ayala | `RogerAyala` | Scrum Master | Backend | Frontend |
| Adam El Messaoudi Aarab | `mimissuri` | — | DevOps | Frontend |
| Ignacio Martínez Allué | `igna-mtz` | — | Backend | DevOps |
| Fedor Gorshkov | `fedorgor133` | — | Frontend | QA |
| Muqaddam Ahmad Mehmood Ashraf | `Aduhax16` | — | QA | Backend |

- **Product Owner:** escribe las user stories en Trello (con criterios de aceptación), crea las issues en GitHub y acepta lo terminado.
- **Scrum Master:** coordina el equipo, lleva el Excel del sprint y vigila que Trello, issues y Excel cuadren.
- **Roles técnicos:** cada persona cambia de rol técnico al menos una vez durante el curso.

## Stack

Monorepo con pnpm workspaces.

```
apps/web        Front estático: Vite + React + TypeScript + TanStack Router + Tailwind
apps/api        API: Hono en un Cloudflare Worker, con D1 (SQLite) como base de datos
packages/ui     @luxydrive/ui: única librería de componentes del front (basada en DESIGN.md)
```

Cada entorno es **un solo Worker de Cloudflare**: sirve los archivos estáticos de `apps/web/dist` (gratis, sin ejecutar código) y solo ejecuta Hono para `/api/*`. Front y API comparten origen, así que no hay CORS. El front llama a la API con el cliente tipado de Hono (`apps/web/src/api.ts`).

### Sistema de diseño

Todos los componentes del front están en `@luxydrive/ui` y siguen `DESIGN.md`. Puedes verlos funcionando en el **catálogo de componentes**: https://dev.luxydrive.workers.dev

Antes de hacer una pantalla, mira el catálogo y móntala con esos componentes. Si falta alguno, créalo en `packages/ui` siguiendo `DESIGN.md` (ver [AGENTS.md](AGENTS.md)).

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

1. **Una historia = una rama = una PR contra `staging`.** Crea la rama desde `staging`: `feature/US-006-registro-cliente` (también `feature/JS-001-ofertas`). No uses sufijos de tarea como `US-006.a` en la rama. Las tareas conservan sus issues: frontend, API y tests colaboran en la misma rama y PR, con commits separados y sin force-push sobre el trabajo de otros. Abre la PR como borrador mientras falten tareas; cuando estén verificadas, referencia cada issue con su propio `Closes #n`.
   - Los elementos técnicos sin historia usan su propio código: `chore/SP-002-auth-decisions`, `chore/TR-003-story-branches`; un bug usa `fix/BUG-xxx-slug`.
   - Transición: las PRs abiertas antes de adoptar esta norma continúan su revisión actual; no se renombran ni se agrupan retroactivamente. Para trabajo nuevo de una historia que ya tiene rama, coordina con su responsable y reutilízala.
   - CI y Dev seleccionan PRs por destino (`staging`, y también `main` para CI), no por nombre de rama. El nuevo formato no necesita cambiar esos workflows.
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

### PR vinculada a una issue (TR-004)

Toda PR, incluidas las `chore/`, necesita una issue. Escribe `Closes #28` o
`Fixes #28` en su descripción, fuera de comentarios HTML y bloques de código.
Para varias tareas resueltas, usa una referencia por issue. El check
`issue-reference` falla si falta la referencia y se repite al editar el cuerpo,
abrir/reabrir la PR o subir commits. No verifica que el cambio resuelva la issue:
eso sigue siendo responsabilidad de los tests y la revisión humana.

La protección de `staging` debe exigir `issue-reference`, además de CI (`checks`)
y una aprobación humana. Activación: integrar primero este workflow, actualizar
las ramas de las PRs abiertas para que lo incluyan y comprobar sus checks; solo
entonces exigirlo. Así no se bloquean PRs con un check que todavía no pueden emitir.
No se considera completada TR-004 hasta verificar la protección activa.

Prueba manual sobre una PR propia: quitar la referencia, comprobar el check rojo,
añadir `Closes #n` y comprobar el verde. No hace falta mergear. Nunca borrar el
vínculo de una PR ajena para ensayar. Pruebas locales: `node --test scripts/check-pr-issue.test.mjs`.

## Definition of Done

Una tarea solo pasa a Done cuando cumple todo esto. La [plantilla de PR](.github/pull_request_template.md) ya incluye el checklist.

- [ ] Cumple los criterios de aceptación de su user story (Trello).
- [ ] La PR va contra `staging` y cierra su issue (`Closes #n`).
- [ ] `pnpm lint && pnpm typecheck && pnpm build && pnpm test` pasan y la CI está en verde.
- [ ] Cada endpoint nuevo tiene su test en `apps/api/test/`.
- [ ] Se ha probado en dev (https://dev.luxydrive.workers.dev).
- [ ] Una persona del equipo (no el agente) ha revisado y aprobado la PR.
- [ ] La PR indica qué partes ha generado un agente y qué se ha corregido.
- [ ] README / AGENTS.md actualizados si el cambio lo necesita.
- [ ] La Product Owner ha aceptado la funcionalidad.
- [ ] La issue está en Done en el Project y la tarea al día en el Excel.

## Base de datos (D1)

- Una base de datos por entorno: `luxydrive-dev`, `luxydrive-staging`, `luxydrive-prod`.
- La CI aplica las migraciones pendientes antes de cada despliegue.
- **Nunca edites una migración ya mergeada**: crea una nueva con `pnpm db:new`.
- En dev las migraciones de PRs se acumulan (aunque la PR se cierre). Si dev queda inconsistente: Actions → **Reset dev DB** → escribe `reset-dev`. Borra las tablas de dev, reaplica las migraciones y carga `apps/api/seed/dev.sql` si existe.

### Modelo mínimo de experiencias (SP-001.a)

Una fila de `experiences` representa una experiencia concreta, con un vehículo descrito
como texto y una fecha de servicio. En Sprint 0 no hay reservas; no se modelan todavía
usuarios, proveedores ni inventarios separados. El seed ficticio pertenece a SP-001.b (#10).

| Campo | Convención |
| --- | --- |
| `id` | Entero, clave primaria; se genera si se omite al insertar. |
| `title`, `description`, `vehicle`, `location` | Nombre, descripción, vehículo y ciudad o ruta. |
| `category` | `jet`, `yacht` o `camper`, igual que `ListingCategory` en la UI. |
| `service_at`, `offer_expires_at` | Segundos Unix UTC, enteros (no milisegundos). |
| `capacity` | Entero mayor que cero. |
| `price_cents` | Entero no negativo en céntimos de EUR, por la experiencia completa. |
| `published`, `offer_active` | `0` o `1`; por defecto `0` para no publicar datos incompletos. |
| `offer_type` | `standard` (por defecto), `empty_leg` o `last_minute`. No cambia el filtro de disponibilidad. |

**Disponible** significa que se cumplen las cuatro condiciones a la vez:
`published = 1`, `offer_active = 1`, `offer_expires_at > now` y `service_at > now`.
`now` se calcula una vez por petición en segundos UTC. En el instante exacto de caducidad
o de inicio del servicio la experiencia deja de estar disponible. Una fila caducada se
conserva: el detalle debe poder distinguirla de un identificador inexistente (US-002).

Las fechas se guardan y comparan en UTC; la interfaz las presenta en **Europe/Madrid**,
incluidos sus cambios de horario. El precio es siempre en **EUR por la experiencia completa**,
no por persona. La UI convierte céntimos a euros dividiendo entre 100 cuando sea necesario.

Ejemplo de inserción ficticia para quien prepare el seed (las fechas deberán ajustarse
para que los casos disponibles sigan siendo futuros en la demo):

```sql
INSERT INTO experiences
  (title, description, category, vehicle, location, service_at, capacity,
   price_cents, published, offer_active, offer_expires_at, offer_type)
VALUES
  ('Vuelo de demo', 'Datos ficticios', 'jet', 'Jet ficticio', 'Madrid → Palma',
   unixepoch('2026-11-01T12:00:00Z'), 6, 125050, 1, 1,
   unixepoch('2026-10-31T12:00:00Z'), 'empty_leg');
```

Defaults del spike: una oferta y una fecha por experiencia, ubicación como texto libre y
precio total fijo. Son suficientes para US-001 y US-002; separar entidades o añadir
reservas queda para requisitos posteriores. Los casos de demo deben incluir las tres
categorías, un empty-leg y experiencias caducadas o con servicio pasado.

### API de catálogo (US-001.b)

`GET /api/experiences` devuelve `200` con un array de experiencias disponibles,
ordenadas por `service_at` y después `id`. Sin resultados devuelve `[]`.
No necesita parámetros ni autenticación en Sprint 0.

```json
[
  {
    "id": 1,
    "title": "Vuelo de demo",
    "category": "jet",
    "location": "Madrid → Palma",
    "serviceAt": "2026-11-01T12:00:00.000Z",
    "price": 1250.5,
    "currency": "EUR",
    "priceUnit": "experiencia completa",
    "offerType": "empty_leg"
  }
]
```

`price` ya está en euros: la API divide `price_cents` entre 100; el frontend no debe
volver a dividirlo. `serviceAt` es ISO 8601 UTC: presentar con `Intl.DateTimeFormat`
y `timeZone: "Europe/Madrid"`. `category` y `offerType` conservan los valores del modelo.
El frontend puede usar `client.api.experiences.$get()`; el tipo se deriva de `AppType`.
Un fallo interno devuelve `500` y `{ "error": "internal_error" }`, sin detalles de D1.
El seed y las pantallas se implementan en sus tareas correspondientes.

### Filtro por categoría (US-003.b)

`GET /api/experiences?category=jet|yacht|camper` devuelve solo las experiencias
disponibles de esa categoría, con el mismo objeto y orden que el catálogo. Sin
`category` devuelve todas. Desde el frontend:
`client.api.experiences.$get({ query: { category: "yacht" } })`.

| Caso | Status | Cuerpo |
| --- | --- | --- |
| Categoría válida o sin `category` | `200` | Array de experiencias (o `[]`) |
| Categoría no válida (incluye vacía o en mayúsculas) | `400` | `{ "error": "invalid_category" }` |

### Filtro por ciudad (US-004.b)

`GET /api/experiences?location=<ciudad>` devuelve las experiencias disponibles cuya
ubicación contiene ese texto, sin distinguir mayúsculas ni acentos: "malaga" devuelve
lo mismo que "Málaga", y "palma" encuentra también la ruta "Madrid → Palma". Se combina
con `category` y se aplican los dos filtros. Desde el frontend:
`client.api.experiences.$get({ query: { location: "malaga", category: "yacht" } })`.

| Caso | Status | Cuerpo |
| --- | --- | --- |
| Con o sin `location` | `200` | Array de experiencias (o `[]`) |
| `location` vacía, solo espacios o de más de 100 caracteres | `400` | `{ "error": "invalid_location" }` |

### Filtro por fecha de servicio (US-005.b)

`GET /api/experiences?from=YYYY-MM-DD&to=YYYY-MM-DD` devuelve las experiencias
disponibles con fecha de servicio entre esos dos días en hora de Madrid
(`Europe/Madrid`, con sus cambios de horario), **ambos incluidos**: el rango va desde
las 00:00 de `from` hasta las 23:59:59 de `to`. Se puede usar solo `from` o solo `to`,
y se combina con `category` y `location`. Desde el frontend:
`client.api.experiences.$get({ query: { from: "2026-11-10", to: "2026-11-12" } })`.

| Caso | Status | Cuerpo |
| --- | --- | --- |
| Rango válido, o solo `from` o solo `to` | `200` | Array de experiencias (o `[]`) |
| Fecha mal formada o inexistente (`2026-02-30`, `15/06/2026`, vacía) | `400` | `{ "error": "invalid_date" }` |
| `to` anterior a `from` | `400` | `{ "error": "invalid_date_range" }` |

### API de detalle (US-002.b)

`GET /api/experiences/:id` devuelve el mismo objeto que el catálogo más `description`,
`vehicle` y `capacity`. El frontend puede usar
`client.api.experiences[":id"].$get({ param: { id: "1" } })`.

| Caso | Status | Cuerpo |
| --- | --- | --- |
| Disponible | `200` | Detalle de la experiencia |
| `id` no es un entero positivo | `400` | `{ "error": "invalid_id" }` |
| No existe o no está publicada | `404` | `{ "error": "not_found" }` |
| Publicada pero ya no disponible (oferta inactiva o caducada, o servicio pasado) | `410` | `{ "error": "not_available" }` |
| Fallo interno | `500` | `{ "error": "internal_error" }` |

Una experiencia sin publicar responde como inexistente para no revelar borradores.
"Disponible" sigue la definición del modelo, con `now` calculado una vez por petición.

### API de ofertas (JS-001.b)

`GET /api/offers` devuelve `200` con las experiencias que tienen una oferta flash
(`last_minute`) o empty-leg activa, ordenadas por la que caduca antes y después `id`.
Sin ofertas devuelve `[]`. Desde el frontend: `client.api.offers.$get()`.

Una experiencia aparece si está **disponible** (definición de US-001), su `offer_type` es
`last_minute` o `empty_leg` y tiene un precio original mayor que el actual. Devuelve el
mismo objeto que el catálogo más `originalPrice` y `offerExpiresAt`:

```json
[
  {
    "id": 3,
    "title": "Escapada a Ibiza de última hora",
    "category": "jet",
    "location": "Valencia → Ibiza",
    "serviceAt": "2026-11-01T12:00:00.000Z",
    "price": 4800,
    "originalPrice": 6900,
    "currency": "EUR",
    "priceUnit": "experiencia completa",
    "offerType": "last_minute",
    "offerExpiresAt": "2026-10-31T12:00:00.000Z"
  }
]
```

`price` es el precio con descuento y `originalPrice` el de antes, los dos en EUR por la
experiencia completa (encajan con `price` y `originalPrice` de `ListingCard`).
`offerExpiresAt` es ISO 8601 UTC: presentar en `Europe/Madrid`. Un fallo interno devuelve
`500` y `{ "error": "internal_error" }`.

En la base de datos, `original_price_cents` (migración `add_offer_original_price`) guarda el
precio antes del descuento; `price_cents` sigue siendo el precio que se paga y `NULL`
significa que no hay descuento.

### API de registro de cliente (US-006.b)

`POST /api/auth/signup` con `{ "name", "email", "password" }` crea una cuenta de cliente,
inicia la sesión (cookie `luxydrive_session`) y devuelve `201` con
`{ "id", "name", "role": "client" }`. Desde el frontend:
`client.api.auth.signup.$post({ json: { name, email, password } })`.

- El email se guarda sin espacios y en minúsculas; si ya existe (como cliente o proveedor)
  responde `409` y `{ "error": "email_exists" }`.
- Nombre vacío, email no válido o contraseña de menos de 8 caracteres responden `400` con
  `invalid_name`, `invalid_email` o `invalid_password`.
- Una petición sin `Origin` o con otro origen responde `403` y `invalid_origin`.
- Tablas `users` y `sessions` (migración `create_users`), según SP-002. La contraseña se
  guarda con hash y nunca aparece en respuestas ni logs.

### API de acceso y cierre de sesión (US-007.b)

- `POST /api/auth/login` con `{ "email", "password" }`: si son correctos, inicia una sesión
  nueva (cookie `luxydrive_session`, 7 días) y devuelve `200` con `{ "id", "name", "role" }`.
  Contraseña incorrecta y email inexistente responden igual: `401` e `invalid_credentials`.
  Un cuerpo sin email o contraseña responde `400` e `invalid_body`.
- `POST /api/auth/logout`: borra la sesión en D1 y caduca la cookie. Responde `204` también sin
  sesión. Las sesiones de otros dispositivos siguen activas.
- `GET /api/auth/me`: usuario de la sesión actual (`200` con `{ "id", "name", "role" }`) o `401`
  y `unauthorized`. Sirve al frontend para proteger las páginas privadas.
- Desde el frontend: `client.api.auth.login.$post({ json })`, `client.api.auth.logout.$post()`
  y `client.api.auth.me.$get()`.
- Las rutas privadas usan el middleware `requireUser` (`apps/api/src/auth/session.ts`), que
  responde `401` sin sesión válida o con la sesión caducada.

### API de registro de proveedor y rutas de proveedor (US-033.b)

- `POST /api/auth/signup/provider`: igual que el registro de cliente (mismas validaciones,
  `409 email_exists` si el email ya existe como cliente o proveedor), pero crea la cuenta con
  rol `provider` e inicia su sesión. Desde el frontend:
  `client.api.auth.signup.provider.$post({ json: { name, email, password } })`.
- Las funciones de proveedor se montan en `apps/api/src/routes/provider.ts` y cuelgan de
  `/api/provider/*`: sin sesión responden `401 unauthorized` y con una cuenta de cliente
  `403 forbidden`. El rol sale siempre de la sesión en D1, nunca de la petición.

### API de anuncios en borrador (US-009.b)

Un proveedor prepara sus anuncios como borrador y vuelve a ellos más tarde. Todo cuelga
de `/api/provider/experiences`, detrás de la sesión de proveedor de US-033 (`401` sin
sesión, `403` a una cuenta de cliente). Las escrituras exigen el `Origin` propio.

| Petición | Respuesta |
| --- | --- |
| `POST /api/provider/experiences` con al menos `title` | `201` con el borrador |
| `GET /api/provider/experiences` | `200` con los anuncios propios (borradores y publicados), del más nuevo al más antiguo |
| `GET /api/provider/experiences/:id` | `200` con el anuncio propio; `403 forbidden` si es de otro proveedor; `404 not_found` si no existe |
| `PATCH /api/provider/experiences/:id` con uno o varios campos | `200` con el borrador actualizado; `403` si es de otro; `409 already_published` si ya está publicado |

Campos: `title` (obligatorio, hasta 120 caracteres), y opcionales `description`,
`category` (`jet`, `yacht` o `camper`), `vehicle`, `location` y `capacity` (entero
positivo). Un campo no válido responde `400` con `invalid_<campo>`, por ejemplo
`{ "error": "invalid_title" }`. La respuesta es el anuncio con `status`: `draft` o
`published`; los campos sin rellenar van a `null`.

Los borradores (`published = 0`) no salen en `GET /api/experiences` ni en el detalle
público. La propiedad se comprueba en SQL con `provider_id`, no solo con el rol (SP-002).

En la base de datos, la migración `experience_drafts` rehace la tabla `experiences`:
todos los campos salvo `title` pasan a ser opcionales, se añade `provider_id` (`NULL` en
los datos de demo) y una restricción obliga a que un anuncio publicado tenga todos los
campos que necesitan el catálogo y el detalle.

### Precio y fecha de servicio del borrador (US-011.b)

`POST` y `PATCH /api/provider/experiences[/:id]` aceptan también:

- `price`: número en EUR por la experiencia completa, mayor o igual que 0 y con dos
  decimales como máximo. Se guarda en céntimos en `price_cents`.
- `serviceAt`: fecha y hora **en hora de Madrid** con el formato de un
  `<input type="datetime-local">`, por ejemplo `"2026-11-10T18:00"`. Se guarda en
  segundos UTC en `service_at`, teniendo en cuenta el cambio de hora.

La respuesta del anuncio incluye `price`, `currency: "EUR"`,
`priceUnit: "experiencia completa"` y `serviceAt` en ISO 8601 UTC (`null` si no se ha
rellenado). Si algo no es válido, no se guarda ningún campo de esa petición:

| Caso | Status | Cuerpo |
| --- | --- | --- |
| Precio negativo, con más de dos decimales o que no es un número | `400` | `{ "error": "invalid_price" }` |
| Fecha mal escrita o inexistente | `400` | `{ "error": "invalid_service_at" }` |
| Fecha y hora ya pasadas | `400` | `{ "error": "service_at_in_past" }` |

## Despliegue y credenciales

Los despliegues los hace siempre GitHub Actions; nadie necesita acceso a Cloudflare para desarrollar.

- Secret `CLOUDFLARE_API_TOKEN`: token con permisos de Workers, D1 y R2 de la cuenta.
- Variable `CLOUDFLARE_ACCOUNT_ID`.
- Secret de Workers `AUTH_PEPPER` en `dev`, `staging` y `production`: valor aleatorio de al menos
  32 bytes y distinto en cada entorno (SP-002). Sin él, registro y login responden `500`. Lo
  configura DevOps con `wrangler secret put AUTH_PEPPER --env <entorno>`; en local va en
  `apps/api/.dev.vars` (`AUTH_PEPPER=...`).
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

## SP-002: autenticación y roles (Sprint 1)

Decisión de diseño para #29. La implementación corresponde a #45 (registro de
cliente y BD), #48 (login/logout) y #51 (registro y autorización de proveedor).
No añade endpoints ni migraciones por sí sola.

### Contraseñas

- Usar Web Crypto nativo de Workers: PBKDF2-HMAC-SHA-256, 100 000 iteraciones,
  salt aleatorio de 16 bytes por contraseña y resultado de 32 bytes. Guardar
  versión, algoritmo, iteraciones, salt y hash; nunca la contraseña ni sus logs.
- Antes de PBKDF2, aplicar HMAC-SHA-256 a la contraseña UTF-8 con un secreto
  `AUTH_PEPPER` aleatorio de al menos 32 bytes, distinto por entorno. El resultado
  binario es la entrada de PBKDF2. El pepper va en Workers Secrets y en
  `.dev.vars` en local, nunca en D1 ni en Git. Si falta, fallar de forma cerrada.
  Los tests usarán un secreto ficticio. No cambiar el pepper sin planificar el
  restablecimiento de contraseñas: cambiarlo invalida las verificaciones existentes.
- Comparar hashes con una función de tiempo constante disponible en Workers.
  Para email inexistente, ejecutar también la derivación con un registro ficticio
  y responder igual que para contraseña incorrecta: `401 invalid_credentials`.
- Motivo: funciona sin librerías nativas ni servicios externos. **Compromiso del
  sprint:** el límite de Workers es 100 000 iteraciones; no equivale a la
  recomendación de OWASP de 600 000 para PBKDF2-SHA-256. El pepper separado de D1
  reduce el riesgo de una filtración solo de la BD, pero no sustituye ese coste.
  Antes de abrir registro público real, revisar el hash y limitar intentos de
  registro/login; no presentar esta decisión como un endurecimiento de producción.
- Referencias: [Web Crypto de Workers](https://developers.cloudflare.com/workers/runtime-apis/web-crypto/),
  [límite de PBKDF2 en workerd](https://github.com/cloudflare/workerd/issues/1346),
  [OWASP Password Storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html).

### Usuarios y sesiones en D1

- `users`: id, nombre, email normalizado (trim + minúsculas, `UNIQUE`), datos del
  hash y rol restringido a `client` o `provider`. Un email identifica una sola
  cuenta entre ambos roles. La restricción SQL resuelve también registros simultáneos.
- El endpoint de registro de cliente fija `client`; el de proveedor fija
  `provider`. No aceptar un rol arbitrario enviado por el navegador. El registro
  de proveedor es público según US-033; no implica aprobación de una empresa.
- `sessions`: hash SHA-256 del token como clave, `user_id` como clave foránea y
  `expires_at` como timestamp Unix UTC en segundos. El token se genera con
  `crypto.getRandomValues` (32 bytes), se codifica en base64url y solo se entrega
  al navegador. SHA-256 es adecuado aquí porque el token es aleatorio de alta
  entropía; no lo es para guardar contraseñas.
- Cookie `luxydrive_session`: `HttpOnly; Secure; SameSite=Lax; Path=/`, sin
  `Domain` (aislada por host), `Max-Age=604800`. En desarrollo local HTTP se omite
  únicamente `Secure`. Duración fija de 7 días, sin renovación automática.
- Registro y login crean un token nuevo y devuelven solo id, nombre y rol.
  Cada petición privada consulta sesión y usuario en D1; una sesión vencida
  (`expires_at <= ahora`) se rechaza aunque siga existiendo su fila.
- Logout mediante POST: borrar la sesión de D1 y expirar la cookie con el mismo
  nombre y Path. Es idempotente (204 incluso sin sesión). No basta con borrar
  la cookie: un token copiado también debe quedar invalidado. Las sesiones de
  otros dispositivos siguen activas. La limpieza de filas vencidas no condiciona
  la autorización.

### Autorización y contrato compartido

- Sin sesión válida: `401 unauthorized`. Con sesión de cliente en una ruta de
  proveedor: `403 forbidden`. Resolver el rol en servidor, nunca desde un campo
  de la petición o del almacenamiento del navegador.
- Un proveedor solo puede consultar o modificar sus propios recursos: comprobar
  también la relación de propiedad en SQL. El rol por sí solo no basta (#54, #57).
- Registro: nombre no vacío, email válido y contraseña de al menos 8 caracteres;
  `400` con campo inválido, `409 email_exists` si ya existe el email, y sesión
  iniciada tras éxito. No devolver hashes, salts, pepper ni tokens en JSON.
- Operaciones con efectos usan POST/PATCH/DELETE, nunca GET. Rechazar escrituras
  de autenticación o autenticadas cuyo `Origin` no coincida con el origen de la
  petición (también si falta); frontend y API comparten origen. Esto complementa
  SameSite frente a CSRF, incluido login/logout. No habilitar CORS con credenciales
  para orígenes arbitrarios.
- Tests de implementación: registro válido/duplicado/campos, credenciales erróneas,
  sesión ausente/vencida/revocada, separación client/provider, propiedad de recursos
  y Origin incorrecto. Las migraciones serán nuevas y compatibles con el despliegue.
