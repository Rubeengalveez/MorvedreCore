# Plan de Fase 1 — Estructura deportiva

> Fecha de planificación: 2026-06-26. Esta fase construye la base operativa: temporadas, equipos, jugadores, familias, staff.

## Objetivo de la fase

Que el admin (Rubén) pueda crear la temporada actual, los 7 equipos competitivos + 1 Escuela, asignar los 3 entrenadores, dar de alta a los ~200 jugadores con su año de nacimiento, vincularlos con sus padres/tutores, y que el resto del club pueda ver la estructura de los equipos y navegar entre perfiles (selector padre-hijo).

## Demo esperada

> "El admin crea una temporada, los equipos y mete a los jugadores con su año de nacimiento. La categoría se asigna sola. Cada jugador aparece en su equipo. Un padre ve a sus hijos y puede cambiar de perfil."

## Alcance detallado

### 1. Base de datos (migraciones)

**`supabase/migrations/0003_seasons.sql`**

- Tabla `seasons` con `is_current` (solo una activa a la vez, índice parcial único)
- Seed: la temporada 2025/2026 como inactiva + 2026/2027 como activa (estamos en junio 2026, así la 25/26 está en su último mes)

**`supabase/migrations/0004_teams.sql`**

- Tabla `teams` con:
  - `category_code` enum extendido con `escuela`
  - `team_type` enum `competitive | school`
  - `gender` enum `male | female | mixed`
  - `color` (hex, default por categoría: benjamín verde, alevín amarillo, infantil naranja, cadete azul, juvenil rojo, absoluto negro, escuela blanco)
- Índice único `(season_id, label)`

**`supabase/migrations/0005_team_staff.sql`**

- Tabla `team_staff` con `role` enum `head_coach | assistant_coach | delegate | physical_trainer`
- FK a `teams` y `profiles` con `on delete cascade`
- Constraint: una persona no puede tener 2 veces el mismo role en el mismo equipo

**`supabase/migrations/0006_team_rosters.sql`**

- Tabla `team_rosters` con `joined_at`, `left_at`, `squad_number`
- Constraint: `left_at > joined_at` o ambos null
- Una persona puede estar en varios equipos de la misma season si cambia de equipo a mitad de temporada

**`supabase/migrations/0007_profiles_extend.sql`**

- Añadir columnas a `profiles`:
  - `team_color` text (default por categoría, lo setea el admin al crear equipo y se copia al profile)
  - `school_enrolled` boolean (true si está en escuela)
  - `school_payment_paid` boolean

### 2. Funciones de dominio (`lib/domain/`)

**`lib/domain/categories.ts`**

- `inferCategory(birthYear, currentYear): CategoryCode` — función pura testeable
- `ageIndex(birthYear, currentYear): number`
- `isValidCategory(category): boolean`
- Tabla cerrada: 11=benjamín, 12-13=alevín, 14-15=infantil, 16-17=cadete, 18-19=juvenil, 20+=absoluto

**`lib/domain/teams.ts`**

- `defaultCategoryColor(category): string` — color por defecto
- `defaultTeamGender(category): 'male' | 'female' | 'mixed'` — benjamín/alevín/infantil = mixed, cadete/juvenil/absoluto = male
- `canRosterPlayer(player, team): boolean` — verifica que el player cabe en la categoría del team (la categoría del team permite N-1 a N+1)

**`lib/domain/seasons.ts`**

- `inferCurrentSeason(): {label, start, end}` — para "hoy es 2026-06-26 → temporada 2025/2026 activa hasta jul 2026"
- `isInSeason(season, date): boolean`

### 3. Panel admin (`/admin`)

**Layout**: `app/(app)/admin/layout.tsx` con tabs/sub-navegación:

- Tabs: Temporadas | Equipos | Jugadores | Familias | Staff | Configuración
- Solo accesible para usuarios con rol `admin`
- Si no eres admin, redirige a `/dashboard`

**Sub-páginas**:

- `app/(app)/admin/seasons/page.tsx` — lista de temporadas + crear temporada
- `app/(app)/admin/seasons/new/page.tsx` — formulario de crear
- `app/(app)/admin/teams/page.tsx` — lista de equipos por temporada
- `app/(app)/admin/teams/new/page.tsx` — crear equipo
- `app/(app)/admin/teams/[id]/page.tsx` — detalle + asignar staff + asignar jugadores
- `app/(app)/admin/players/page.tsx` — lista global de jugadores con búsqueda
- `app/(app)/admin/players/new/page.tsx` — alta individual
- `app/(app)/admin/players/import/page.tsx` — import desde Excel
- `app/(app)/admin/families/page.tsx` — lista de parent_child_links
- `app/(app)/admin/staff/page.tsx` — asignaciones de staff a equipos

**Server Actions** (`server/actions/admin/`):

