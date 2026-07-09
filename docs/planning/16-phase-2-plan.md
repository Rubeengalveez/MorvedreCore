# Plan de Fase 2 — Entrenamientos y partidos

> Fecha: 2026-06-26. Plan de ejecución.

## Objetivo

Que los entrenadores generen sesiones de entrenamiento desde bloques, pasen lista, y los coaches creen partidos con convocatorias (con matriz de ascensos y regla B). Los jugadores confirman por RSVP y reciben notificaciones in-app. El delegado mete el acta.

## Demo esperada

> "El entrenador crea el bloque 'Cadete B, L-X-V 18:00-19:30, sept-dic', la app genera ~40 sesiones. Marca asistencia el lunes. El sábado, el coach crea el partido, sugiere convocatoria con la matriz de ascensos (incluye Benjamines y Alevines que pueden subir), asigna dorsales, los jugadores reciben notificación, confirman por RSVP. Tras el partido, el delegado mete el acta (goles, exclusiones, MVP)."

## Alcance detallado

### 1. Base de datos (migraciones 0011-0018)

- **0011** `training_blocks` — bloques de generación
- **0012** `training_sessions` — sesiones concretas
- **0013** `training_attendance` — lista de asistencia
- **0014** `matches` — partidos
- **0015** `match_availability` — bloqueos manuales del jugador
- **0016** `match_callups` — convocatorias
- **0017** `match_stats` — actas
- **0018** `notifications` — buzón in-app (no push real todavía)

Todas con RLS, helper functions, triggers.

### 2. Funciones de dominio

- `lib/domain/training.ts` — `generateSessionsFromBlock`, `weekdayMatches`, `durationMinutes`
- `lib/domain/callups.ts` — `canCallUpTo`, `getBRuleTeamsForCategory`, `isPlayerBRuleBlocked`, `findConflicts`, `suggestCallup`, `defaultCapForPlayer`
- `lib/domain/stats.ts` — `computePlayerStats`, `aggregateSeasonStats`
- `lib/domain/attendance.ts` — `buildAttendanceResult`, `markAllPresent`, `diffAttendance`
- `lib/domain/calendar.ts` — `getMonthCells`, `monthLabel`, `weekdayShort`, `formatTimeOfDay`, etc.

### 3. Server actions

- `training.ts` — `createTrainingBlock`, `updateTrainingBlock`, `deleteTrainingBlock`, `generateSessionsFromBlockAction`, `cancelTrainingSession`, `uncancelTrainingSession`, `markAttendance`, `markAllPresent`
- `matches.ts` — `createMatch`, `updateMatch`, `deleteMatch`, `createCallup`, `updateCallup`, `setMyCallupStatus`, `deleteCallup`, `setMatchStatus`, `recordMatchStat`, `validateMatchStats`, `suggestCallupForMatch`
- `availability.ts` — `setAvailability`, `setMyAvailability`
- `notifications.ts` — `markNotificationRead`, `markAllNotificationsRead`, `getUnreadCount`

### 4. UI

**Admin:**

- `/admin/trainings` — listar bloques, crear, ver sesiones generadas, pasar lista, cancelar
- `/admin/matches` — listar partidos, crear, ver detalle
- `/admin/matches/[id]` — convocatoria, acta, detalles

**Público:**

- `/calendar` — vista mensual con entrenos y partidos
- `/matches/[id]` — detalle de partido, RSVP del jugador
- `/profile` — read-only con stats + sección de disponibilidad
- `/notifications` — buzón in-app

**Componentes:**

- `components/calendar/{month-view, event-sheet}.tsx` — calendario y sheet
- `components/matches/rsvp-buttons.tsx` — RSVP
- `components/notifications/{notifications-bell, inbox}.tsx` — campana + buzón
- `components/profile/availability-calendar.tsx` — calendario de disponibilidad

## Auditoría post-implmentación

- 4 críticos, 5 altos, 4 medios. Todos arreglados.
- Las correcciones más importantes:
  - `requireCoachOf` permite que los coaches gestionen sus equipos (no solo admin)
  - Trigger en `match_callups` protege columnas sensibles contra modificación por jugadores
  - `hasCancelled` solo marca días con partidos/entrenos cancelados (no todos los días de partido)
  - `markAllPresent` preserva los motivos de ausencia existentes
  - `createCallup` rechaza jugadores sin `birth_year` para evitar errores de categoría
  - `localDateOnly` usa la hora local de España (no UTC) para evitar desfase de día

## Validación

- 313 tests + 22 skip = 335 totales
- 0 errores de lint, typecheck, build
- 24 rutas
