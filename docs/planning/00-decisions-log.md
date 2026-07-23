# Log de decisiones

## 2026-07-09 - Cierre documental Fase 7.5

- **Fase 7.5 cerrada antes de Fase 8**: `24-operational-closure-plan.md` queda marcado como plan inicial y `25-operational-closure-summary.md` como fuente de verdad del cierre operativo validado.

Registro vivo. Cada decisión se fecha y queda con su justificación. Si revertimos, se anota aquí.

## 2026-06-26 — Sesión de planificación inicial

### Identidad

- **Logo**: archivo `public/brand/logo-original.png` (2.2MB, optimizar en Fase 0). Fuente: `C:\Users\galvi\OneDrive\Desktop\ChatGPT Image 26 jun 2026, 02_11_52.png`. Pendiente versión en SVG para escalar.
- **Paleta**: clásica con azul profundo `#0A2E5C` como primario, naranja `#FF6B35` como acento de acción. Detalle completo en `06-visual-identity.md`.
- **Nombre visible de la app**: "Morvedre Core" bajo el icono PWA.
- **Idioma**: solo castellano. Sin sistema de i18n en el MVP. Se valora añadir valencià en Fase 9 si hay demanda.

### Modelo de género (decisión matizada)

El club no tiene equipo femenino. Realidad:

- **Benjamín, Alevín, Infantil**: equipos mixtos.
- **Cadete, Juvenil, Absoluto**: masculinos. Excepción documentada: hay 4 jugadoras que juegan en Cadete masculino por ausencia de línea femenina.

Implicaciones en el modelo:

- `teams.gender` como enum `male | female | mixed`, con default por categoría (benjamín/alevín/infantil = `mixed`, cadete/juvenil/absoluto = `male`).
- `profiles.gender` para estadísticas y posibles filtros futuros, pero la **matriz de ascensos no filtra por género**: solo opera con `category_code`.
- Las 4 jugadoras se dan de alta con `gender = female` y quedan en `team_rosters` del Cadete masculino. El acta y los rankings pueden opcionalmente segregar por género, pero por defecto son globales.
- Documentado en `03-architecture.md` § 2.2.

### Bootstrap

- **Primer admin**: script SQL `supabase/migrations/0001_bootstrap.sql` que crea un `auth.users` con email y password temporal, más su `profiles` y `user_roles` con `role = 'admin'`. Email por defecto: `admin@morvedrecore.app` (modificable antes de ejecutar la migración).
- El primer login fuerza cambio de contraseña.

### RGPD y fotos

- **Foto del jugador visible para todos los miembros del club** (en rankings, actas, listas de equipo). No hay opt-in/opt-out por familia en el MVP.
- Documentado: se asume que el club tiene o tendrá un consentimiento general firmado por los padres al inicio de cada temporada que cubre esta difusión interna.
- En el formulario de perfil, el jugador/padre debe confirmar explícitamente que sube la foto con permiso.

### Datos sembrados

- **No incluir seed de equipos**: el admin los crea desde la UI en su primera sesión.
- Solo seed técnico: `categories_config` (mapeo años → categorías), `treasury_concepts` (conjunto vacío), `seasons` (ninguna activa hasta que el admin cree la primera).

### Stack técnico

Confirmado el stack del documento `02-tech-stack.md`. Decisiones D.1 a D.11 todas aceptadas.

## 2026-06-26 — Descubrimiento (Fase 1)

### Contexto real del club (no asumido)

- **Masa social total**: 150–250 personas.
- **No hay migración desde Cluber**. Nunca llegaron a usarlo. La decisión de construir la app es **preventiva**: evitar caer en el modelo de comisiones.
- **Coste 0 como requisito duro**. No solo "preferimos", sino "a poder ser, coste 0". Esto refuerza todas las decisiones de stack hacia planes gratuitos y self-hosted.
- **El usuario (`galvillo9@gmail.com`)** es **RUBÉN**: admin total, entrenador (Cadete B, Juvenil) y jugador. Caso canónico de multi-rol.
- **Su hermano menor juega en el club** y sus padres son de la directiva. Caso canónico de perfil multi-generacional.

### Estructura directiva real

| Persona         | Cargo auto-asignado | Roles reales                                        | Email               |
| --------------- | ------------------- | --------------------------------------------------- | ------------------- |
| Rubén (usuario) | Admin total         | admin, coach, player                                | galvillo9@gmail.com |
| 3 "deportivos"  | Deportiva           | controlan gestión + deportiva (no son entrenadores) | (TBD)               |
| Eva             | Secretaria          | hace de todo (rol flexible)                         | (TBD)               |
| Mónica          | Tesorera            | tesorería                                           | (TBD)               |
| Sol             | "Del equipaje"      | tienda y material                                   | (TBD)               |
| (no existe)     | Presidente/a        | —                                                   | —                   |

- **No hay presidente formal**: el club opera con la comisión deportiva + la trinidad Eva/Mónica/Sol.
- **Los roles son acumulativos**: los directivos son padres de jugadores (rol `parent` también).
- **El usuario quiere poder asignar/quitar roles a quien quiera**. Esto confirma el modelo polimórfico `user_roles(role, scope_team_id)`.
- **"Habrán cosas enrevesadas"**: explícitamente dice que habrá casos complejos (multi-perfil, multi-rol, multi-equipo). El modelo debe ser flexible.

### Entrenadores reales

- **Vega**: entrena Benjamín
- **Vitaliy**: head coach. Entrena Alevín, Infantil, Cadete A, Absoluto
- **Rubén** (el usuario): Cadete B, Juvenil

### Equipos esta temporada (7 + 1 especial)

| Equipo      | Categoría          | Entrenador |
| ----------- | ------------------ | ---------- |
| Benjamín    | Benjamín mixto     | Vega       |
| Alevín      | Alevín mixto       | Vitaliy    |
| Infantil    | Infantil mixto     | Vitaliy    |
| Cadete A    | Cadete masculino   | Vitaliy    |
| Cadete B    | Cadete masculino   | Rubén      |
| Juvenil     | Juvenil masculino  | Rubén      |
| Absoluto    | Absoluto masculino | Vitaliy    |
| **Escuela** | (especial)         | (TBD)      |

**Escuela** (detalle importante):

- 3 niños en una "Escuela" que es como un cursillo del Ayuntamiento para captar gente
- No son del club, no tienen ficha federativa
- Entrenan 2 días/semana
- Pagan 100€ por temporada (no mensual)
- No juegan partidos
- **Puede que el año que viene ya no exista** → modelo debe permitir eliminar
- Cuando los niños "gradúan" a Alevines, se mueven al equipo Alevín

Implicaciones en el modelo:

- Nuevo enum `team_type`: `competitive | school`
- `treasury_concepts.periodicity` ya tenía `seasonal | monthly | one_off`, así que el concepto "Escuela 100€/temporada" cabe.
- La Escuela se configura como un equipo más, sin calendario de partidos.

### Calendario y volumen

- **Temporada**: septiembre → julio (10 meses, más larga que el estándar).
- **Entrenamientos**: Benjamín 3 días/semana, el resto 5 días/semana (L-V). Fines de semana son partidos.
- **Partidos**: formato liga, ~7-10 equipos por categoría → 14-20 partidos por equipo (ida y vuelta). Variable por categoría.
- **Competición**: FNCV (Federación Natación Comunidad Valenciana).

### Cuotas y tesorería

- **Periodicidad**: mensual por jugador.
- **Cuota menores** (Benjamín y/o Alevín): pagan menos que el resto. Cifra exacta por confirmar con Mónica.
- **Cuota base** (placeholder mientras se confirma): 60€/mes.
- **Descuento por hermanos**: no formal, "a lo mejor se aplica". Lo modelamos como `treasury_concepts.kind = 'discount'` con un valor por defecto que el admin puede ajustar.
- **Compra en tienda**: se suma a la cuota del mes en curso, no es un cargo aparte.
- **No hay pagos en la app**. El cierre mensual se envía a la tesorera por email en Excel. La tesorera concilia manualmente (Bizum/transferencia).

### Coches

- El club paga "X dinero por jugador que llevéis en el coche", en salidas largas (Elche, etc.).
- El "X dinero" no se ha cuantificado. Lo dejamos como campo configurable en el partido.
- Por defecto sugerencia: 0,15€/km o 30€/viaje. El delegado del partido decide en cada caso.

### Tienda

Productos habituales confirmados:

