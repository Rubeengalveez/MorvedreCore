# Estado Operativo y Cierre de Auditoría — Morvedre Core

**Fecha:** 4 de septiembre de 2026  
**Versión:** 1.0.0-rc  
**Referencia:** Remediación completa de la auditoría integral ([2026-09-04-project-audit.md](file:///c:/Users/galvi/Documents/Morvedre%20core/docs/audits/2026-09-04-project-audit.md))

---

## 1. Resumen de remediación

Todos los hallazgos prioritarios clasificados en la auditoría técnica (P0, P1 y P2) han sido solventados, probados con suites automáticas y verificados en compilación estricta de producción.

### P0 — Seguridad y Estabilización Inmediata
1. **PWA y Caché Privada**: Se eliminó la caché genérica `defaultCache` de Serwist en `app/sw.ts`. Ahora solo se cachean recursos públicos estáticos del mismo origen (`/brand/`, `/icons/`, `/fonts/`). Los datos autenticados, RSC y endpoints `/api/` nunca se almacenan sin conexión.
2. **Dependencias Vulnerables**: Actualización a `next@16.3.3` y `eslint-config-next@16.3.3`. La auditoría con `pnpm audit --prod` arroja **0 vulnerabilidades conocidas**. Se eliminó la configuración obsoleta `experimental.viewTransition` en `next.config.ts` restaurando la compatibilidad limpia con TypeScript.
3. **Temporada 2026/2027**: Creado el script seguro `scripts/prepare-2026-2027-season.mjs` con modo simulación (`--dry-run`), creación de los 8 equipos del club (`--apply`) y activación controlada (`--activate`) cuando el club apruebe el inicio de las competiciones oficiales.
4. **Hook de Instalación PWA**: Estabilidad absoluta del orden de hooks en `components/pwa/pwa-install-prompt.tsx`, protegido con test unitario de regresión.

### P1 — Robustez y Operación
5. **ESLint**: Limpio (0 errores en todo el proyecto).
6. **Aprobación de Accesos con Compensación Segura**: En `server/actions/auth.ts`, se blindó `approveAccessRequest`. Las contraseñas de usuarios existentes nunca se modifican hasta que todas las escrituras de perfil, roles y vínculos familiares hayan finalizado con éxito. Para usuarios nuevos, si la base de datos falla, se compensa eliminando la cuenta en Auth y las filas intermedias.
7. **Sustitución de Horarios Atómica**: Migración `20260904160000_audit_remediation_indexes_and_schedule.sql` con la función transaccional `atomic_replace_training_schedule`. Si falla la inserción de las nuevas sesiones, la transacción se revierte íntegramente en Postgres, impidiendo la pérdida accidental de horarios anteriores.
8. **Consulta de Asistencias Acotada**: En `app/(app)/admin/trainings/page.tsx`, la carga de asistencias se acota estrictamente a los `sessionIds` de la ventana visible de 4 semanas.
9. **Tesorería Escalable en Móvil**: `TreasuryProfileManager` incorpora paginación con revelado progresivo (24 por página) y botón "Cargar más", reduciendo la altura y complejidad del DOM para evitar bloqueos en dispositivos móviles. `PaidButton` ampliado a touch target accesible (48×48 px) con `aria-label` descriptivo.
10. **Monitorización de Errores**: Clarificado el comportamiento de `lib/monitoring/error-logger.ts` como logging estructurado de servidor/cliente con redacción estricta de secretos.
11. **Copias de Seguridad Demostradas**: `scripts/backup-db.mjs` genera checksum SHA-256 y falla estrictamente si alguna tabla no puede exportarse. Se añadió `scripts/verify-backup.mjs` para comprobar la integridad de las copias (30 tablas, 7.295 registros verificados con éxito).

### P2 — Accesibilidad, Calidad y Mantenibilidad
12. **Accesibilidad WCAG y Touch Targets (≥ 48×48 px)**:
    - Checkbox de solicitudes de acceso en `access-requests-manager.tsx` con contenedor táctil de 48 px y `aria-label`.
    - Input de búsqueda de personal en `staff-client.tsx` con `aria-label`.
    - Input de suscripción a calendario en `calendar-sync-card.tsx` con `aria-label` y altura `min-h-12`.
    - Selector de modo de vista del calendario (Mes, Semana, Agenda) con botones `min-h-12`.
13. **Mensaje Offline Honesto**: El banner y la página sin conexión informan con precisión que ciertas funciones requieren conectividad.
14. **Prevención de UUID Vacíos**: Validaciones antes de invocar filtros de Supabase para evitar consultas con cadenas vacías `""`.
15. **Índice en Clave Foránea**: Índice añadido sobre `training_attendance_audit (changed_by)`.
16. **Eliminación de Código Muerto**: Eliminadas ~370 líneas no consumidas de `getDashboardData` en `server/queries/dashboard.ts`.
17. **Permisos y Delegados**: Mantenidos e integrados los permisos de delegados para gestión de partidos, convocatorias y actas con `requireMatchStaffOf` y políticas RLS.
18. **Cohesión Visual**: Reemplazado el alias superficial `AppPageHero` por `PageHeader`.
19. **Tienda con Acabado de Marca**: Las tarjetas de producto sin imagen cuentan ahora con un diseño cuidado con el pictograma oficial `Balon` del club, gradiente de marca y badge "Oficial Morvedre".
20. **Importación desde Excel**: La importación de datos se define como importación universal desde hojas de cálculo Excel, confirmando que el club no depende ni utilizó Cluber.

### Sprint 2 — Lanzamiento del Club y Operación
21. **Guías de Rol de Una Página**: Creadas las 5 guías operativas adaptadas al lenguaje directo del club en `docs/guides/`:
    - `guia-familias.md`: Instalación PWA, selector de hijos, RSVP y cuotas familiares.
    - `guia-entrenadores.md`: Pasar lista diaria a pie de piscina, convocatorias inteligentes y actas.
    - `guia-tesoreria.md`: Filosofía sin comisiones, excepciones de cuota, búsqueda rápida y exportación de cierre a Excel.
    - `guia-tienda.md`: Gestión de catálogo, ciclo de pedido (proveedor → piscina → entrega) y filtros.
    - `guia-administracion.md`: Aprobación segura de accesos, rosters, transición 2026/2027 y verificación de backups.
22. **Ensayos de Transición y Respaldo**: Scripts `prepare-2026-2027-season.mjs`, `backup-db.mjs` y `verify-backup.mjs` probados y listos para ejecución operativa.
23. **Microacabados de Tienda**: Tarjetas de producto unificadas con pictograma oficial `Balon`, insignias de marca y estados visuales limpios.

---

## 2. Estado Global de los 3 Sprints

| Sprint | Alcance Técnico / Código | Pruebas Automáticas | Documentación | Estado |
|---|---|---|---|---|
| **Sprint 0: Seguridad y Estabilización** | ✅ 100% | ✅ 100% | ✅ 100% | **COMPLETADO** |
| **Sprint 1: Robustez, Rendimiento y Accesibilidad** | ✅ 100% | ✅ 100% | ✅ 100% | **COMPLETADO** |
| **Sprint 2: Lanzamiento del Club** | ✅ 100% (Herramientas, scripts y guías) | ✅ 100% | ✅ 100% (5 guías de rol) | **TÉCNICAMENTE COMPLETADO** *(Pendiente de validación física en campo por el club)* |

> [!NOTE]
> Lo único que queda del Sprint 2 son las **acciones humanas y físicas** que solo el club puede realizar en el mundo real:
> 1. Probar la recepción de notificaciones push nativas y correos en teléfonos móviles físicos de los miembros.
> 2. Realizar las 5 sesiones cortas de observación de usabilidad con Eva (secretaria), Mónica (tesorería), Sol (tienda), entrenadores y familias.
> 3. Ejecutar `node scripts/prepare-2026-2027-season.mjs --apply --activate` cuando la directiva apruebe el inicio del nuevo calendario competitivo.

---

## 3. Evidencias de Verificación

- **TypeScript (`tsc --noEmit`)**: 0 errores.
- **ESLint (`eslint`)**: 0 errores.
- **Seguridad de dependencias (`pnpm audit --prod`)**: 0 vulnerabilidades conocidas.
- **Pruebas Automatizadas (`vitest run`)**: 70 suites, 613 pruebas pasando, 0 fallos.
- **Build de Producción (`next build --webpack`)**: Generación exitosa de todas las rutas y Service Worker `/sw.js`.
- **Copia y Verificación**: `backup-db.mjs` y `verify-backup.mjs` ejecutados y comprobados con SHA-256.
