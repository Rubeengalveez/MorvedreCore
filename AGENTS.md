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
- Competición FNCV (autonómica).
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

**Fase 0 — Cimientos. COMPLETADA y commiteada en `main`.** Ver `docs/planning/12-phase-0-summary.md` para el detalle.

Pendiente para arrancar el dev real:
- Crear proyecto en Supabase Cloud
- Rellenar `.env.local` con las credenciales reales
- `pnpm db:push` para aplicar la migración al proyecto
- `pnpm bootstrap` para crear el primer admin (`galvillo9@gmail.com`)

Próxima fase: **Fase 1 — Estructura deportiva** (temporadas, equipos, jugadores, roles).

### Lo que ya está implementado (Fase 0)

- Scaffold Next.js 16 + TS strict + Tailwind v4
- Diseño system con tokens del club
- Componentes UI base (Button, Input, Card, Form, Alert, Sheet, Label)
- App shell: topbar + bottom nav + profile switcher
- Auth: login, reset password, cambio obligatorio de primer login
- Página de perfil editable
- Migración inicial con 4 tablas + 16 RLS policies
- Bootstrap script para el primer admin
- PWA: manifest, service worker, iconos
- CI: lint, typecheck, build, test

### Decisiones cerradas (ver `docs/planning/00-decisions-log.md`)

- Logo del club copiado a `public/brand/logo-original.png` (2.2MB, optimizar).
- Paleta: azul profundo `#0A2E5C` + naranja `#FF6B35` + amarillo balón `#F4C430`.
- Nombre visible de la app: "Morvedre Core".
- Idioma: solo castellano.
- Foto del jugador: visible para todos los miembros del club (sin opt-out).
- Datos personales (teléfono, email): privados. Solo el usuario, admin y coaches de su equipo.
- Rankings públicos para todo el club.
- Notificaciones configurables por usuario (todo por defecto).
- Tono: cercano y directo, segunda persona ("Tienes un partido mañana").
- Bootstrap del primer admin: script Node con `galvillo9@gmail.com`.
- Sin seed de equipos: el admin los crea desde la UI.
- Modelo de género: `teams.gender` configurado, pero la matriz de ascensos no filtra por género.
- `team_type` enum: `competitive | school` (para la Escuela).

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

## Próximo paso acordado

**Fase 1 — Estructura deportiva**: temporadas, equipos, jugadores, roles.

## Documentos nuevos en Fase 0

- `docs/planning/12-phase-0-summary.md` — qué se hizo
- `docs/planning/13-lessons-learned.md` — errores a no repetir

## Si dudas

- **Sobre requisitos**: vuelve al SRS original del usuario (primer mensaje de la conversación). Está en el chat, no en archivos.
- **Sobre el modelo de datos**: `03-architecture.md` § 2.
- **Sobre las fases**: `04-roadmap.md`.
- **Sobre decisiones tomadas**: `00-decisions-log.md`.
- **Sobre preguntas pendientes no bloqueantes**: `09-remaining-questions.md`.
- **Sobre estilo visual**: `06-visual-identity.md` y el logo en `public/brand/`.
- **Sobre la estructura de la Fase 0**: `12-phase-0-summary.md`.
- **Sobre errores a evitar**: `13-lessons-learned.md`.