- Bañador, camiseta, pantalón corto y largo, sudadera, toalla, mochila
- Camiseta de afición
- Bañador chica

Configuración por producto:

- Nombre, descripción, precio, imagen
- Tiene tallas (S/M/L o numérico) o talla única
- Es personalizable (texto del jugador) o no
- Activo/inactivo

Sol (la del equipaje) será la responsable principal de gestionar el catálogo. El admin tiene también acceso.

### Convocatoria y partidos

- **Cierre**: no hay hora fija. Se puede modificar hasta durante el partido.
- **Recordatorios**: 3 días antes y 1 día antes. Configurable.
- **Acta**: la mete solo el delegado, sin validación por el entrenador.
- **MVP**: no hay MVP formal. Se puede implementar un "máximo goleador del partido" por categoría y general, que se publica semanalmente.

### Rankings y privacidad

- **Rankings públicos** para todo el club. Un cadete puede ver el Pichichi del Absoluto.
- **Datos privados vs públicos**:
  - **Públicos** dentro del club: nombre, foto, dorsal (cap number), stats, historial, equipos.
  - **Privados**: teléfono, email, dirección, datos de contacto del tutor legal.
- La RLS debe separar `profiles` (parte pública) de `profile_private` o usar un campo `is_private` por columna.

### Notificaciones

- **Configurables por usuario**.
- **Por defecto**: todas las relevantes (convocatoria, cancelaciones, noticias, pedidos, acta).
- **El usuario puede silenciar** categorías.
- Se prioriza calidad sobre cantidad: nada de "spam".

### Histórico

- **No hay datos de temporadas anteriores**. Empezamos de cero.
- El módulo "Leyendas" se construye progresivamente con los datos que se vayan generando.
- La función `archiveSeason` sigue siendo crítica: cuando se inicie la temporada 2026/2027, los datos de la actual pasarán a histórico.

### Tono de la app

- **Cercano y directo, segunda persona**.
- Ejemplos: "Tienes un partido mañana a las 10:00. ¡Confirma!" / "Tu hijo Carlos no ha confirmado la convocatoria aún".
- NO formal/institucional: "Se convoca al jugador Carlos García..." queda descartado para mensajes a jugadores, aunque puede mantenerse en emails oficiales (cierre mensual).

## 2026-06-26 — Dirección de diseño

Documentada en `10-design-direction.md`. Resumen:

- **Tesis emocional**: orgullo de pertenencia. "Esto es MI club, MI equipo, MI gente".
- **Tipografía**: Manrope (display) + Inter (body) + JetBrains Mono (números).
- **Color**: paleta confirmada, con `--team-color` dinámico por equipo.
- **Pictogramas custom** de waterpolo (gorro, balón, ola, silbato) como firma visual.
- **Componentes signature**: MatchCard, RankingRow, PlayerCard, bottom nav 4 destinos, sheet selector de perfil.
- **Anti-defaults explícitos**: NO panel admin genérico, NO minimalismo vacío, NO sombras pesadas, NO emojis, NO gradientes AI-default.
- **Empty states** con voz motivadora de club, no "No hay datos".
- **Animación contenida**: View Transitions + feedback táctil + números animados, respetando `prefers-reduced-motion`.
- **Densidad**: ni minimalista vacío ni saturado. Para todas las edades.

Si el usuario quiere tocar algo, los puntos abiertos son: tipografía, paleta exacta, estilo de cards, tono de empty states, bottom nav, densidad de información. Confirmado y documentado en `10-design-direction.md`.

## 2026-06-26 — Decisiones de Fase 2

- **Perfiles visibles entre sí (PII pública)**: por diseño del usuario ("en una app de club los miembros se ven entre sí"), la RLS de `profiles` permite SELECT a todos los autenticados. Los campos verdaderamente privados (phone_e164, email_contact) son responsabilidad del código de aplicación: nunca se seleccionan en vistas compartidas (team, dashboard, etc.). Decisión consciente del usuario. El `profiles_public` view existe como medida defensiva futura.
- **`competition_type` enum** para partidos: `'league' | 'cup' | 'tournament' | 'friendly'`. Decidido en discovery (sept 2025). El club participa en varias competiciones autonómicas.
- **Convocatorias**: 13 jugadores por defecto (configurable via parámetro `max` en `suggestCallup`). Decidido por normativa waterpolo + lógica del SRS.
- **Dorsal automático**: la app usa `profile.cap_number` como dorsal por defecto. Si hay conflicto (otro jugador ya tiene ese número en el mismo partido), busca el siguiente libre. El coach puede override manual.
- **Cancelación de entrenamientos**: WhatsApp-first, app refleja el estado. Decidido en Fase 1. La acción `cancelTrainingSession` crea notificaciones in-app para los jugadores del roster.
- **Notificaciones in-app primero, push real después**: en Fase 2 se crea el buzón in-app (bell icon + página /notifications). Push notifications reales con VAPID se implementan en Fase 9 polish. La tabla `notifications` ya soporta ambos.
- **`requireCoachOf(teamId)`** además de `requireAdmin()`: el SRS dice "los coaches gestionan sus equipos". Implementamos un helper paralelo que valida `is_coach_of(team_id)`. Los coaches pueden crear/cancelar entrenamientos y gestionar convocatorias de sus equipos sin ser admin.
- **Trigger `match_callups_protect_rsvp_columns`**: un jugador puede actualizar su propia fila de convocatoria, pero NO puede cambiar `cap_number` ni `source_team_id` (esas son decisiones del coach). Trigger BEFORE UPDATE que chequea las columnas y rechaza cambios si el actor no es admin/coach.
- **`safeInferCategory`**: variante de `inferCategory` que devuelve `null` en lugar de throw para años inválidos (futuro, muy antiguo). Usado en server actions para manejar datos sucios.
- **Calendario en zona horaria local**: las sesiones se guardan como `timestamptz` en UTC, pero se muestran en la zona del usuario (España por defecto). Helper `localDateOnly` extrae YYYY-MM-DD usando métodos locales del Date.
- **Stats MVP**: solo goles, exclusiones totales, MVP. No se desglosa por tipo de exclusión (simple/doble/penalti). Se puede extender en Fase 3.

## 2026-06-26 — Refinamientos post-Fase 1

### Competición: Liga + Copa + Torneos

- El club participa en **múltiples tipos de competición** además de la liga regular.
- Implicación: `matches.competition_type: enum('league', 'cup', 'tournament', 'friendly')` para distinguirlas.
- El SRS solo mencionaba "liga" — esto se amplia.

### Cancelación de entrenamientos

- **HOY** se hace por WhatsApp (grupo de directiva → decisión → grupo del equipo).
- **La app NO es el canal principal** para cancelaciones urgentes.
- **La app SÍ refleja el estado** de la sesión (`training_sessions.cancelled` + `cancellation_reason`).
- Implicación: el entrenador puede marcar la sesión como cancelada en la app para que conste, pero el aviso inmediato va por WhatsApp. La app es el "registro oficial" que el delegado y el jugador consultan después.

### Documentos oficiales

- El club SÍ gestiona fichas federativas y certificados médicos, pero **NO en esta app**.
- No hay módulo de documentos en el MVP.
- Eva (secretaria) sigue gestionándolos como hasta ahora.

### Sugerencias de features nuevas

- Se propusieron 6 features Tier 1 + varias Tier 2 (historias del club, end of season report, muro del equipo, reto del mes, notificación de cumpleaños, historial de rivalidades).
- **El usuario ha rechazado todas**. Mensaje literal: "no quiero meter cosas basura que realmente no sirvan".
- Implicación: la especificación se ciñe al SRS + lo extraído en discovery. No metemos feature creep.
- Sugerencias documentadas en `11-feature-suggestions.md` como histórico, todas marcadas como "rechazadas".

## Ajustes al modelo de datos

- `matches.competition_type: enum('league', 'cup', 'tournament', 'friendly')` (añadir a `03-architecture.md`)
- No se añade tabla `documents` (Eva los gestiona fuera)
- No se añade tabla `team_photos`, `challenges`, ni nada fuera del SRS + discovery

## Próximo paso

Ejecutar **Fase 0** (scaffold del proyecto). El alcance está cerrado.

### Lo que NO se hace

- ❌ **Pagos en la app** (ni tarjeta ni Bizum directo). El cierre se envía a tesorera por email.
- ❌ **App nativa** en App Store o Google Play. Solo PWA.
- ❌ **Chat general** entre usuarios. Ya tienen WhatsApp. Solo se permiten reacciones (likes, dislikes, celebrates) en noticias.
- ❌ **Comentarios largos** en noticias.
- ✅ Otras decisiones quedan a criterio nuestro (gamificación, ranking público, etc.).

