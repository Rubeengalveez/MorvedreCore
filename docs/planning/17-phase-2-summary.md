# Resumen de Fase 2 — Entrenamientos y partidos

> Estado: **completada**, commiteada, validada.

## Logros

### Base de datos (8 migraciones, 0011-0018)

- `training_blocks`, `training_sessions`, `training_attendance`: gestión de entrenamientos con bloques generadores
- `matches` con `competition_type` (league/cup/tournament/friendly)
- `match_availability`, `match_callups`, `match_stats`: convocatoria + RSVP + acta
- `notifications`: buzón in-app (sin push real todavía, eso es Fase 9)
- 24 policies RLS, helper functions, triggers

### Funciones de dominio (5 archivos)

- `lib/domain/training.ts` — generación de sesiones desde bloques
- `lib/domain/callups.ts` — matriz de ascensos + regla B + sugerencia
- `lib/domain/stats.ts` — stats agregados
- `lib/domain/attendance.ts` — gestión de listas
- `lib/domain/calendar.ts` — month view, format helpers

### Server actions (4 archivos)

- `training.ts` — 8 acciones, todas con `requireCoachOf` (no solo admin)
- `matches.ts` — 11 acciones
- `availability.ts` — 2 acciones
- `notifications.ts` — 3 acciones

### UI

- `/admin/trainings` — bloques, generación, pasar lista
- `/admin/matches` + `/admin/matches/[id]` — partidos, convocatoria, acta
- `/calendar` — vista mensual con eventos
- `/matches/[id]` — detalle + RSVP
- `/profile` — incluye sección de disponibilidad
- `/notifications` — buzón
- Componentes: `MonthView`, `EventSheet`, `RsvpButtons`, `NotificationsBell`, `AvailabilityCalendar`

## Validación

```
lint:        0 errores
typecheck:   0 errores
tests:       313/313 + 22 skip = 335 totales
build:       24 rutas, 0 errores
```

### Tests por categoría

| Suite                    | Tests        | Cobertura                                        |
| ------------------------ | ------------ | ------------------------------------------------ |
| `categories.test.ts`     | 15           | boundaries, validaciones, hex, labels            |
| `teams.test.ts`          | 20           | regla asimétrica, categorías, escuela            |
| `seasons.test.ts`        | 15           | bordes de temporada                              |
| `calendar.test.ts`       | 33           | month view, format, weekdays, timeAgo            |
| `training.test.ts`       | 27           | generación de sesiones desde bloques             |
| `callups.test.ts`        | 37           | matriz ascensos, regla B, conflictos, sugerencia |
| `stats.test.ts`          | 9            | computePlayerStats, aggregate                    |
| `attendance.test.ts`     | 10           | markAllPresent, diff                             |
| `ui-primitives.test.tsx` | 22           | smoke de componentes                             |
| `import-zod.test.ts`     | 38           | import Excel                                     |
| `admin-actions.test.ts`  | 82           | Zod schemas                                      |
| `rls.test.ts`            | 14 (13 skip) | RLS policies                                     |
| `query-helpers.test.ts`  | 10 (9 skip)  | query helpers                                    |
| `example.test.ts`        | 3            | cn()                                             |

**Total: 335 tests** (313 pasan siempre, 22 skip sin env Supabase)

## Auditoría post-Fase 2

- **4 críticos** identificados, todos arreglados:
  - Coaches bloqueados de training (era audit antiguo, ya con requireCoachOf)
  - RLS gap en match_callups (trigger añadido en 0016)
  - hasCancelled always true (ya estaba bien)
  - markAllPresent destroy reasons (ya preserva)

- **5 altos** identificados y arreglados:
  - createCallup skip age check (ya rechaza si birth_year null)
  - inferCategorySafe negative ages (devuelve null)
  - B rule array order (usa label detection)
  - Calendar UTC vs local (usa localDateOnly)
  - (más correcciones en commits)

- **4 medios**: skip, low priority

Ver `13-lessons-learned.md` sección "Auditoría Fase 2" para el detalle.

## Decisiones tomadas

- `competition_type` enum: league, cup, tournament, friendly
- Convocatorias: 13 jugadores por defecto (configurable)
- Dorsal automático desde profile.cap_number, con resolución de conflictos
- Notificaciones in-app primero, push real en Fase 9
- Match attendance RSVP confirmado/declined/withdrawn
- Stats: goles, exclusiones, MVP (sin desglose por tipo de exclusión todavía)

## Cómo probar

1. **Aplicar las migraciones** (ver bloque de SQL abajo)
2. Login como admin
3. Tab "Entrenamientos" → "Nuevo bloque" → crear bloque (ej. Cadete B, L-X-V, sept-dic, 18:00-19:30)
4. Click en el bloque → "Generar sesiones" → crea ~40 sesiones
5. Click en una sesión próxima → "Pasar lista" → marcar asistencia
6. Tab "Partidos" → "Nuevo partido" → crear (ej. Cadete B vs Elche, sábado 10:00, league)
7. Click en el partido → "Sugerir convocatoria" → auto-sugiere 13 jugadores
8. Login como un jugador (que sea uno de los llamados) → `/matches/[id]` → "Confirmo" / "No puedo"
9. Tab "Calendario" (bottom nav) → ver mes con eventos
10. Ver campana de notificaciones (top bar) → ver convocatorias pendientes

## Pendiente

- Push notifications reales (Fase 9 polish)
- Desglose de exclusiones por tipo (Fase 3)
- Rankings públicos (Fase 3)
- Histórico de partidos entre rivales (Fase 3)
