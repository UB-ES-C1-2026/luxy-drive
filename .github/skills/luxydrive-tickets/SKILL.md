---
name: luxydrive-tickets
description: Redacta tarjetas de Trello (historias de usuario COMO / QUIERO / PARA con granularidad, prioridad y criterios en Gherkin) e issues de GitHub (una por tarea, con código, tipo, criterios y delegación) para LuxyDrive, coherentes entre Trello, GitHub y la demo, y termina con una auto-revisión INVEST. Úsala cuando se pida crear, corregir o revisar historias de usuario, tarjetas de Trello, el backlog, bugs, deuda técnica o issues de tareas.
---

# LuxyDrive: tarjetas de Trello e issues de GitHub

Hay dos formatos fijos: la **tarjeta de Trello**, que es una historia de usuario, y la **issue de GitHub**, que es una tarea o un elemento técnico. No cambies los campos ni su orden.

**En Trello solo hay historias de usuario** (`US`, `JS` y épicas). Todo lo demás (`TR`, `SP`, `DD`, `TD`, `BUG`) vive solo como issue de GitHub, en el GitHub Project.

## Contexto del producto

LuxyDrive es un marketplace donde los clientes descubren experiencias con vehículos de lujo y los proveedores publican su capacidad disponible. Las categorías iniciales son jets privados, yates y autocaravanas, incluidas ofertas empty-leg y de última hora con descuento.

Roles:
- **Visitante:** explora.
- **Cliente registrado:** guarda favoritos y hace reservas.
- **Proveedor:** gestiona sus anuncios, su disponibilidad y sus ofertas.
- **Administrador:** tiene herramientas limitadas.

## Códigos y tamaño

El backlog incluye todo el trabajo que le cuesta tiempo al equipo, no solo historias. Cada elemento tiene un código:

| Código | Elemento | Dónde vive |
| --- | --- | --- |
| `US-xxx` | Historia de usuario | Trello + issues de sus tareas |
| `JS-xxx` | Job story | Trello + issues de sus tareas |
| `TR-xxx` | Requisito técnico o restricción | Solo GitHub |
| `SP-xxx` | Spike de investigación | Solo GitHub |
| `DD-xxx` | Decisión o cambio de diseño, cuando es un elemento propio. Si solo afecta a una historia, va como tarea de esa historia. | Solo GitHub |
| `TD-xxx` | Deuda técnica | Solo GitHub |
| `BUG-xxx` | Bug | Solo GitHub |

- **Tareas:** cada una toma el código de su elemento más una letra: `US-001.a`, `US-001.b`, `SP-001.a`…
- **Tamaño de una historia:** debe poder completarse en un sprint, con unos 3-4 días de trabajo en total hasta "hecho". Si no cabe, divídela.
- **Una issue por tarea.**
- **Una historia = una rama = una PR contra `staging`.** Usa `feature/US-006-registro-cliente` o `feature/JS-001-ofertas`: el código de la historia, sin sufijo de tarea. Las issues mantienen sus códigos de tarea (`US-006.a`, `.b`, `.c`). Sus responsables colaboran en la misma rama con commits separados, sin force-push sobre trabajo ajeno.
- **PR compartida:** abre un borrador mientras se completa la historia. Antes de integrar, verifica todas sus tareas y añade un `Closes #n` por cada issue resuelta. No cierres una tarea todavía incompleta.
- **Elementos sin historia:** usa su código propio, por ejemplo `chore/SP-002-auth-decisions`, `chore/TR-003-story-branches` o `fix/BUG-xxx-slug`; también tienen issue y PR contra `staging`.
- **Transición:** las PRs ya abiertas continúan su revisión actual, sin renombrarlas ni agruparlas retroactivamente. El trabajo nuevo reutiliza la rama de su historia si existe, coordinándose con su responsable.
- **Trazabilidad:** conserva el código de historia y los códigos de sus tareas en Trello (cuando corresponda), GitHub, Excel y demo.

## Tarjeta de Trello (historia de usuario)

```markdown
<ID> · <Título>

COMO <rol>
QUIERO <objetivo>
PARA <beneficio>

Granularidad: Fine | Medium | Épica
Prioridad: Highest | High | Medium | Low | Lowest
Story Points: <esfuerzo> · Value Points: <valor> · Riesgo: Bajo (1) | Medio (2) | Alto (3) · ROI: <VP / SP × 1/Riesgo>   (obligatorio en Fine)

Supuestos / comentarios: <si los hay>

Criterios de aceptación (solo Fine y Medium):
Scenario: <nombre>
  Given <contexto>
  When <acción>
  Then <resultado esperado>
```