- `seasons.ts` — createSeason, updateSeason, setCurrentSeason, archiveSeason
- `teams.ts` — createTeam, updateTeam, assignStaff, unassignStaff
- `players.ts` — createPlayer, updatePlayer, assignToTeam, removeFromTeam, importFromExcel
- `families.ts` — linkParentChild, unlink
- `staff.ts` — assignStaff, unassign (subset de teams.ts)

Todos con validación Zod, manejo de errores, mensajes en español.

### 4. Vistas públicas

**`/team/[team-slug]`** (`app/(app)/team/[teamId]/page.tsx`):

- Foto/logo del equipo (placeholder con color del equipo)
- Nombre: "Cadete B"
- Categoría + entrenador
- Lista de jugadores con foto, dorsal, posición (placeholder)
- Si eres coach del equipo: botón "Editar"
- Si eres admin: también

**`/team`** (reemplaza el placeholder) — vista que muestra el equipo del perfil activo:

- Si eres jugador: tu equipo
- Si eres coach: tus equipos
- Si eres padre: el equipo del perfil activo (hijo seleccionado)

### 5. Selector de perfil (`profile-switcher.tsx`)

Ya existe en Fase 0. Lo extendemos para:

- Cargar los hijos del profile activo desde `parent_child_links`
- Si eres admin, mostrar también tu propio perfil
- Cambio de perfil actualiza la cookie + el dashboard

### 6. Dashboard actualizado

Cuando hay datos:

- "Tu próximo partido" con la fecha del próximo partido del equipo del perfil activo
- Stats strip: goles (del perfil activo), asistencia (del perfil activo), dorsal (del perfil activo)
- "Tu equipo" con link a `/team`

Cuando no hay datos (estado actual):

- Mantener los empty states

### 7. Import desde Excel

**`scripts/import-players.mjs`**:

- Lee un archivo Excel con columnas: nombre_completo, año_nacimiento, dorsal_opcional, categoria_opcional, dni_tutor_opcional, email_tutor_opcional, telefono_opcional
- Crea auth users para los tutores si no existen
- Crea profiles
- Asigna roles (player al jugador, parent al tutor)
- Crea parent_child_links
- Asigna a equipos si se especifica
- Reporta errores fila por fila
- Es idempotente (no duplica si ya existe)

**Template Excel**: `docs/import-template-players.xlsx` con las columnas pre-formateadas

### 8. Tests

**`tests/unit/categories.test.ts`**: 6+ tests para `inferCategory` (cubre todos los rangos de edad)
**`tests/unit/teams.test.ts`**: 4+ tests para `canRosterPlayer` y `defaultTeamGender`
**`tests/unit/seasons.test.ts`**: 3+ tests para `inferCurrentSeason` y `isInSeason`
**`tests/e2e/admin-flow.spec.ts`**: test de Playwright que crea una season, un team, un player (puede ser contra el dev server con DB de prueba)

## Entregables al final de la fase

1. **Repositorio con Fase 1 commiteada y mergeada a main**
2. **App en el dev server** con:
   - Login funcional
   - Panel admin accesible
   - CRUD de temporadas, equipos, jugadores
   - Vista de equipo
   - Import desde Excel
3. **Tests pasando**: unit + integration
4. **Documentación actualizada**:
   - `14-phase-1-summary.md`
   - `13-lessons-learned.md` actualizado
   - `00-decisions-log.md` actualizado
   - `AGENTS.md` actualizado
5. **Email al usuario** con instrucciones de prueba y el enlace al dev server

## Estructura de commits

1. `feat(db): migraciones Fase 1 (seasons, teams, team_staff, team_rosters, profiles extend)`
2. `feat(domain): funciones de categoria, season, team`
3. `feat(admin): layout del panel admin + sub-pages`
4. `feat(admin): CRUD temporadas`
5. `feat(admin): CRUD equipos`
6. `feat(admin): CRUD jugadores + import Excel`
7. `feat(admin): gestion de familias (parent_child_links)`
8. `feat(public): vista publica de equipo`
9. `feat(profile): selector de perfil funcional`
10. `feat(dashboard): muestra datos reales del perfil activo`
11. `test: unit + e2e para Fase 1`
12. `docs: resumen Fase 1 + lessons actualizadas`

## Skills a usar

- `frontend-design` — para las decisiones estéticas
- `vercel-react-best-practices` — para performance
- `web-design-guidelines` — para validar accesibilidad
- `supabase` + `supabase-postgres-best-practices` — para migraciones y RLS

## Riesgos y mitigaciones

| Riesgo                        | Mitigación                                                         |
| ----------------------------- | ------------------------------------------------------------------ |
| RLS demasiado permisiva       | `TO authenticated` + `USING` predicate + tests de RLS con servicio |
| Admin UI con permisos rotos   | Verificar en cada Server Action con `is_admin()`                   |
| Import Excel con datos sucios | Validación Zod por fila, reporte de errores, no abortar todo       |
| Performance con 200 jugadores | Paginación, búsqueda client-side o server-side con índices         |
| Categoría calculada mal       | Tests exhaustivos de la función pura                               |
