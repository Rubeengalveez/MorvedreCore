# Resumen de Fase 1 — Estructura deportiva

> Estado: **completada y operativa**. Commiteada, empujada, lista para probar.

## Logros

### Base de datos

5 migraciones + 1 fix:
- `0003_seasons.sql` — temporadas con `is_current` (1 sola activa via índice único parcial)
- `0004_teams.sql` — equipos con `team_type` (`competitive` | `school`), `color` hex, `gender`, `category_code` extendido con `escuela`
- `0005_team_staff.sql` — staff de equipo (`head_coach`, `assistant_coach`, `delegate`, `physical_trainer`)
- `0006_team_rosters.sql` — plantilla de jugadores con `squad_number` (dorsal), `joined_at`/`left_at`
- `0007_profiles_extend.sql` — añade `team_color`, `school_enrolled`, `school_payment_paid` a profiles
- `0008_profiles_insert_admin.sql` — policy para que el admin pueda crear profiles

Total: 6 tablas, 24 policies RLS, 0 SECURITY DEFINER en public.

Seed con 3 temporadas (24/25 archived, 25/26 archived, 26/27 actual).

### Funciones de dominio

- `lib/domain/categories.ts` — `inferCategory`, `ageIndex`, `CATEGORY_LABELS`, `CATEGORY_COLORS`, `CATEGORY_DEFAULT_GENDER`
- `lib/domain/teams.ts` — `canRosterPlayer` (regla asimétrica: el equipo puede estar 1 categoría por encima del jugador, sin límite hacia abajo), `defaultTeamColor`, `defaultTeamGender`
- `lib/domain/seasons.ts` — `inferSeasonForDate`, `seasonContainsDate`, `formatSeasonLabel`, `currentSeasonStart/End`

### Tests

53 tests unitarios pasando:
- `tests/unit/categories.test.ts` — 15 tests (boundary 11/12, todas las edades, validaciones, hex, labels)
- `tests/unit/teams.test.ts` — 20 tests (cubre cada categoría, regla asimétrica, escuela, colores, géneros)
- `tests/unit/seasons.test.ts` — 15 tests (todas las funciones, bordes de temporada, meses críticos)
- `tests/unit/example.test.ts` — 3 tests del helper `cn()`

### Server Actions

`server/actions/admin/` con `_helpers.ts` (requireAdmin), `seasons.ts`, `teams.ts`, `players.ts`, `import.ts`, `index.ts`. Todas con `"use server"`, Zod, `requireAdmin()`, mensajes en español.

### Panel admin (`/admin`)

Layout con guard de admin + 6 sub-pestañas:
- **Temporadas** (`/admin/seasons`): lista + crear/editar/archivar/marcar actual
- **Equipos** (`/admin/teams`): grid filtrable por temporada + detalle con secciones de personal/plantilla/detalles
- **Jugadores** (`/admin/players`): tabla con búsqueda + alta individual
- **Familias** (`/admin/families`): gestión de `parent_child_links` con búsqueda de padre/hijo
- **Personal** (`/admin/staff`): asignaciones de staff a equipos
- **Importar** (`/admin/players/import`): upload de Excel + preview + commit

Home `/admin` con resumen: temporada actual, conteos por categoría, quick-links.

### Vistas públicas

- `/team` — "Tu equipo" según perfil activo (player → su equipo, coach → sus equipos, parent → equipo del hijo activo)
- `/team/[teamId]` — vista pública con hero (color band), cuerpo técnico, plantilla con dorsal y categoría derivada
- `/dashboard` actualizado: Hola + stats strip (goles, asistencia, dorsal) + pictogram tile "Tu equipo"
- `components/layout/profile-switcher.tsx` — "Mi perfil" + sección "Familia" con hijos

### Import desde Excel

`scripts/import-players.mjs`:
- Lee xlsx o csv
- Valida cada fila con Zod
- Idempotente: salta duplicados (mismo `full_name` + `birth_year`)
- Crea profiles + asigna rol `player` + opcionalmente vincula a equipo (busca por `nombre_equipo` en la temporada actual) + opcionalmente vincula a tutor (busca por `email_tutor`)
- Resumen final: `X creados, Y omitidos (duplicados), Z errores`

