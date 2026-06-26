# AGENTS.md — Contexto del proyecto para futuros agentes

> Lee este archivo primero si vas a trabajar en este proyecto. Resume lo esencial sin tener que abrir todos los documentos de `docs/`.

## Qué es esto

**Morvedre Core** es la PWA propia del Club Waterpolo Morvedre (Puerto de Sagunto, Valencia). Reemplaza a Cluber para eliminar comisiones y centralizar gestión deportiva, comunicativa, logística y de tesorería.

150-250 personas en el club (jugadores desde Benjamín hasta Absoluto + padres + staff + directiva). El usuario (Rubén / `galvillo9@gmail.com`) es admin total, entrenador de Cadete B y Juvenil, y jugador. **El club nunca usó Cluber**: la app se construye desde cero con objetivo de coste 0 y autosuficiencia tecnológica.

**Particularidades del club** (ver `00-decisions-log.md`):
- 3 entrenadores: Vega (Benjamín), Vitaliy (Alevín, Infantil, Cadete A, Absoluto), Rubén (Cadete B, Juvenil).
- 7 equipos competitivos + 1 "Escuela" especial (3 niños, 2 días/semana, 100€/temporada, sin partidos).
- Estructura directiva: 3 "deportivos" + Eva (secretaria) + Mónica (tesorera) + Sol (tienda). No hay presidente.
- Roles modulares: cualquier persona puede tener varios. Los directivos también son padres.
- Mixto hasta Infantil, masculino desde Cadete (4 chicas juegan en Cadete masculino por excepción).
- Competición FNCV (autonómica): liga + copa + torneos.
- Temporada septiembre → julio.
- Sin pagos en la app: el cierre mensual se envía por email a la tesorera como Excel.

## Documentos de referencia

Toda la planificación está en `docs/planning/`. **Orden de lectura sugerido**:

1. `00-decisions-log.md` — qué se ha decidido y por qué
2. `01-gap-analysis.md` — qué huecos se detectaron en el SRS original (marcados con ✅ los resueltos)
3. `02-tech-stack.md` — stack y estructura de carpetas
4. `03-architecture.md` — modelo de datos y funciones de dominio
5. `04-roadmap.md` — fases con demos
6. `05-decisions-needed.md` — preguntas iniciales
7. `06-visual-identity.md` — paleta, tipografías, identidad visual
8. `07-discovery-process.md` — cómo extraer información del stakeholder
9. `08-hypotheses-tracker.md` — hipótesis validadas e invalidadas
10. `09-remaining-questions.md` — preguntas no bloqueantes para resolver en cada fase

## Estado actual

**Fase 2 — Entrenamientos y partidos. COMPLETADA, commiteada y validada.** Ver `docs/planning/17-phase-2-summary.md` para el detalle.

Pendiente para probar en el cloud:
- Aplicar las 8 migraciones de Fase 2 (consolidado en chat)
- Login con `galvillo9@gmail.com` y tu password
- Ir a `/admin/trainings` para crear un bloque de entrenamientos
- Ir a `/admin/matches` para crear un partido
- Ver el calendario y las notificaciones in-app

Próxima fase: **Fase 3 — Estadísticas y rankings** (rankings públicos, pichichi, exclusión, asistencia, MVP, histórico).

### Lo que ya está implementado (Fase 0 + 1 + 2)

**Fase 0:**
- Scaffold Next.js 16 + TS strict + Tailwind v4
- Diseño system con tokens del club + 12 pictogramas custom
- Componentes UI base + AppShell con bottom nav
- Auth: login, reset, cambio obligatorio
- PWA: manifest, service worker, iconos

**Fase 1:**
- 8 migraciones + seed con 3 temporadas
- Panel admin completo (6 secciones)
- Vistas públicas: /team, /team/[id], dashboard
- Profile switcher con "Mi perfil" + "Familia"
- Import desde Excel

**Fase 2:**
- 8 migraciones (training_blocks, training_sessions, training_attendance, matches, match_availability, match_callups, match_stats, notifications)
- 5 funciones de dominio (training, callups, stats, attendance, calendar)
- Server actions: training (8), matches (11), availability (2), notifications (3)
- Panel: /admin/trainings + /admin/matches (con convocatoria sugerida)
- Vistas: /calendar (month view), /matches/[id] (con RSVP), /profile (con disponibilidad), /notifications (buzón)
- Bottom nav 5 tabs: Inicio, Calendario, Equipo, Tienda, Yo

