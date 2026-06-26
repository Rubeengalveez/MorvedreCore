# Log de decisiones

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

| Persona | Cargo auto-asignado | Roles reales | Email |
|---------|--------------------|--------------|-------|
| Rubén (usuario) | Admin total | admin, coach, player | galvillo9@gmail.com |
| 3 "deportivos" | Deportiva | controlan gestión + deportiva (no son entrenadores) | (TBD) |
| Eva | Secretaria | hace de todo (rol flexible) | (TBD) |
| Mónica | Tesorera | tesorería | (TBD) |
| Sol | "Del equipaje" | tienda y material | (TBD) |
| (no existe) | Presidente/a | — | — |

- **No hay presidente formal**: el club opera con la comisión deportiva + la trinidad Eva/Mónica/Sol.
- **Los roles son acumulativos**: los directivos son padres de jugadores (rol `parent` también).
- **El usuario quiere poder asignar/quitar roles a quien quiera**. Esto confirma el modelo polimórfico `user_roles(role, scope_team_id)`.
- **"Habrán cosas enrevesadas"**: explícitamente dice que habrá casos complejos (multi-perfil, multi-rol, multi-equipo). El modelo debe ser flexible.

### Entrenadores reales

- **Vega**: entrena Benjamín
- **Vitaliy**: head coach. Entrena Alevín, Infantil, Cadete A, Absoluto
- **Rubén** (el usuario): Cadete B, Juvenil

### Equipos esta temporada (7 + 1 especial)

| Equipo | Categoría | Entrenador |
|--------|-----------|------------|
| Benjamín | Benjamín mixto | Vega |
| Alevín | Alevín mixto | Vitaliy |
| Infantil | Infantil mixto | Vitaliy |
| Cadete A | Cadete masculino | Vitaliy |
| Cadete B | Cadete masculino | Rubén |
| Juvenil | Juvenil masculino | Rubén |
| Absoluto | Absoluto masculino | Vitaliy |
| **Escuela** | (especial) | (TBD) |

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

## 2026-06-26 — Última ronda de clarificación

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