Template en `data/import-template.csv`.

### Componentes compartidos

- `components/ui/avatar.tsx` — avatar con iniciales (o foto si hay)
- `components/ui/select.tsx` — select nativo con estilo
- `components/team/category-badge.tsx`, `gender-badge.tsx`, `team-hero.tsx`, `team-staff-list.tsx`, `team-roster-list.tsx`, `team-list-card.tsx`, `empty-team-state.tsx`

### Query helpers

`server/queries/`:
- `seasons.ts` — `getCurrentSeason()`
- `active-profile.ts` — `getActiveProfileContext()` (resuelve propio / activo / hijos del cookie)
- `teams.ts` — `getTeamById`, `getTeamRoster`, `getTeamStaff`, `getTeamsForProfileInSeason`
- `profile-types.ts` — `ProfileSummary` type + `ACTIVE_COOKIE` constant

## Validación

```
lint:        0 errores
typecheck:   0 errores
tests:       53/53 pasan
build:       18 rutas, 0 errores
```

## Estado en producción (cloud)

- Proyecto Supabase: `hzplkjtfejqfulhhnlya`
- Migraciones Fase 1: **pendientes de aplicar** (el usuario las pega en el dashboard de Supabase)
- Seed con 3 temporadas: **pendiente de aplicar**
- Admin ya creado: `galvillo9@gmail.com` con rol `admin`

## Cómo probar

1. **Aplicar las migraciones + seed** (una sola vez):
   - Ve a https://supabase.com/dashboard/project/hzplkjtfejqfulhhnlya/sql/new
   - Pega el SQL consolidado que te paso por chat
   - Pulsa Run
   - Debe devolver "Success"

2. **Arrancar la app** (si no está ya):
   ```bash
   cd "C:\Users\galvi\Documents\Morvedre core"
   pnpm dev
   ```

3. **Login con tu admin**: `galvillo9@gmail.com` / tu contraseña (la que cambiaste en Fase 0)

4. **Ir al panel admin**: `http://localhost:3000/admin`
   - Verás "Temporada actual: 2026/2027" con el seed aplicado
   - 0 equipos, 0 jugadores (por crear)

5. **Crear los 7 equipos + 1 escuela**:
   - Tab "Equipos" → "Nuevo equipo" × 8
   - Benjamín, Alevín, Infantil, Cadete A, Cadete B, Juvenil, Absoluto, Escuela
   - El color se setea solo desde `CATEGORY_COLORS` (puedes cambiarlo)

6. **Asignar staff** (entrenadores):
   - Crear primero los profiles de los 3 entrenadores (Vitaliy, Vega, Rubén) desde el tab "Jugadores" + asignar rol `coach` desde "Personal"
   - O usar el import Excel con un archivo que los incluya
   - Asignar cada uno a sus equipos desde la página de detalle del equipo

7. **Importar jugadores desde Excel**:
   - Tab "Importar" → sube el archivo
   - Revisa el preview
   - Commit
   - El script también crea los tutores si no existen y vincula las familias

8. **Ver las vistas**:
   - `/dashboard` muestra tu perfil con stats vacías (aún no hay partidos)
   - `/team` muestra tu equipo si eres jugador, tus equipos si eres coach, los equipos de tus hijos si eres padre
   - `/team/[id]` muestra la plantilla de cualquier equipo

## Ramas

- `main` — deployable, contiene Fase 0 + el código de Fase 1 mergeado
- `feature/fase-1-estructura-deportiva` — rama de trabajo de esta fase
- Próximas: `feature/fase-2-entrenamientos-partidos` (o como se decida)

## Lo que NO está (es para Fase 2+)

- Generación de sesiones de entrenamiento (Fase 2)
- Pasar lista (Fase 2)
- Convocatorias (Fase 2)
- Partidos, actas, estadísticas (Fase 2/3)
- Rankings (Fase 3)
- Noticias (Fase 4)
- Tienda (Fase 5)
- Tesorería (Fase 6)
- Coches (Fase 7)
- Histórico / Leyendas (Fase 8)