### Implicaciones para el modelo de datos (resumen)

Ajustes al esquema en `03-architecture.md`:

- `teams.team_type: enum 'competitive' | 'school'`
- `profiles` se divide conceptualmente en **público** (nombre, foto, dorsal, stats) y **privado** (teléfono, email). La RLS lo gestiona.
- `profile_notification_prefs` tabla nueva: `profile_id, notification_type, enabled`
- `treasury_concepts.periodicity` ya cubre `seasonal` para la Escuela.
- `team_rosters` permite `left_at` para bajas a mitad de temporada.
- `user_roles` con `scope_team_id` para asignar `coach` a un equipo concreto.

## Próximo paso

Ejecutar el scaffold de la Fase 0:

1. `pnpm create next-app@latest morvedre-core --ts --app --tailwind --eslint`
2. Instalar: shadcn/ui, supabase, RHF, Zod, TanStack, Serwist, etc.
3. Configurar `lib/supabase/*` y `middleware.ts`
4. Configurar PWA base
5. Generar tokens de diseño y layouts
6. Instalar shadcn/ui y crear la primera pantalla (login)
7. Configurar `.env.example` con las variables de Supabase, VAPID, Resend
8. Migración inicial con tabla `profiles` + bootstrap admin

## 2026-06-26 — Decisiones de la Fase 1

### Modelo de datos

- **`team_type` enum (`competitive | school`)**: distingue los 7 equipos competitivos de la "Escuela" (3 niños, sin ficha federativa, 100€/temporada, sin partidos). Documentado en `04-roadmap.md` § Fase 1.
- **`category_code = 'escuela'`**: añadido al enum de categorías para que la Escuela sea un equipo más en la matriz de ascensos, pero con validación relajada (`canRosterPlayer` siempre devuelve `true` para `escuela`).
- **`cap_number` vs `squad_number`**: aclaración de nomenclatura. `profiles.cap_number` es el "dorsal del jugador" (lo lleva siempre, en bañador). `team_rosters.squad_number` es el "dorsal temporal del equipo" (puede cambiar si el jugador cambia de equipo dentro de la temporada). En el MVP ambos se editan manualmente y se mantienen sincronizados, pero conceptualmente son distintos.
- **`parent_child_links` RLS**: solo el propio padre, el propio hijo o un admin pueden ver un vínculo familiar. Esto protege la estructura parental de la divulgación no autorizada.

### Lógica de dominio

- **`canRosterPlayer` asimétrica**: un jugador puede ser `1` categoría por encima de la del equipo (ej: Benjamín en Alevín), pero no hay límite hacia abajo (un Cadete puede jugar en Benjamín si la situación lo requiere). Se valida en el servidor usando el año de la temporada del equipo, no el año actual del calendario.
- **`inferCategory` deriva, nunca se almacena**: el cálculo de categoría es siempre función pura de `birth_year` y el año de la temporada. No hay columna `category` en `profiles` ni en `team_rosters`.

### Privacidad

- **Visibilidad del roster**: cualquier miembro del club puede ver qué jugadores están en cada equipo (`team_rosters` SELECT abierto). Esto es intencional — los equipos son información pública interna. La PII sensible (teléfono, email) reside en `profiles` y está protegida por RLS.
- **Visibilidad del staff**: cualquier miembro del club puede ver quién entrena cada equipo (`team_staff` SELECT abierto). Intencional — los entrenadores son visibles.

## 2026-06-27 � Redise�o visual y Fase 3 (Rankings)

### Auditor�a P0 (12 bugs + t�cnica)

Antes de la fase 3 se hizo una auditor�a profunda. Se arreglaron:

- **Calendario**:
  - genda-view.tsx: comparaci�n de fecha inv�lida
    ew Date(dayIso) < new Date(now.toDateString()) que siempre era alse ? ahora dayIso < todayIsoValue.
  - calendar-view.tsx: window.location.href en onEventClick ?
    outer.push().
  - event-sheet.tsx: <a href> ? <Link>.
  - calendar-view.tsx: gendaStartIso/agendaEndIso ignoraban yearMonth ? ahora navegan correctamente.
  - ilteredAvailability se ha consolidado (no se duplica el map por equipo).
- **Tienda**: el form de email no ten�a onSubmit ni ction ? ahora tiene estado local y mensaje de �xito.
- **Contraste**: badges g-action con ext-brand-deep ? ext-paper.
- **setMyCallupStatus**: a�adido check match.status === "scheduled" || "in_progress" para que el jugador no cambie RSVP de partidos jugados/cancelados.
- **
  ecordMatchStat**: a�adido check que el jugador est� en match_callups para evitar stats de no-convocados.
- **
  ecentActivity IDs duplicados**: ${a} (objeto) daba [object Object] para todos ? ahora usa tt-.
- **Logo**: 2.13 MB PNG ? 119 KB WebP. Migrados los scripts (generate-icons.mjs, generate-favicon.mjs, generate-logos-and-pictograms.mjs) y .prettierignore.
- **Migraci�n 0019 duplicada**:  019_profiles_pii_restrict.sql renombrada a  021_profiles_pii_restrict.sql (ya exist�a  019_match_callups_rsvp_protect.sql).
- **Dependencias**: declaradas class-variance-authority, lucide-react,
  eact-hook-form que se usaban transitivamente.
- **Lint**: 26 warnings
  o-unused-vars eliminados.

### Fase 3 � Rankings

- **Vista p�blica /rankings** con tabs de scope (Club, Categor�a, Equipo) y m�trica (Goles, Excl., MVP, Asist., Racha). Tesis: el primer puesto merece podio.
- **Materializaci�n con
  anking_snapshots**: tabla con scope (season / category / eam) y scope_key. RLS abierto a todos los autenticados para SELECT; admin/all para mutaciones. Recompute disparado desde
  ecordMatchStat y alidateMatchStats.
- **opponent_stats**: agregados por rival/equipo con trigger que actualiza la fila al cambiar matches.status/inal*score*\*. Historial de rivales con computeOpponentHistory y opponentVerdict (bestia negra / v�ctima preferida / equilibrado).
- **lib/domain/rankings.ts**: funciones puras (computeRanking, indMyPosition, computeAttendanceStreak, computeOpponentHistory, opponentVerdict). 34 tests nuevos.
- **PlayerStats.attendance_streak**: a�adido al modelo; calculado dentro de computePlayerStats en orden cronol�gico inverso, ignorando canceladas.
- **Bottom nav**: 5 ? 6 tabs. Reemplazado "Tienda" como destino prioritario por "Rankings" con pictograma Trofeo. Tienda accesible desde la secci�n hom�nima en el tab Yo o v�a URL.
- **MyPositionCard** en /profile (player): 2 mini-cards (goles y asistencia) con posici�n + delta.
- **TopMetricCard** en /team/[id]: top 3 goleadores y top 3 MVPs del equipo.
- **Server actions de rankings**:
  ecomputePlayerRanking,
  ecomputeSeasonRanking, unvalidateMatchStats, ulkUnvalidateMatchStats (todas admin-only).
- **Zod schemas**:
  ecomputeRankingSchema, unvalidateMatchStatsSchema, ulkUnvalidateMatchStatsSchema. 12 tests de integraci�n a�adidos.
- **Tests**: 313 ? 359 (+46). Total 381 (22 skip por env Supabase).

### Identidad visual evolucionada

Tesis: **"marcador de piscina en el bolsillo"**. Tokens sin romper los actuales:

- pool-deep (#062048), pool-teal (#0E8C8E), pool-foam (#E8F4F8), goggle-red (#D63B2F), all-gold (#F4C430).
- LanePattern (8 carriles a 5% opacidad teal) en fondos de equipo y detalle.
- 6 componentes identitarios: CapTile (dorsal cuadrado), PoolScoreboard (marcador con franjas), PichichiPodium (top 3 con corona), Medal (1/2/3), Eyebrow (eyebrow token), PictogramBadge, ExclusionTimer.
- Pictogramas nuevos: Trofeo, Familia, Personal, FileUp. Reusados: Balon, Calendario, Equipo, Gorro, Porteria, Silbato, SilbatoActivo, Usuario, Inicio, Exclusion.
- Anti-AI defaults: NO cream+terracotta, NO black+acid, NO broadsheet.

### Lo que NO se hace (recordatorio)

- ? Desglose de exclusiones por tipo (simple/doble/penalti) ? diferido a Fase 8.
- ? P�gina "Leyendas" del club ? Fase 8 (no hay datos hist�ricos suficientes).
- ? Push notifications reales ? Fase 9 polish.

## 2026-06-27 � Pulido visual de Fase 3 (mobile-first + identidad)

### Identidad Morvedre Core

- Nuevo pictograma Tiburon (silueta del tibur�n del logo del club) � se usa en el top bar (junto al logo) y como marca decorativa en el bottom nav.
- Bottom nav reducido a 5 tabs: Inicio, Calendario, Rankings, Equipo, Yo (Tienda sale del bottom nav y queda accesible por URL).
- Border-top del bottom nav de 2px en pool-deep con badge del tibur�n como detalle decorativo.
- Top bar con el logo Morvedre Core + el tibur�n con el color del equipo activo del usuario.

### Reducci�n de redundancia

- **Dashboard**: quitados los bloques "Tu equipo" (redundante con /team + bottom nav), "Recent activity", "Esta semana", enlaces "Ver todos / Calendario" del hero. Solo se queda con: hero compacto (greeting + nombre + avatar + dorsal) + rachas con fueguito + pr�ximo evento. Esto reduce el scroll significativamente en m�vil.
- **Profile**: quitados los bloques "Notas" (metadata interna), "Top 3 personal" (ya en /rankings), "�ltimos partidos" (ya en /matches/[id]).
- **Team [id]**: reordenado el flujo: Hero > Tabs > Resumen compacto (1 fila con divide-x) > �ltimo resultado + Pr�ximo partido (grid 2 cols con PoolScoreboard) > Top del equipo (3 cards) > Racha del equipo. Eliminado el bloque "Resumen del equipo" duplicado de 3 columnas grandes.

### Token hygiene

- Todos los g-[#hex] reemplazados por tokens ar(--pool-\*), ar(--ball-gold), ar(--goggle-red).
- Solo se usan gap-3 y gap-4 (12px y 16px), nada intermedio.
- ounded-md para cards,
  ounded-sm para chips/badges, shadow-elev-1 para cards est�ndar, shadow-elev-2 para destacadas.
- Pictogramas con pictogramAccent expl�cito por tile para garantizar contraste sobre cada fondo de color.

### Limpieza de c�digo

- Eliminada la variable muerta ormatDayShort con su oid placeholder.
- Quitados los oid (0 as unknown as ActiveStreak) que eran placeholders anti-warning.
- Quitadas props no usadas:
  extEvent en DashboardHero, linkedProfiles en TopBar, coachCapNumber y ariant en TeamListCard, isAdmin en dashboard.
- Reemplazados los iconos Lucide no usados por pictogramas custom (ChevronDerecha en lugar de ChevronRight en TeamListCard).
- Reemplazados los ny por tipos concretos en server/actions y team/[teamId]/page.

## 2026-06-30 - Limpieza de bugs y migración a Next.js 16 proxy

### Bugs corregidos

- **N+1 en queries de tienda**: getShopOrdersForPlayer, getPendingShopOrdersForParent y getShopOrdersForKanban ahora hacen batch (1 query para todos los pedidos, 1 para items, 1 para productos, 1 para perfiles) en vez de 6 queries por pedido. server/queries/shop.ts reescrito con hydrateOrders + hydrateOrderItems + loadProfileNames + ssembleOrder como helpers puros.
- **Paginación rota en /news**: eed.total ahora devuelve el count real de la DB (no la longitud de la página actual), vía una query count: 'exact', head: true. Además el WHERE se aplica en la query de count para que las caducadas no se cuenten. server/queries/news.ts:45-99.
- **Conditional inútil en dmin/matches/[id]**: id: profileMeta.get(...)!.full_name.length > 0 ? c.player_id : c.player_id simplificado a id: c.player_id (siempre era el mismo valor).
- **Query duplicada en dmin/teams/[id]**: se lanzaba la misma query a profiles dos veces (llStaffProfiles y candidatePlayers); unificada en una sola variable llProfiles.
- **safeRead huérfana**: función declarada y nunca usada en server/queries/news.ts; eliminada junto con sus dos hacks oid safeRead;.
- **Archivo muerto pp/(app)/shop/shop-view.tsx**: era el placeholder de Fase 1, ya nadie lo importa; borrado.
- **Voids hacks (26 ocurrencias)**: patrón oid X; para silenciar warnings de imports no usados. Eliminados en: server/actions/admin/shop.ts, server/queries/news.ts, components/news/{news-card,news-editor}.tsx, components/calendar/calendar-view.tsx, pp/(app)/profile/page.tsx, pp/(app)/team/[teamId]/page.tsx, pp/(app)/shop/{page,[id]/page,orders/page,orders/[id]/page,\_components/cart-client}.tsx, pp/(app)/admin/shop/{page,\_components/admin-kanban-card,\_components/shop-editor-form}.tsx, pp/(app)/news/page.tsx, lib/domain/calendar.ts (oid total). Los imports no usados se borran en lugar de silenciarse.
- **Debug code en /news**: <p data-team-ids={...}> invisible y eamIds calculado y nunca usado. Limpiado. Además el createClient se movió al import estático (estaba dentro de la función con wait import(...)).

### Migración Next.js 16: middleware.ts → proxy.ts

- middleware.ts renombrado a proxy.ts y la función exportada pasa de middleware a proxy (nueva convención de Next.js 16). El helper interno lib/supabase/middleware.ts se mantiene con el mismo nombre (es un util de Supabase, no de Next).
- Matcher idéntico: salta assets, iconos, service worker, manifest, etc.

### Refactor de navegación

- **Decisión final de bottom nav** (cierra debate Fase 3-5): 5 tabs en bottom nav: Inicio, Calendario, Rankings, Equipo, Tienda. El top bar (sticky 60px) lleva Megafone (Noticias), Settings (Admin, si privileged), NotificationsBell, Avatar (perfil + switcher). Así el bottom nav se reserva para las áreas de uso frecuente y el top bar para las acciones contextuales. Tienda vuelve al bottom nav en Fase 5 porque ya no es placeholder.
- prop productById: Map<string, ShopProduct> de AdminKanbanCard declarada y nunca usada: eliminada del interface y de la query en el caller. Adicionalmente getShopProducts se quitó de dmin/shop/page.tsx porque solo se usaba para construir ese map huérfano.

### Nuevo helper de dominio

- ormatRelativeIso(iso, now?) añadido a lib/domain/calendar.ts. Formato híbrido: hora mismo / N min / N h / N d / fecha corta. Usado por pp/(app)/shop/orders/page.tsx (antes había un duplicado local con la misma lógica).

## 2026-06-30 - Aplicación de Vercel React Best Practices

### Waterfalls eliminados

- **pp/(app)/dashboard/page.tsx**: antes hacía 5 awaits secuenciales (getUser → getActiveProfileContext → seasons → user_roles → getTeamsForProfileInSeason → getDashboardData). Ahora en 2 rondas: (1) getActiveProfileContext y getCurrentSeason en paralelo, (2) user_roles, getTeamsForProfileInSeason, getStreaksForPlayer y
  anking_snapshots en paralelo. Luego getDashboardData y los datos de teams en otra ronda paralela. Además se eliminó el getUser redundante (ya está dentro de getActiveProfileContext).
- **pp/(app)/matches/[id]/page.tsx**: getActiveProfileContext y getMatchById en paralelo en vez de secuencial.
- **pp/(app)/calendar/page.tsx**: getActiveProfileContext y getCurrentSeason en paralelo, luego 3 awaits dependientes paralelos, luego vailability y ttendance paralelos.
- **pp/(app)/profile/page.tsx**: seasons y user_roles paralelos tras el getActiveProfileContext; getNextEventForProfile añadido al Promise.all principal (antes era secuencial tras el bloque). Además se eliminó el getUser redundante y el oid nextEvent; (dato nunca usado).
- **PlayerRankingSummary**: eliminados los 3 wait import(...) dinámicos por imports estáticos en el top del archivo. Ahora recibe irthYear como prop, ahorrándose una query extra a profiles y un createClient redundante.

### Bundle size

- ext.config.ts: añadido experimental.optimizePackageImports = ['lucide-react']. Esto transforma automáticamente los barrel imports de lucide-react en imports directos, sin perder la seguridad de tipos. Antes: import { Check, X } from 'lucide-react' cargaba todos los 1583 módulos en dev (~2.8s extra). Ahora solo se incluyen los iconos efectivamente usados. Es la opción recomendada por la skill (preserva type safety).

### Server-side performance

- **lib/supabase/server.ts**: createClient ahora está envuelto con cache() de React. Antes, una página con N componentes que llamaban a createClient() creaba N clientes Supabase independientes. Ahora se dedup dentro de la misma request (mismo cookies() del request).
- **server/queries/active-profile.ts**: getActiveProfileContext envuelto con cache(). Antes la misma página que llamaba al context desde el layout y desde un subcomponente ejecutaba toda la query dos veces.
- **server/queries/seasons.ts**: getCurrentSeason envuelto con cache(). Idem, dedup por request.

### Accessibility bug corregido durante la auditoría

- **components/news/news-editor.tsx**: dos <input id='news-expires'> en el mismo form (uno cuando udience === 'club' dentro del grid, otro cuando udience === 'team' fuera del grid). Dos IDs duplicados rompen el contrato HTML y la accesibilidad. Renombrado el in-grid a
  ews-expires-inline para evitar el choque. El usuario ahora ve un único input de caducidad.

## 2026-07-08 — Nuevo flujo de acceso admin-approved

### Motivación

Sustituir el registro público por código de invitación por un flujo en el que solo el admin aprueba quién entra. Detalle completo en `docs/planning/22-access-request-flow-design.md`.

### Decisiones tomadas

- Se elimina `/register`, el formulario de registro, las server actions de signup y la tabla `registration_codes`.
- Cualquiera puede intentar iniciar sesión. Si su email no está vinculado, se le redirige a un formulario de solicitud de acceso.
- Dos tipos de solicitud: **jugador** (nombre, año de nacimiento, género) y **padre/madre** (nombre, relación, selección de hijos).
- Emparejamiento automático con perfiles existentes por nombre normalizado + año de nacimiento; si hay duda, el admin elige entre candidatos.
- Los hijos deben existir como perfiles en el club para que un padre pueda vincularlos.
- La aprobación se hace desde un nuevo panel `/admin/access-requests`, con opción de aprobar/rechazar una a una o en bloque.
- La contraseña temporal compartida es `Morvedre2026!` y se almacenará en una tabla `app_settings` para poder cambiarla desde el panel sin desplegar.
- Tras aprobar, el sistema crea la cuenta auth con la contraseña temporal; el usuario debe cambiarla en el primer login.
- Google OAuth sigue funcionando: si el email no está vinculado, va al formulario de solicitud; tras aprobar, se le obliga a definir una contraseña propia.
- Las notificaciones al admin se enviarán por email vía **Resend** (100 emails/día gratis). El admin le pasa la contraseña al usuario manualmente.
- Se crea una tabla `access_requests` separada para gestionar el ciclo de vida de las solicitudes.

### Punto abierto

- Queda por confirmar si en el selector de hijos deben aparecer todos los perfiles de jugador dados de alta o solo los que ya han cambiado la contraseña ("activados"). Esto afecta directamente a menores sin email propio.

### Resolución del punto abierto (misma sesión)

- Todo jugador con cuenta en la app debe tener email propio y activarla. Si es menor y no tiene email, la familia debe crearle uno o usar el de un padre.
- El selector de hijos mostrará **solo jugadores activados**.
- Se avisará claramente en el formulario de padre de esta condición.

## 2026-07-08 - Fase 6 Tesoreria

- Se implementa Tesoreria como modulo propio:
  - `/admin/treasury` para conceptos, asignaciones y generacion de cierres.
  - `/admin/treasury/closures/[id]` para revisar lineas, marcar pagos y descargar Excel.
  - `/treasury` para que jugador/familia vea importes pendientes.
- Se anade `treasury_profile_concepts` aunque no aparecia literalmente en el roadmap. Es necesaria para modelar cuotas/descuentos por persona sin duplicar conceptos.
- Los pedidos de tienda aprobados o en curso se incorporan automaticamente al cierre del periodo por `requested_at`.
- El cierre se puede regenerar por temporada + periodo mientras se trabaja en borrador: se reemplazan sus lineas y se recalcula el total.
- Export Excel protegido por admin en `/api/treasury/closures/[id]/export`.

## 2026-07-09 - Fase 7 Logistica de coches

- Se implementa la logistica de coches por partido visitante en `/matches/[id]/travel`.
- Un conductor puede ofrecer plazas y un jugador puede reservar asiento desde su perfil activo.
- El staff del partido puede configurar punto de encuentro, activar/desactivar logistica y ajustar compensacion.
- La reserva usa `reserve_travel_seat` con bloqueo de fila y triggers defensivos para evitar sobreventa aunque alguien intente escribir por API directa.
- La compensacion se modela como importe fijo por coche en centimos (`travel_compensation_cents`), no como calculo automatico por kilometros, porque el club decide la cifra por desplazamiento.
- Documentado el cierre en `23-phase-7-summary.md`.

## 2026-07-09 - Aplicación del design system (UI/UX Pro Max + identidad propia)

- Se instala la skill **UI/UX Pro Max** (`ui-ux-pro-max-cli`) para obtener recomendaciones de estilo. Tras analizar el proyecto, se rechaza la propuesta genérica de la skill (`Vibrant & Block-based` en rojo, orientada a fan engagement) porque no encaja con una app de gestión interna de un club de waterpolo cuya marca es azul.
- Se adopta como base técnica el estilo **Flat Design Mobile (Touch-First)** de la skill, adaptado a la identidad visual evolucionada del proyecto: **"marcador de piscina en el bolsillo"**.
- Cambios aplicados en todo el código:
  - Tokens CSS alineados con `18-visual-identity-v2.md` (`--pool-deep: #062048`, `--pool-blue: #1657A8`, `--pool-teal: #0E8C8E`, `--pool-foam: #E2EFF4`, radios `--r-md: 10px`, `--r-lg: 16px`, `--r-xl: 24px`, sombras sutiles con `var(--ink-300)`).
  - `@theme inline` actualizado para registrar todos los tokens, sombras y radios en Tailwind v4.
  - Componentes base normalizados: `Button` (font-semibold, rounded-[var(--r-sm)], focus ring `pool-blue`), `Card` (rounded-md = 10px), `Alert` (info con `pool-teal/10`), `Input`/`Select`/`Sheet`.
  - Reemplazo masivo de `brand-*` por `pool-*` / `ball-gold` en toda la app; los alias `brand-*` se mantienen solo en `globals.css` para compatibilidad.
  - `tailwind.config.ts` ya no expone colores `brand.*`.
  - `PoolScoreboard` se integra en `/matches/[id]` y `/admin/matches/[id]` como hero del partido.
  - `RsvpButtons` reescrito con el componente `Button` (`gold`/`success` para confirmar, `danger`/`secondary` para declinar).
  - Sombras grandes de Tailwind (`shadow-lg`, `shadow-xl`, `shadow-2xl`) reemplazadas por `shadow-elev-*`; `rounded-2xl` en cards reducido a `rounded-lg`.
- Build de producción y tests locales pasan tras los cambios.
- Se hizo commit+push de seguridad (`f4ec428`) antes de aplicar el design system.

## 2026-07-11 - Fase 8 Históricos y leyendas

- La transición de temporada es manual desde `/admin/seasons`; no se programa un cierre automático. El formulario propone las fechas del año siguiente y exige escribir exactamente la etiqueta de la temporada que se cierra.
- `archive_season` se ejecuta como una única transacción, usa un bloqueo transaccional para impedir dos cierres simultáneos y solo acepta la temporada actual. Se bloquea si quedan partidos pendientes, resultados incompletos o actas sin validar.
- Los históricos son append-only para usuarios autenticados. Solo la función transaccional puede escribirlos. Se guardan también `trainings_attended` y `trainings_total` para calcular la asistencia histórica ponderada correctamente, sin promediar porcentajes de temporadas con distinto número de sesiones.
- La nueva temporada clona equipos, staff y roles con ámbito de equipo. Las plantillas competitivas solo trasladan automáticamente a quien siga perteneciendo a la categoría derivada para el año de inicio; Escuela conserva su plantilla. Las excepciones y ascensos se reasignan manualmente después. La categoría actual sigue sin almacenarse en `profiles`.
- La página `/legends` suma temporadas archivadas y la temporada actual en curso. Las rivalidades agrupan nombres normalizados y requieren al menos dos partidos para aparecer como mejor cruce o bestia negra.
- `audit_log` registra de forma automática cambios en perfiles, roles, temporadas y cierres de tesorería, además de un evento resumen específico del archivado de temporada. Solo los administradores pueden leerlo y ningún usuario puede editarlo.

## 2026-07-12 - Auditoría integral de seguridad y deuda técnica

- Las credenciales de activación dejan de ser compartidas: se genera una contraseña aleatoria distinta por cuenta, se muestra una sola vez al admin y nunca se guarda en tablas de aplicación.
- Las solicitudes públicas solo admiten los roles jugador y padre/madre. Los roles internos los asigna un admin, y la búsqueda de menores exige nombre completo exacto y año de nacimiento.
- Se revocan mutaciones directas desde la Data API sobre perfiles, solicitudes de acceso y pedidos de tienda. Todas pasan por Server Actions con Zod y comprobaciones de autorización.
- Los campos privados de perfiles se retiran de los permisos de columna del rol `authenticated`. Los flujos legítimos de administración y perfil los leen mediante servicio después de autenticar y acotar el sujeto.
- El token de calendario y el resto de datos privados se tratan como secretos; el feed valida límites y escapa contenido para impedir inyección ICS.
- El service worker deja de guardar navegaciones autenticadas. Solo conserva recursos estáticos, evitando que datos de una sesión queden visibles a otra persona en el mismo dispositivo.
- Se recupera la renovación de sesión SSR en el proxy y se añaden cabeceras HTTP defensivas globales.
- Se actualizan y fijan dependencias, se sustituye la versión vulnerable de SheetJS por su distribución oficial actual y el audit de producción queda sin vulnerabilidades conocidas.
- Las subidas de imágenes e importaciones tienen límites de tamaño, formato, firma binaria y filas; los datos dinámicos de email se escapan.
- La migración de endurecimiento es `20260712171403_audit_security_hardening.sql`. El informe verificable queda en `27-security-quality-audit.md`.

## 2026-07-13 - Auditoría cloud, saneamiento de base y nuevo conjunto demo

- Se audita el esquema cloud real y se aplican las migraciones de calidad, consistencia de temporadas y privilegios de funciones documentadas en `27-security-quality-audit.md`.
- Se elimina `app_settings`, porque solo sostenía la contraseña temporal compartida ya retirada y no tenía otro consumidor.
- Los tipos TypeScript de Supabase pasan a generarse desde el esquema cloud, evitando mantener una copia manual incompleta.
- Se borran todos los datos sintéticos anteriores, conservando únicamente el usuario Auth administrador y las temporadas válidas.
- El administrador real queda representado por un único perfil de Rubén con roles `admin`, `coach` y `player`, vinculado a su cuenta de Google.
- Los seeders crean contraseñas aleatorias únicas que no se persisten ni muestran. `.seed-batch.json` pasa a ser únicamente estado local ignorado, no un artefacto versionado.
- El conjunto demo cubre equipos, familias, entrenamientos, partidos pasados y futuros, convocatorias, actas, disponibilidad, noticias, rankings, rachas, tienda, tesorería, viajes, históricos y solicitudes de acceso.
- El seeder completo termina con una validación obligatoria de cobertura y coherencia. No se generan suscripciones push falsas porque sus endpoints deben pertenecer a navegadores reales.

## 2026-07-13 - Pase de lista diario para entrenadores

- El pase de lista es una sección propia de primer nivel. Solo aparece si el perfil tiene rol `coach`, figura como entrenador principal o ayudante y un administrador ha activado `Puede pasar lista` en `/admin/staff`. Ser administrador por sí solo no concede acceso. Delegados y otros miembros del staff no la ven ni pueden abrir sus rutas.
- El permiso `manage_attendance` es global por entrenador, no por equipo: un entrenador autorizado puede pasar y corregir las listas de todas las categorías de la misma temporada para cubrir a un compañero ausente. Se guarda una sola vez en `profile_permissions`; la base impide concederlo a quien no tenga ninguna asignación como entrenador y lo retira si pierde su última asignación.
- El inicio conserva únicamente el saludo compacto y su contenido habitual; la gestión de asistencia no invade esta pantalla.
- La portada de `Asistencia` muestra los entrenamientos de la fecha elegida. El entrenador puede avanzar o retroceder por días, usar un selector de fecha y volver a cualquier sesión anterior para corregir errores.
- Cada entrenamiento abre una pantalla independiente. La lista muestra solo el nombre del jugador, sin dorsal ni información que el entrenador no necesita para reconocerlo.
- Los jugadores sin registro parten como `Presente`. Al abrir la lista se persiste automáticamente el estado completo y cada cambio posterior se vuelve a guardar sin botón de confirmación.
- El entrenador solo necesita marcar `Ausente` en las excepciones. Puede restablecer todo el grupo como presente con una única acción.
- La interfaz comunica siempre `Guardando cambios`, `Guardado automáticamente` o un error con opción de reintento.
- Los controles usan texto, icono, forma y color, con objetivos táctiles de al menos 48 px y mensajes anunciables. No existen gestos ocultos ni controles solo con iconos.
- El inicio compacto sustituye el saludo grande: “Hola, [nombre]”, rol y fecha ocupan una única franja. La cabecera de `Asistencia` también se reduce a una franja breve para dejar visibles antes los entrenamientos.
- El servidor verifica que la sesión no esté cancelada, que el entrenador tenga permiso global en esa temporada y que la lista coincida exactamente con la plantilla de esa fecha. RLS permite cubrir otro equipo de la misma temporada, pero rechaza a quien no tenga el permiso. La base también rechaza jugadores ajenos, registra al entrenador autenticado y limita los motivos de ausencia.
- Las horas de los bloques son horas locales de `Europe/Madrid`; la generación y los datos demo se normalizan para evitar desplazamientos UTC.

## 2026-07-14 - Pulido de producto y rediseño operativo

- Se abre una iteración transversal de Perfil, Tienda, Equipos, Rankings, Calendario y Partido a partir de la revisión manual del administrador.
- Perfil deja de comportarse como un segundo calendario y se centra en identidad, roles, situación deportiva y accesos de cuenta.
- Tienda se trata como catálogo bajo demanda: no se comunica stock ni número de unidades disponibles.
- Equipos se ordena siempre de categorías pequeñas a mayores. La pertenencia como jugador y la asignación como entrenador titular se comunican de forma distinta; el permiso global de apoyo entre entrenadores no altera esas marcas personales.
- Los tres primeros puestos de Rankings son tres personas ordenadas de forma determinista, aunque compartan valor. Las tarjetas incluyen contexto de partidos o entrenamientos para que la cifra sea interpretable.
- La convocatoria sugerida pondera en este orden: continuidad respecto al partido anterior, goles, edad adecuada, asistencia y disciplina.
- Las cabeceras de sección pasan a ser compactas. El movimiento se usa como respuesta y orientación, respeta reducción de movimiento y evita animaciones decorativas constantes.
- Rachas deja de depender de una pestaña secundaria: tiene acceso destacado desde Rankings y un selector visual que explica entrenos, goles, exclusiones y MVP, con comparación entre racha actual y mejor racha.
- `Absoluto` no tiene una edad máxima artificial. Cualquier jugador adulto válido se deriva como Absoluto; solo se rechazan años de nacimiento futuros.
- El acta guarda el borrador completo antes de validarlo, de modo que `Validar y cerrar` nunca bloquea datos antiguos por omitir un guardado previo.
- El alcance y los criterios verificables quedan en `29-polish-product-redesign-plan.md`.

## 2026-07-14 - Pulido operativo de perfiles, tienda y administración

- Los accesos administrativos pasan a ser capacidades acumulables: asistencia, tienda, equipos, jugadores, familias, tesorería, noticias, partidos, entrenamientos y personal. Ser miembro del staff no concede permisos por sí solo; el administrador los asigna desde Personal.
- Un perfil puede desactivarse sin eliminarse. Conserva históricos y rankings, pero deja de aparecer en plantillas activas, convocatorias, asistencia y selectores operativos.
- La foto de perfil se elige como JPEG o PNG, se encuadra y amplía en un recorte cuadrado y el servidor la normaliza. Los objetos se sirven públicamente para los avatares del club, pero el bucket no permite listar archivos.
- La tienda es bajo demanda. El carrito avisa antes de abandonarlo sin enviar, conserva productos retirados para poder eliminarlos y exige un teléfono de contacto válido al confirmar. El pedido guarda una copia del teléfono usado.
- Confirmar un pedido adulto lo deja pendiente de gestión de tienda; un pedido de menor vinculado sigue necesitando la aprobación familiar. El gestor recibe el detalle por correo y puede descargar un Excel con persona, contacto, talla y personalización.
- La cuota mensual por defecto es de 60 euros por jugador. Tesorería administra únicamente excepciones, exenciones y el responsable de cobro familiar; el cierre agrupa automáticamente hijos, tienda y ajustes en el pagador correspondiente.
- Una plantilla muestra primero a los jugadores de su categoría. Solo admite como refuerzo la categoría inmediatamente inferior y la separa visualmente; Escuela conserva su tratamiento especial.
- Las rachas de partido solo usan convocatorias efectivamente jugadas. Un acta sin fila estadística se interpreta como cero, por lo que corta la racha correspondiente. La asistencia solo usa sesiones del equipo de origen y excluye entrenamientos cancelados o futuros.
- Notificaciones es una pantalla completa separada de Noticias. Los enlaces se normalizan a rutas públicas seguras, la lectura es explícita y el icono superior ya no descarga el listado completo.
- La migración de producto es `20260714013318_product_polish_permissions_profiles.sql`; los ajustes finales de Storage y políticas son `20260714022835_polish_advisor_hardening.sql` y `20260714113000_polish_policy_performance.sql`.
- La protección de contraseñas filtradas no se puede activar en el plan gratuito de Supabase. `archive_season` continúa como `SECURITY DEFINER` ejecutable por usuarios autenticados porque valida internamente que sean administradores y necesita una transacción atómica.
- El cierre y sus verificaciones quedan documentados en `32-product-polish-iteration-2-summary.md`.

## 2026-07-14 - Cierre de UX operativa, acceso y PWA

- Las cabeceras de las secciones principales comparten un único patrón compacto: superficie clara, acento lateral, icono, título, contexto y acción adaptable. Perfil conserva una tarjeta de identidad propia porque su contenido principal es la persona, no una sección genérica.
- El aviso al salir del carrito conserva siempre los artículos y ofrece dos salidas inequívocas: volver para terminar o salir sin enviar. Las hojas inferiores reservan el área segura del dispositivo para que ninguna acción quede cortada.
- Los horarios de entrenamiento se crean por categoría y periodo mediante grupos semanales. Cada grupo reúne varios días con la misma hora y un horario puede contener varios grupos. Los periodos especiales pueden sustituir sesiones anteriores sin eliminar listas ya registradas.
- Editar un bloque regenera únicamente sus sesiones futuras no protegidas por asistencia; las sesiones pasadas y las listas existentes permanecen intactas.
- El alta de partidos se divide en enfrentamiento, fecha/competición y detalles opcionales. La temporada se deriva del equipo elegido y el lugar habitual se propone al marcar partido en casa.
- El calendario muestra el intervalo horario completo del entrenamiento, no solo inicio y duración: la hora de fin se deriva de `duration_minutes` y aparece como `HH:MM–HH:MM`.
- OAuth obtiene el origen visible del navegador y nunca usa la dirección interna `0.0.0.0`. En desarrollo acepta localhost, 127.0.0.1 y la IP privada autorizada; en producción usa el origen público configurado.
- La PWA solo se considera instalable en un contexto seguro. El build de producción genera `sw.js`, sirve un manifiesto válido con identidad estable y funciona bajo HTTPS; una prueba móvil por HTTP de red local seguirá siendo un acceso directo por limitación del navegador.
- `profiles.is_active` es un dato operativo público para miembros autenticados. Se concede lectura de esa columna para que las plantillas puedan excluir perfiles desactivados y calcular recuentos correctos, sin exponer teléfono, email ni notas privadas.

## 2026-07-14 - Leyendas centradas en el club

- `Rachas` y `Leyendas` tienen el mismo peso visual dentro de Rankings, con identidad propia y objetivos táctiles completos.
- Leyendas se limita a la historia de los jugadores del Waterpolo Morvedre: goles, partidos, MVP y asistencia.
- Se retira de la aplicación el cara a cara con otros clubes, incluidos mejores cruces, bestias negras, consultas y cálculos de rivalidades. Los rivales siguen existiendo únicamente como dato necesario de cada partido.
- Las métricas históricas se eligen desde una navegación superior visible, sin bloques secundarios apilados debajo de la clasificación.

## 2026-07-14 - Asistencia habilitada por día

- Una lista futura puede consultarse para comprobar la plantilla, pero permanece en gris y sin controles de asistencia.
- La asistencia se habilita al comenzar el día del entrenamiento en `Europe/Madrid`, sin esperar a la hora concreta. Las listas de días anteriores siguen siendo editables para corregir errores.
- La restricción se aplica en interfaz, Server Actions y base de datos para impedir que una petición directa registre asistencia futura.

## 2026-07-20 - Experiencia familiar sin cambio de perfil

- La cuenta del tutor conserva siempre su propia identidad. Los hijos vinculados dejan de funcionar como perfiles que se suplantan y se presentan juntos en un panel familiar con equipo, próximo compromiso, estadísticas y gestiones pendientes.
- El diseño familiar se optimiza para uno y dos hijos: con uno evita huecos y simplifica las acciones; con dos conserva una comparación directa y compacta. Un tercer hijo sigue siendo compatible mediante una cabecera adaptable y tarjetas verticales, sin reducir objetivos táctiles ni ocultar gestiones.
- Los nombres, la cantidad de menores y las acciones se expresan siempre con texto visible y lenguaje directo. Los accesos familiares mantienen objetivos táctiles de al menos 48 px y no dependen de iconos, gestos o cambios de perfil que puedan resultar ambiguos.
- El inicio y el calendario de un tutor agregan automáticamente la actividad de todos sus hijos. Los filtros de equipo indican a qué hijo corresponde cada categoría.
- La mayoría de edad se deriva de `birth_year` para el año en curso. Un año desconocido se trata de forma conservadora como menor en tienda y no habilita información financiera.
- Un pedido de menor exige al menos un tutor vinculado y queda en `pending_parent`. La tienda no recibe correo ni aviso hasta que un tutor lo aprueba; los pedidos de adultos pasan directamente a `pending_admin`.
- El tutor puede aprobar o rechazar desde la bandeja familiar o desde el detalle enlazado por la notificación. El menor conserva acceso al estado de su propio pedido.
- En el detalle de un partido, el tutor responde por cada hijo convocado de forma independiente. No cambia de perfil: la autorización se limita al menor vinculado tanto en Server Action como en RLS.
- Los menores no pueden leer importes de tesorería, ni siquiera consultando directamente la Data API. Los adultos ven sus importes y los tutores ven el total familiar agrupado por persona.
- Las migraciones `20260720185541_family_guardian_experience.sql`, `20260720195234_family_function_privileges.sql`, `20260720200228_family_link_integrity.sql`, `20260720203127_family_guardian_sports_management.sql` y `20260720204711_family_callup_column_integrity.sql` registran si cada pedido necesita aprobación, protegen los flujos con triggers, endurecen RLS de tesorería y gestión deportiva familiar, validan que el tutor sea adulto y el hijo menor, y limitan la respuesta familiar a estados de asistencia seguros.
- Los pedidos que aún esperan a la familia no aparecen en la cola operativa de tienda. El permiso `manage_shop` tampoco puede convertirlos en pedidos aprobados; solo un tutor adulto vinculado puede tomar esa decisión.
- El seeder `family-demo.mjs` prepara una cuenta tutora con dos hijos de categorías distintas, pedido pendiente, calendario, estadísticas y tesorería. La contraseña se aporta por entorno y nunca se guarda en el repositorio.

## 2026-07-21 - Inicio compacto y rachas legibles

- Inicio se organiza por prioridad temporal: próximo compromiso, rachas, resumen deportivo y actividad próxima. Cada concepto conserva una superficie y un título propios para que la compactación no mezcle su significado.
- `Rachas activas` conserva una tarjeta y un título propios, pero presenta sus valores como una lista clara y breve, sin números gigantes ni barras de progreso que compitan con el próximo compromiso. `Resumen deportivo` queda en una tarjeta independiente con las métricas de temporada.
- La racha no se superpone sobre la fotografía de perfil: el avatar queda limpio y completamente visible.
- Agenda y noticias usan tarjetas distintas con cabecera, icono y acceso propios; comparten únicamente una cuadrícula adaptable en pantallas amplias.
- Inicio limita el avance de agenda a tres eventos y las noticias a dos. Calendario, Noticias y Rankings conservan el detalle completo mediante accesos visibles de 48 px.
- La pantalla no introduce estado cliente ni nuevas dependencias. Los datos independientes se siguen consultando en paralelo.

## 2026-07-21 - Identificación sólida del equipo propio

- En el listado de Equipos, las tarjetas donde juegas usan una superficie azul hielo completamente opaca, borde azul y el pequeño encabezado `Tu equipo` sobre el nombre. La distinción no depende de transparencia ni de una cápsula que parezca un botón, y conserva la franja de color de la categoría.
- Los equipos donde coinciden los roles de jugador y entrenador mantienen la misma superficie sólida y combinan el borde dorado con las dos etiquetas de relación.

## 2026-07-21 - Cierre de Rankings con posición personal

- Los accesos a `Rachas` y `Leyendas` conservan su identidad cromática, pero pasan a ser una navegación horizontal compacta integrada con los filtros del ranking.
- Cada ranking muestra un acceso directo a la posición de la persona conectada. En cuentas familiares aparecen los hijos que formen parte del filtro actual.
- El acceso calcula la página con bloques reales de diez personas, incluyendo el podio dentro de la primera página, y enlaza a la fila o puesto del podio mediante un destino resaltado.

## 2026-07-21 - Limpieza final, dependencias y rendimiento

- Se retiran componentes, utilidades, capturas temporales y un service worker de desarrollo sin consumidores reales. Las entradas especiales de Next.js, Serwist, Vitest y los seeds dinámicos se conservan aunque las herramientas genéricas no puedan resolverlas.
- El dashboard inicia en paralelo las consultas independientes de actividad y estadísticas para reducir la espera acumulada sin cambiar su contrato público.
- Se elimina `@tanstack/react-table` porque no participa en ninguna pantalla. Las actualizaciones compatibles de Supabase, formularios, Zod, Tailwind y Prettier se aplican con el lockfile verificado.
- Las migraciones mayores de Node types, ESLint, TypeScript y Lucide se aplazan: requieren una iteración específica y no aportan una mejora proporcional para este cierre.
- La auditoría completa queda registrada en `35-final-codebase-cleanup-summary.md`.

## 2026-07-21 - Teléfono de tienda y terminología deportiva

- Un adulto solo introduce su teléfono en la primera solicitud si todavía no lo tiene en el perfil. El número se normaliza, se guarda de forma privada y las compras posteriores lo reutilizan; sigue siendo editable desde Perfil.
- Un menor nunca aporta el teléfono del pedido. Su solicitud queda sin contacto hasta que un tutor adulto la aprueba: se usa el teléfono guardado del tutor o se le pide una única vez y se guarda en el perfil de quien confirma.
- En toda la interfaz se usa `expulsión` o `expulsiones`. El nombre técnico histórico `exclusions` se conserva únicamente en columnas, tipos y consultas internas para no romper datos ni migraciones existentes.

## 2026-07-21 - Escala tipográfica accesible y mobile-first

- La aplicación adopta 13 px como mínimo para etiquetas y metadatos, 15 px para texto secundario y 16 px para contenido principal y formularios. Se eliminan los tamaños arbitrarios de 8 a 12 px de todas las vistas.
- Los textos pequeños conservan `Inter`; `Manrope` se limita a títulos y `JetBrains Mono` a números, marcadores, horas y códigos donde la alineación tabular aporta información.
- Las etiquetas en mayúsculas reducen el espaciado entre caracteres y usan colores con contraste suficiente. La paleta `ink` se completa en el tema para evitar estilos ausentes o heredados de forma accidental.
- La validación visual se realiza desde 320 px. Los controles que no permiten mantener la legibilidad se separan, abrevian de forma comprensible o permiten envolver el contenido sin reducir la fuente.

## 2026-07-21 - Ubicaciones navegables para piscinas

- Los bloques de entrenamiento, sus sesiones generadas y los partidos admiten un enlace HTTPS de Google Maps o de otro servicio de mapas. Se mantiene junto al nombre legible del lugar para no convertir las ubicaciones en un catálogo complejo que el club no necesita.
- El enlace del bloque se hereda automáticamente al generar o regenerar entrenamientos futuros. Cambiarlo o eliminarlo desde administración actualiza las nuevas sesiones del bloque mediante el flujo ya existente.
- Los formularios explican cómo copiar el enlace desde Google Maps y validan el protocolo tanto en cliente como en Server Action. La base de datos aplica además longitud máxima y HTTPS como defensa adicional.
- Calendario y detalle del partido muestran una tarjeta táctil de al menos 48 px con el nombre de la piscina y la acción `Ver mapa`. El enlace usa la asociación universal del móvil para abrir Google Maps, Apple Maps, el navegador u otra aplicación compatible.
- La migración `20260721010812_add_event_maps_urls.sql` añade las columnas sin modificar las políticas RLS existentes: lectura y edición mantienen exactamente los permisos deportivos de cada tabla.

## 2026-07-23 - Historial, avisos y seguimiento de asistencia

- La lista guardada por el entrenador es la única fuente de verdad. Una sesión sin lista no se interpreta como ausencia ni entra en el porcentaje.
- Cada jugador puede consultar únicamente su historial y cada tutor adulto el de sus hijos vinculados. La política RLS deja de exponer la asistencia de toda la plantilla al resto de miembros.
- El historial individual usa un calendario mensual: verde indica asistencia, rojo ausencia y azul una doble sesión con resultados distintos. Debajo se conserva el detalle exacto de fecha, hora, categoría y motivo cuando exista.
- El calendario general agrega la asistencia de las personas gestionadas por la cuenta. En una familia, el nombre del hijo continúa asociado a la categoría y una ausencia prevalece visualmente si varios hijos comparten sesión.
- Los entrenadores con `manage_attendance` disponen de un resumen semanal y mensual para todas las categorías. Muestra listas revisadas, asistencias, ausencias y porcentaje por jugador, siempre separado por equipo.
- Al registrar una ausencia, la base crea un aviso para cada tutor vinculado. Si después se corrige a presente, genera un aviso de corrección para que una notificación antigua no contradiga el historial actual.
- Cada alta o cambio conserva una traza técnica con estado anterior, estado nuevo, responsable y hora. La traza solo es legible por administradores y entrenadores autorizados; jugadores y tutores ven el estado vigente.
- La migración `20260723131531_attendance_history_and_guardian_alerts.sql` amplía las notificaciones, crea la traza, automatiza los avisos y endurece la lectura de `training_attendance`.

## 2026-07-23 - Revisión de cambios recientes

- La revisión de los tres commits anteriores confirma el flujo de teléfono familiar, los enlaces de mapas y el salto a la posición de Rankings.
- Los acompañantes de viaje quedan ligados por base de datos a la misma oferta que su reserva. Sus identificadores de reserva no pueden cambiarse mediante una actualización directa y los nombres se guardan recortados y no vacíos.
- Las funciones trigger de desplazamientos dejan de ser ejecutables por miembros y la tabla concede de forma explícita los permisos necesarios a `service_role`.
- Quitar un acompañante exige confirmación, muestra los errores de la operación y mantiene objetivos táctiles de 48 px. El alta incorpora etiqueta de campo, autocompletado seguro y no fuerza el teclado al abrirse en móvil.
- La migración correctiva es `20260723133133_harden_travel_companions.sql`.

## 2026-07-23 - Coherencia y ubicación de la asistencia

- El acceso al historial de asistencia deja de formar parte de Perfil y pasa a Calendario, junto a los días coloreados y al resto de información temporal.
- El resumen familiar muestra la asistencia del mes actual para que un tutor vea inmediatamente la diferencia entre sus hijos. El historial mensual coloca el periodo antes de sus cifras para evitar confundirlo con la temporada completa.
- Perfil, Inicio, Rankings, Leyendas y detalle de jugador conservan estadísticas de temporada, pero su denominador usa exclusivamente listas realmente guardadas. Un entrenamiento sin lista no cuenta como ausencia ni reduce el porcentaje.
- Los porcentajes visibles se redondean a números enteros; los cálculos y el orden de Rankings conservan internamente toda su precisión.
- Guardar una lista recalcula las instantáneas de todos sus jugadores en un único lote, evitando porcentajes antiguos y consultas completas repetidas por cada miembro de la plantilla.