### Decisiones cerradas (ver `docs/planning/00-decisions-log.md`)

- Logo del club copiado a `public/brand/logo-original.png` (2.2MB, optimizar).
- Paleta: azul profundo `#0A2E5C` + naranja `#FF6B35` + amarillo balón `#F4C430`.
- Nombre visible de la app: "Morvedre Core".
- Idioma: solo castellano.
- Foto del jugador: visible para todos los miembros del club (sin opt-out).
- Datos personales (teléfono, email): privados.
- Rankings públicos para todo el club.
- Notificaciones configurables por usuario.
- Tono: cercano y directo, segunda persona.
- `team_type` enum: `competitive | school`.
- `canRosterPlayer` asimétrica: el equipo puede estar 1 categoría por encima del jugador, sin límite hacia abajo.
- `requireCoachOf(teamId)` además de `requireAdmin()`: los coaches gestionan sus propios equipos.
- `competition_type` enum para partidos: `league | cup | tournament | friendly`.
- 13 jugadores por defecto en convocatoria (configurable).
- Dorsal automático desde `profile.cap_number`, con resolución de conflictos.
- Notificaciones in-app primero, push real en Fase 9.

## Convenciones de trabajo

- **No tocar la planificación sin dejar nota en `00-decisions-log.md`.**
- **Toda mutación pasa por Server Action con Zod.** Nada de escribir directamente desde el cliente a Supabase.
- **RLS en TODAS las tablas.** La seguridad se define en SQL, no en TS.
- **El cálculo de categoría nunca se almacena.** Se deriva de `birth_year` y la `season` actual.
- **Lógica de negocio en `lib/domain/*` como funciones puras testeables.**
- **Mobile-first.** Diseño a 320px, luego mejora. Touch targets ≥ 48×48px.
- **TypeScript strict siempre.**
- **Cero comentarios en código** salvo que el usuario los pida explícitamente.
- **Tono cercano, segunda persona.** Nunca "Se convoca al jugador..." en mensajes.
- **Triggers en DB** para protecciones de columnas que RLS no puede expresar.

## Próximo paso acordado

**Fase 3 — Estadísticas y rankings**: pichichi, exclusión, asistencia, MVP, histórico de rivales, sección "Leyendas".

## Documentos disponibles

- `docs/planning/00-decisions-log.md` — decisiones tomadas
- `docs/planning/01-gap-analysis.md` — huecos del SRS
- `docs/planning/02-tech-stack.md` — stack
- `docs/planning/03-architecture.md` — modelo de datos
- `docs/planning/04-roadmap.md` — roadmap completo
- `docs/planning/05-decisions-needed.md` — preguntas iniciales
- `docs/planning/06-visual-identity.md` — identidad visual
- `docs/planning/07-discovery-process.md` — proceso de descubrimiento
- `docs/planning/08-hypotheses-tracker.md` — hipótesis
- `docs/planning/09-remaining-questions.md` — preguntas pendientes
- `docs/planning/10-design-direction.md` — dirección de diseño
- `docs/planning/11-feature-suggestions.md` — features sugeridos (rechazados)
- `docs/planning/12-phase-0-summary.md` — resumen Fase 0
- `docs/planning/13-lessons-learned.md` — errores a no repetir
- `docs/planning/14-phase-1-plan.md` — plan detallado Fase 1
- `docs/planning/15-phase-1-summary.md` — resumen Fase 1
- `docs/planning/16-phase-2-plan.md` — plan detallado Fase 2
- `docs/planning/17-phase-2-summary.md` — resumen Fase 2

## Si dudas

- **Sobre requisitos**: vuelve al SRS original del usuario (primer mensaje de la conversación). Está en el chat, no en archivos.
- **Sobre el modelo de datos**: `03-architecture.md` § 2.
- **Sobre las fases**: `04-roadmap.md`.
- **Sobre decisiones tomadas**: `00-decisions-log.md`.
- **Sobre estilo visual**: `06-visual-identity.md` y `10-design-direction.md`.
- **Sobre la estructura de una fase**: `12-phase-0-summary.md`, `15-phase-1-summary.md` o `17-phase-2-summary.md`.
- **Sobre errores a evitar**: `13-lessons-learned.md`.