- **Job story:** si una situación concreta es lo que dispara la necesidad, usa `CUANDO <situación>, QUIERO <motivación>, PARA PODER <resultado esperado>` con código `JS-xxx`. El resto de campos no cambia.
- **Epic:** usa COMO / QUIERO / PARA igual que una historia, con `Granularidad: Épica`. Las historias en que se dividirá van en un checklist "División prevista" y el resultado esperado, en un único criterio dentro del checklist "Criterios de aceptación".
- **TR, SP, DD, TD y BUG no van a Trello.** Se escriben como issue de GitHub (ver más abajo).

### Reglas de la historia

- La parte **QUIERO** describe el objetivo o el valor para el usuario, nunca la solución técnica.
  - MAL: "QUIERO iniciar sesión con usuario y contraseña".
  - BIEN: "QUIERO acceder a mi cuenta".
- La parte **PARA** es obligatoria y dice el valor que se entrega.
- Un solo rol y una sola necesidad por historia. Que sea corta, y que la interfaz quede fuera el mayor tiempo posible.
- Escribe historias, no tareas: parte del objetivo de cada rol.
- **No todo es una historia.** Hay cosas que no caben en COMO / QUIERO / PARA y no se fuerzan: van como issue de GitHub, en texto plano, con su propio código. Nunca como tarjeta de Trello.
  - Cambios de requisito.
  - Restricciones (rendimiento, stack, base de datos) y requisitos técnicos (protocolos, seguridad, cumplimiento normativo): `TR`.
  - Investigación: `SP`.
  - Bugs ("Fix bug #127"): `BUG`.
  - Deuda técnica: `TD`.
  - Tareas puras ("Decrease loading time", "Auto-save every few minutes"): tareas de su elemento, o `TR`.

### Reglas de los criterios de aceptación

- Al menos uno por historia; mejor entre 2 y 4. Se escriben antes de implementar.
- Cada criterio se puede probar por separado y tiene un resultado claro de PASS o FAIL.
- Describen el resultado final (el QUÉ), no el enfoque de la solución (el CÓMO).
- Incluyen criterios funcionales y, cuando aplique, no funcionales: rendimiento, accesibilidad, diseño adaptable y estados vacío o de error.
- Siempre en Gherkin: Given [contexto] / When [acción] / Then [resultado esperado].
- **Los criterios viven en Trello.** Ponlos como checklist "Criterios de aceptación" en la tarjeta, uno por ítem, y márcalos solo cuando pasen (PASS) en staging. Una historia no está terminada con criterios sin marcar, y nunca se marca uno que no se ha probado.

### Granularidad del backlog (DEEP)

- Empieza por las épicas y divídelas en historias. Al dividir, corta en vertical, en rebanadas finas de punta a punta, no por capa técnica.
- Genera historias suficientes para imaginar el sistema entero, con este reparto:
  - **Fine** (el ~20% de arriba): detalladas y listas para construir.
  - **Medium** (~20%): esbozadas.
  - **Epic** (~60%): grandes, para dividir más adelante.
- Sugiere una prioridad para cada historia. Para las Fine es obligatoria la estimación de Story Points (esfuerzo) y Value Points (valor de negocio); en las Medium es opcional.

### Prioridad y orden

- **El orden manda.** La posición en la lista del Product Backlog es la prioridad real: el equipo tira siempre de la tarjeta de más arriba. Se ordena por ROI = Value Points / Story Points × 1/Riesgo; si una historia depende de otras, se usa el ROI de la cadena y sus prerrequisitos van justo encima.
- **La etiqueta dice si el producto la necesita**, no cuándo se hace: `Highest` bloquea el resto del trabajo (spikes y requisitos técnicos de base), `High` es imprescindible para el producto final, `Medium` es conveniente, `Low` entra si hay tiempo y `Lowest` es opcional. Una historia `Medium` barata puede ir por delante de una `High` cara.
- **Una sola escala** en todas partes: la etiqueta de Trello de las historias, la línea `Prioridad` de la tarjeta y el campo `Priority` del GitHub Project usan los mismos cinco valores.

## Issue de GitHub (tarea)

- **Título:** el código y el nombre de la tarea.
- **Assignee:** el responsable.
- **Project:** la columna `Sprint Backlog` si entra en el sprint en curso, o `Backlog` si no, con el mismo `Priority` que la tarjeta de su historia en Trello.

