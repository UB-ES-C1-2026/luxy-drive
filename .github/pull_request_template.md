## Qué hace esta PR

<!-- Resumen en 1-2 frases. Issue: Closes #… · User story (Trello): enlace -->

## Partes generadas por un agente

<!-- Qué ha generado el agente y qué se ha corregido a mano. "Ninguna" si no aplica. -->

## Definition of Done

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