```markdown
<CÓDIGO> · <Título de la tarea>

<Qué hay que hacer, en 1-2 frases.>

Tipo: Diseño | Front | API | Base de datos | Tests | DevOps | Documentación | Bug | Deuda técnica

- [ ] <criterio comprobable>
- [ ] <criterio comprobable>

Delegación: Humana | Mixta | Delegable · <historia, dependencia o motivo>
```

Significado de cada tipo de delegación:
- **Humana:** la hace una persona, por ejemplo una decisión de diseño.
- **Mixta:** el agente propone y una persona decide.
- **Delegable:** la puede hacer el agente.

**Elementos técnicos (TR, SP, DD, TD y BUG):** son issues propias, sin tarjeta de Trello. Usan la misma plantilla, con una descripción en texto plano, la `Priority` en el Project y al menos un criterio comprobable. En un `BUG`, la descripción dice qué ocurre, qué se esperaba, cómo reproducirlo y qué historia afecta.

Ejemplo:

```markdown
US-001.b · API: listar experiencias disponibles

GET /api/experiences: devuelve solo las disponibles (publicadas, con oferta activa y fecha futura).

Tipo: API

- [ ] No devuelve experiencias caducadas ni con fecha pasada
- [ ] Test en apps/api/test/

Delegación: Delegable · US-001
```

### Coherencia con Trello

La rúbrica evalúa que Trello, el Excel, GitHub y la demo cuenten lo mismo.

- **De dónde salen los criterios:** los de la issue de una tarea de historia salen de los criterios de aceptación de su tarjeta de Trello, sin contradecirlos ni añadir requisitos nuevos. Si la tarjeta no tiene criterios, pídelos antes de crear la issue.
- **Tests de aceptación:** una tarea de este tipo cubre todos los criterios de su historia. Escribe "todos los criterios de US-xxx", no un número, y anota el resultado PASS o FAIL de cada uno en la tarjeta.
- **Si cambia la tarjeta,** actualiza sus issues en el mismo momento.

### Flujo en el tablero (Kanban)

- **Recorrido:** una issue empieza en `Backlog` o `Sprint Backlog` y avanza por `In progress` e `In review` hasta `Done`. La columna dice dónde está, de dónde viene y adónde va.
- **Coger una tarea:** se coge del tablero (sistema pull); nadie empuja trabajo a otra persona. Quien la coge consta como assignee antes de moverla a la columna de trabajo en curso.
- **Límite de trabajo en curso:** respeta el límite de cada columna. Si una columna está llena, ayuda a terminar lo que hay antes de coger algo nuevo, empezando por lo que está más a la derecha.
- **Fechas:** se anotan la de entrada en `Sprint Backlog`, la de entrada en la columna de trabajo en curso y la de llegada a `Done`.
- **Cuándo se cierra:** una issue solo pasa a `Done` cuando cumple la Definition of Done (checklist de la plantilla de PR) y la PO lo ha aceptado.
- **Bug en algo terminado:** si aparece un bug en algo que ya está en `Done`, la issue no vuelve atrás. Se crea una nueva `BUG-xxx` en `Backlog` que enlace la original.

## Auto-revisión INVEST (obligatoria antes de la respuesta final)

Actúa como un coach ágil experto. Para cada historia que hayas escrito:

1. Compruébala contra los seis criterios INVEST:
   - **Independent:** se puede trabajar en cualquier orden y no depende a escondidas de una historia menos valiosa.
   - **Negotiable:** es una invitación a conversar, no un contrato; recoge la esencia, no una solución exhaustiva.
   - **Valuable:** aporta valor visible al usuario o al negocio.
   - **Estimable:** se puede estimar; si no, divídela o añade antes un spike.
   - **Small:** cabe en un sprint, unos 3-4 días de trabajo total.
   - **Testable:** sus criterios de aceptación se pueden escribir ya ("¿cómo sabré que está hecho?").
2. Si falla algún criterio, di cuál y por qué, en 1-2 frases.
3. Reescríbela para que cumpla los seis. Divídela si en realidad son varias historias. Saca lo que sea una tarea, un bug o una restricción y pásalo a su propio elemento (`TR`, `SP`, `BUG` o `TD`).
4. Para cada issue, comprueba que sus criterios salen de los de la tarjeta de Trello y que tiene Tipo y Delegación.

Muestra solo las versiones finales, ya conformes con INVEST. Después añade una sección breve, "Notas de revisión INVEST", con las historias que has ajustado y el motivo.
