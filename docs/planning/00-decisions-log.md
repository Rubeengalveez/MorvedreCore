# Log de decisiones

## 2026-09-30 - MVP visible en la ficha del partido

- La tarjeta se compacta en una fila por ganador, de altura similar a la ubicación: etiqueta textual MVP con fondo azul claro y contorno oscuro, gorro, nombre adaptable y dos indicadores compactos de goles/asistencias sin cabecera adicional.
- El MVP de un partido terminado se muestra en una tarjeta independiente bajo el marcador, con contorno oscuro, nombre, gorro, goles y asistencias. En un empate de MVP se muestran todos los ganadores.
- El cierre consulta las estadísticas del partido directamente: ya no depende de que aparezcan dentro de las primeras 1.000 estadísticas de temporada. Los delegados tienen autorización para completar este cálculo al cerrar su acta.
- La lectura usa el acta terminada y el cálculo existente de goles y asistencias para recuperar la presentación de partidos antiguos cuya marca de MVP no llegó a guardarse. No se altera su resultado ni sus jugadas.
- Se limita la generación de páginas a dos trabajadores para completar las compilaciones locales sin agotar la memoria del equipo.

## 2026-09-30 - Avisos concretos de plazas en la rotación

- La falta de plazas para que todos participen se distingue de las alineaciones incompletas. El aviso identifica el equipo, los jugadores de campo o porteros pendientes, las plazas disponibles hasta el cuarto 4 y cuántos deben descansar tras jugar los tres primeros cuartos.
- La confirmación de rotación ajusta su altura al contenido, con desplazamiento interno y acciones visibles cuando hay muchos avisos.

## 2026-09-30 - Guardado y salida de la edición

- Guardar una convocatoria o los datos de un partido vuelve al destino de origen después de guardar correctamente. Los errores conservan la edición.
- «Solo este partido» es la opción principal. «Este y los próximos» tiene un estilo menos destacado y una confirmación adicional que explica el cambio de lista predeterminada y permite volver sin guardar. Los partidos ya creados no cambian.

## 2026-09-30 - Ajustes posteriores de los paneles y la rotación

- Se abordan los 15 puntos señalados por Rubén en `docs/audits/2026-09-30-acta-followup.md`. Los selectores reducidos y los gorros rivales ajustan su altura al contenido; las listas normales conservan su altura y desplazamiento.
- Los cuartos jugados se sitúan en los extremos de la tabla, con filas compactas y uniformes. La selección usa gris para los cuartos anteriores, azul para el actual elegido y una luna para descanso o no seleccionado. Se distinguen los datos desconocidos.
- La participación se abre desde la cabecera durante los cuatro primeros cuartos. Se elimina el botón redundante de inicio en el aviso previo al cuarto 4 y por completo el aviso de rotación al pasar al quinto. El cambio de portero se bloquea durante el descanso.
- La carga de convocatoria comparte el indicador visual del acta; se unifica el contorno de la ubicación, los errores guían según la selección y la confirmación de rotación dispone de más altura. No se publica.

## 2026-09-30 - Auditoría de cierre del acta

- Rubén pide revisar y corregir todo el acta y sus flujos relacionados: diseño móvil, accesibilidad, errores, sincronización sin conexión, salud del código y limpieza. Se conserva el flujo de juego que los delegados ya conocen y la separación entre selección de juego y confirmación de decisiones.
- Se verifican tamaños de 320 y 393 px, desplazamiento y foco, nombres en una línea, colores y estado del cuarto activo. Corregir incluye un selector para revisar cuartos anteriores; desde el quinto se retiran las marcas y el filtro de alineación, conservando el historial y las excepciones reglamentarias.
- La evidencia de cierre y los hallazgos se registran en `docs/audits/2026-09-30-acta-final-audit.md`. No se publica la demo.

## 2026-09-25 - Correo editable en dispositivos compartidos

- Los formularios de acceso de jugador y familiar empiezan con el correo vacío y editable, incluso si el navegador conserva una sesión anterior de Google. Así se puede solicitar otra cuenta desde el mismo móvil.
- Solo se vincula Google si el correo escrito coincide con el de una sesión verificada. Si se escribe otro correo, la solicitud sigue el flujo de contraseña provisional y la confirmación explica el método correspondiente.

## 2026-09-25 - Correo y guía visual de solicitud

- La pantalla de elección de solicitud no muestra ni transmite el correo por URL. Solo un inicio de sesión verificado con Google rellena y bloquea el correo en el formulario; con correo y contraseña se escribe allí.
- La explicación de lo que ocurre después se muestra únicamente al elegir el tipo de cuenta. La búsqueda sin resultados se presenta como error y ofrece ayuda mediante un botón de WhatsApp; la solicitud familiar separa los datos del adulto de la búsqueda de sus hijos.

## 2026-09-25 - Solicitud de acceso simplificada

- La entrada pública permite solicitar acceso solo a jugadores y familiares. El personal recibe una cuenta directamente desde Administración; quienes ya son jugadores o familiares conservan su perfil y reciben los permisos adicionales allí.
- La identificación de jugadores usa nombre y año de nacimiento. Acepta diferencias de mayúsculas, tildes, segundo nombre y segundo apellido solo cuando la coincidencia es única y pertenece a un jugador activo en la temporada actual. El equipo se obtiene del perfil, sin pedirlo al solicitante.
- La comprobación previa devuelve únicamente encontrado o no encontrado, sin nombres ni listas. Las consultas quedan limitadas por origen y requieren revisión del administrador antes de conceder acceso.
- La ayuda para entrar se abre en WhatsApp con un mensaje preparado. Las pantallas de solicitud conservan la estética del acceso y muestran una navegación de vuelta clara.

## 2026-09-15 - Criterio de MVP del partido con acta (goles + asistencias)

- Si el partido cuenta con acta en directo (`live_match_sheets`): el MVP se determina sumando **goles + asistencias**. En caso de empate a contribuciones totales, desempata quien tenga menos expulsiones.
- Si el partido no cuenta con acta oficial y se registró mediante el modo rápido de solo goles y expulsiones: se mantiene la lógica actual (máximo goleador, desempatado por menos expulsiones).
- La ficha del partido en `/matches/[id]` muestra el desglose correspondiente (`X goles · Y asistencias` cuando procede de acta en directo, o solo `X goles` en modo rápido).

## 2026-09-14 - Tiempos de nado

- Se implementa [38-swim-times-design.md](38-swim-times-design.md) para registro de 50/100 m desde Equipo, por jugador y sin salir de la plantilla, con fecha automática, corrección, intentos repetidos e historial permanente accesible desde perfiles y familia. La migración queda preparada localmente y pendiente de despliegue.
- Por indicación explícita de Rubén, el ranking de temporada muestra por defecto el tiempo actual de cada jugador por distancia, aunque sea peor que su récord; ofrece «Tiempo actual» y «Mejor tiempo». Ambos ordenan por duración ascendente y muestran una fila por jugador. El perfil compara actual y mejor con sus fechas. Registrar solo 50 m no reemplaza el último 100 m.
- Leyendas clasifica cada intento histórico: un jugador puede ocupar diez filas si tiene las diez mejores marcas. Corregir no crea un intento nuevo. Categoría histórica derivada con temporada y nacimiento, sin almacenar el cálculo.
- La piscina del club es siempre de 25 m, por lo que su longitud no se pregunta, no se muestra ni se almacena. Solo se distingue salida desde el agua o desde el poyete para no mezclar mediciones diferentes en rankings.
- La escritura exige asignación al equipo como entrenador, sin atajo de administrador o permiso modular. El guardado por jugador usa reintentos idempotentes, auditoría y permisos equivalentes en interfaz, acciones y SQL.
- Pendiente validar el recorrido con entrenador y móvil real. El diseño documenta captura, formatos, antigüedad de marcas, salida, pérdida de red, cambios simultáneos, anulación y conservación tras cambios de equipo y temporada.

## 2026-09-11 - Revisión del diseño del acta, sin implementar todavía

- Rubén rechaza el acabado actual por acumulación de bloques, poca claridad y navegación de vuelta inconsistente. Solicita únicamente análisis y planificación antes de nuevos cambios de interfaz.
- Se redacta [37-acta-design-review-and-redesign-plan.md](37-acta-design-review-and-redesign-plan.md): diagnóstico del código actual, reflexión sobre errores, composición propuesta, contrato de navegación, adaptación móvil, accesibilidad y fases con criterios de aceptación.
- Queda descartado separar porteros encima de los jugadores: todos se presentan en orden de gorro, incluidos 1 y 13. Se propone integrar sus estadísticas en la misma lista, eliminar duplicaciones y conservar un control compacto y explícito de portero en juego.
- Los requisitos funcionales del plan 36 se mantienen. Sus comprobaciones históricas no acreditan el diseño posterior ni la aceptación del usuario. Las capturas disponibles son anteriores a la versión revisada y el servidor local estaba apagado durante este análisis; las nuevas mediciones visuales quedan pendientes.
- No se modifica código ni base de datos en esta revisión. La ejecución del nuevo diseño queda pendiente de orden del usuario.

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
- **Convocatorias**: 14 jugadores como máximo y por defecto en la propuesta (configurable vía parámetro `max` en `suggestCallup`). Validado con el funcionamiento real del club y protegido también en base de datos.
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
- **Migraci�n 0019 duplicada**: 019_profiles_pii_restrict.sql renombrada a 021_profiles_pii_restrict.sql (ya exist�a 019_match_callups_rsvp_protect.sql).
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

## 2026-07-24 - Perfil operativo y Rachas como sección principal

- Perfil deja de repetir el resumen deportivo, calendario, rankings y próximos compromisos de Inicio. Su responsabilidad pasa a ser identidad, datos de contacto, familia, funciones dentro del club y ajustes de cuenta.
- Las herramientas se muestran según la función real de la temporada. Un entrenador que no pertenece a una plantilla no ve estadísticas ni accesos de jugador; una persona que combina ambos papeles conserva los dos espacios claramente separados.
- Foto, teléfono y número de gorro preferido forman el indicador de preparación de un jugador. En perfiles no jugadores se limita a foto y teléfono. Cada dato enlaza directamente con su sección de edición y ninguno se publica.
- El panel familiar de Perfil deja de duplicar estadísticas y agenda. Presenta a todos los hijos sin cambio de perfil y ofrece accesos directos a su asistencia, ficha, pedidos pendientes y cuota familiar.
- Rankings adopta tres secciones hermanas y compactas: `Ranking`, `Rachas` y `Leyendas`. Cada una conserva su propia URL para que los filtros, el botón Atrás y los enlaces compartidos sean predecibles.
- Rachas dispone de una pantalla propia con reto seleccionado, racha actual o récord, progreso personal o de los hijos, posición directa y clasificación completa por club o categoría.
- Las rachas de expulsiones siguen disponibles como dato técnico para detectar tendencias, pero se excluyen de la experiencia motivacional y de Inicio: la aplicación no premia ni convierte una conducta disciplinaria negativa en un reto infantil.
- Los cambios de selección usan respuestas visuales de 150-300 ms, propiedades de composición y alternativas para `prefers-reduced-motion`. La interfaz se valida desde 320 px sin reducir el texto principal ni truncar los nombres de las secciones.

## 2026-07-24 - Pulido transversal accesible y reactivo

- `Tu espacio` usa superficies blancas, bordes definidos, iconos oscuros y texto secundario de alto contraste. La jerarquía no depende de fondos grises tenues.
- Las clasificaciones muestran siempre la categoría derivada por edad y su color canónico. El equipo A/B se conserva para los filtros, pero no sustituye la categoría del jugador ni genera etiquetas y colores contradictorios.
- Las rutas principales usan transiciones nativas breves de entrada y salida. La barra superior y la navegación inferior permanecen estables, y `prefers-reduced-motion` elimina el movimiento.
- Las reacciones de noticias responden de forma optimista, y los filtros de Rankings comunican su estado pendiente y evitan pulsaciones duplicadas.
- Notificaciones muestra veinte avisos por página, conserva el filtro en la URL y solo carga el contexto visual de los avisos visibles. Las listas largas de notificaciones y productos aplazan el render fuera de pantalla.
- Se eliminan los últimos tamaños arbitrarios de 10 y 11 px en Calendario y navegación. El mínimo visual vuelve a ser el token de 13 px definido para móvil.

## 2026-07-28 - Pase de lista compartido entre entrenadores

- Cualquier entrenador principal o asistente activo puede pasar y corregir listas de cualquier categoría de la misma temporada. Ya no necesita que un administrador active `manage_attendance`.
- La asignación deportiva sigue comprobándose en `team_staff` y en el rol `coach` del equipo de origen. Ser administrador, delegado u otro miembro del staff no concede por sí solo acceso a la asistencia.
- El recálculo de rachas posterior al guardado usa la misma autorización global de asistencia para evitar que una lista válida falle al pertenecer a la categoría de otro entrenador.
- La migración `20260727222316_allow_all_coaches_manage_attendance.sql` alinea la función RLS `can_manage_attendance_for` con esta regla.

## 2026-07-28 - Panel deportivo para entrenadores

- Un entrenador asignado puede entrar en `/admin` aunque no tenga permisos administrativos modulares. Su centro de mando muestra `Entrenamientos` y `Partidos`, que son las áreas protegidas por `requireCoachOf`.
- Las listas, formularios y detalles de esas áreas se limitan a los equipos donde figura como entrenador. Un permiso administrativo explícito conserva el acceso global a su módulo.
- `Temporadas`, `Equipos`, `Jugadores`, `Familias`, `Personal`, `Tesorería`, `Noticias` y `Tienda` siguen ocultos y bloqueados salvo que la persona reciba el permiso administrativo correspondiente.
- La migración `20260727223405_allow_coaches_manage_training_blocks.sql` permite que la RLS de los bloques de entrenamiento aplique la misma regla por equipo que las sesiones y los partidos.
- La migración `20260727223823_scope_training_block_coach_access.sql` añade una comprobación estricta para los bloques de entrenamiento que solo acepta roles `coach` ligados al equipo. Los roles globales heredados se conservan, pero no intervienen en este acceso.

## 2026-09-04 - Fase 9 Polish, Accesibilidad y Offline

- Se consolida la estrategia offline segura: el Service Worker precachea los recursos estáticos y sirve la página `/offline` como fallback ante la pérdida de conexión. Se mantiene la exclusión de cachear respuestas HTML y datos autenticados en disco para evitar fugas de información privada en dispositivos familiares compartidos.
- La página `/offline` comunica claramente los motivos de seguridad en segunda persona, ofrece reintento manual y detecta en tiempo real la recuperación de red (`window.addEventListener('online')`), recargando suavemente.
- Se implementa `ConnectivityBanner` en el Shell de la aplicación: un aviso flotante y accesible (`role="status"`, `aria-live="polite"`) que informa del modo solo lectura al perder conexión y comunica el restablecimiento antes de auto-ocultarse.
- Se mejora el instalador PWA (`PwaInstallPrompt`): soporte para el evento estándar `beforeinstallprompt` en Android y una guía modal accesible con pasos claros para iPhone/iPad (Safari), evitando alertas bloqueantes de navegador.
- En accesibilidad (WCAG AA), se incorpora la regla global de `:focus-visible` con anillo azul nítido (`var(--pool-blue)`) y desplazamiento para navegación cómoda por teclado. La variante de botón `sm` se amplía a 48 px (`min-h-12`) asegurando objetivos táctiles adecuados en toda la interfaz móvil. Se mantiene el tema diurno de alto contraste de piscina sin dispersar esfuerzos en un modo oscuro secundario.
- Se preserva el castellano como idioma único de la aplicación, evitando dependencias superfluas de i18n.
- Se integran los error boundaries de Next.js (`app/error.tsx` y `app/global-error.tsx`) con un logger estructurado (`lib/monitoring/error-logger.ts`) que sanitiza credenciales. Un servicio externo de alertas queda fuera mientras el club no elija proveedor y responsable operativo.
- `scripts/backup-db.mjs` realiza copias completas de las 30 tablas, incorpora SHA-256, verifica el objeto remoto después de subirlo y aplica una retención de 90 días. El destino es un bucket privado sin políticas cliente; GitHub ya no conserva artefactos JSON con datos personales.

## 2026-09-04 - Unificación del Sistema de Diseño, Accesibilidad Táctil y Auditoría de Integridad (Post-Demo)

- **Auditoría de rutas y enlaces**: Next.js `typedRoutes` y la auditoría exhaustiva confirmaron que todas las rutas estáticas y dinámicas tienen destinos válidos. No existen enlaces muertos (`href="#"`), rutas huérfanas ni botones sin manejador.
- **Limpieza de skills**: Se evaluaron las capacidades de `.agents/skills`, retirando skills obsoletas de descubrimiento de producto y conservando las 15 herramientas especializadas de desarrollo frontend, React, Next.js, Supabase, accesibilidad y diseño visual.
- **Sistema de diseño unificado**:
  - Creación de `Card` (`components/ui/card.tsx`) con soporte para variantes (`default`, `interactive`, `accented`, `lane`, `sunken`), franja cromática del equipo/categoría (`accentColor`) y delegación segura con Radix `Slot` cuando `asChild=true`.
  - Creación de `StatusBadge` (`components/ui/badge.tsx`) con 7 variantes de contraste asegurado (`success`, `warning`, `danger`, `info`, `neutral`, `brand`, `gold`), punto de estado opcional e iconos integrados.
  - Extensión de `Button` (`components/ui/button.tsx`) con tamaño `icon` y variante `outline`, garantizando objetivos táctiles conformes a WCAG ≥ 48×48 px (`min-h-12`).
- **Refactorización transversal**:
  - _Dashboard_: Unificación de tarjetas de resumen, rachas activas, panel familiar y accesos de gestión.
  - _Equipos_: Eliminación de dobles `<h1>` en estados vacíos, corrección de jerarquía accesible y migración a `Card`.
  - _Calendario_: Modernización de `CalendarEventCard` con franja lateral cromática de equipo, badges semánticos de tipo de competición y estado de asistencia.
  - _Tienda_: Tarjetas de producto, atajos y estados vacíos alineados con el sistema de diseño. En el panel de pedidos (Kanban), los estados del pedido usan `StatusBadge` y botones táctiles.
  - _Notificaciones_: Buzón con tarjetas semánticas, acento cromático según el tipo de aviso, y botones de filtrado y paginación con altura mínima de 48 px.
  - _Administración deportiva y noticias_: Normalización de tarjetas de bloques de entrenamiento, listado de partidos y avisos informativos.
- **Inclusión tecnológica**: Se redactaron 5 guías operativas en lenguaje directo y paso a paso en `docs/guides/` para garantizar la usabilidad en personas con cualquier nivel tecnológico (`guia-familias.md`, `guia-entrenadores.md`, `guia-tesoreria.md`, `guia-tienda.md`, `guia-administracion.md`).
- **Verificación total de calidad**: 0 errores en TypeScript strict (`tsc --noEmit`), 0 warnings en ESLint (`pnpm run lint`), 72 suites y 624 tests unitarios e integrados aprobados en Vitest (`pnpm run test:run`) y build de producción Next.js (`pnpm run build`) completado con éxito.

## 2026-09-04 - Cierre técnico posterior a la auditoría

> Actualización del 5 de septiembre: las afirmaciones de cierre de este apartado no acreditan la operación completa. El estado vigente y sus límites se recogen en `docs/audits/2026-09-04-operational-status.md`.

- El roadmap vuelve a reflejar el estado real: las fases 0 a 9 están construidas y la fase 10 conserva únicamente el alta real, el onboarding presencial, el material de despliegue y la activación de la temporada que debe aprobar el club.
- Se elimina definitivamente la referencia a Cluber. El importador acepta hojas Excel del origen que utilice el club.
- Las migraciones de permisos de delegados, reemplazo atómico de horarios, bucket privado de backups y consolidación de la política de actas están aplicadas en Supabase cloud.
- La política de `match_stats` vuelve a ser única y bloquea la edición de estadísticas validadas para cualquier persona que no sea administradora.
- Los destinos de notificaciones push solo admiten rutas internas; URLs absolutas, esquemas y destinos externos vuelven al buzón de notificaciones.
- Los formularios de tesorería mantienen etiquetas visibles y los controles interactivos transversales respetan un objetivo táctil mínimo de 48 × 48 px.
- El recorrido autenticado de producción cubre 45 rutas en móvil y escritorio. Comprueba estado HTTP, errores de consola, un único `h1`, overflow horizontal, nombre accesible y tamaño táctil.
- La protección de contraseñas filtradas de Supabase no se activa porque requiere el plan Pro y el proyecto mantiene el objetivo de coste cero. Se conservan la longitud mínima, las contraseñas temporales con cambio obligatorio y el restablecimiento seguro por email.

## 2026-09-05 - Exportación completa del esquema público y evidencia de cierre

- Se corrige un fallo adicional del exportador: la consulta única podía truncar tablas grandes. Ahora pagina por clave primaria, comprueba recuentos exactos y cubre las 41 tablas públicas contrastadas con el esquema remoto.
- El formato v1.2 exige manifiesto completo, claves, recuentos y checksum. Las copias anteriores se conservan pero no acreditan cobertura actual. Siete pruebas sintéticas cubren paginación y corrupción sin exportar datos personales.
- El JSON no contiene Auth, archivos ni esquemas privados, y no es una instantánea transaccional. La recuperación integral permanece pendiente; se añade `docs/guides/recuperacion-datos.md` y se corrigen el roadmap, la guía de administración y el estado operativo.
- La ejecución real de exportación y retención permanece pendiente de aprobación tras el rechazo de la revisión automática de permisos. No se ha repetido por otra vía.
- La desactivación push comprueba el resultado del servidor y del navegador. La prueba de envío trata los errores de red y anuncia el resultado de forma accesible; cuatro regresiones verifican esos casos.
- El informe automático de pantallas conserva todas las observaciones, separa el modo focalizado y devuelve error si encuentra problemas.
- Se corrigen las fechas propuestas de cierre: el mes se determina en Europe/Madrid y sus límites se generan como fechas de calendario, sin conversión de medianoche local a UTC. Cuatro pruebas cubren cambio de mes y año, febrero bisiesto y horario de verano.
- Las guías se contrastan con las pantallas: ruta real de importación y columnas admitidas, guardado automático de asistencia, etiquetas de convocatoria, validación de actas y envío separado del cierre.
- Se reabre el cierre técnico de tesorería por un hallazgo P1: regeneración no atómica de líneas, posible pérdida de marcas de pago y lecturas con errores no comprobados. Debe resolverse antes de generar de nuevo periodos reales.
- El mismo hallazgo se corrige con `atomic_save_treasury_closure`, accesible solo a `service_role`: reemplazo transaccional con bloqueo, sin regenerar cierres enviados/archivados ni con pagos. Se comprueban todas las lecturas y se trata la desaparición de una línea al marcarla. El ensayo SQL remoto con fixtures revertidos y nueve pruebas de acciones pasan; la suite completa queda en 641 pruebas correctas y 22 omitidas.
- Los cinco archivos de migración recientes se renombran para reflejar sus versiones cloud registradas, evitando que una sincronización posterior intente aplicarlos otra vez.
- Seguimiento: la generación de cierre pagina conceptos, asignaciones, perfiles, plantillas, pedidos y cuotas individuales con recuento exacto. El detalle y la exportación paginan también sus líneas; cualquier fallo impide devolver una lectura parcial. La plantilla se filtra por la temporada del cierre y los pedidos usan los límites del periodo en Europe/Madrid. Treinta pruebas focalizadas cubren estas lecturas y las transiciones horarias; las relaciones y filtros se verifican contra PostgREST sin modificar datos.
- El estado push deja de depender solo de la existencia de una suscripción en el navegador: se comprueba su habilitación para la cuenta autenticada, con consulta RLS y filtro de propietario. Activar renueva suscripciones inactivas y compensa un guardado fallido cancelando la nueva suscripción local. Quince pruebas verifican los estados y errores; la entrega física y el ciclo de cierre de sesión continúan pendientes de validación específica.
- El cierre de sesión pasa a alcance local: salir en un dispositivo no revoca las sesiones de los demás. Antes se retiran la suscripción local y las notificaciones visibles; el servidor filtra la desactivación por propietario y endpoint, y no muestra éxito si Auth falla. Once pruebas unitarias y un ensayo de producción con dos sesiones aisladas verifican la salida, la pérdida de acceso y el aislamiento entre sesiones. Se añade `pnpm audit:logout` como ensayo manual reproducible; requiere la cuenta de demo y crea/cierra únicamente sus sesiones temporales.
- Se actualiza el estado de `AGENTS.md`, que aún anunciaba Fase 9 como trabajo futuro y mantenía una referencia contradictoria a reemplazar Cluber. Sus convenciones de desarrollo se conservan; remite al estado operativo fechado como fuente de evidencias y pendientes.
- Coherencia de permisos deportivos: las capacidades compartidas distinguen programación de partidos de convocatoria/acta. Un entrenador necesita asignación explícita al equipo; los roles globales heredados no equivalen a acceso a todos los equipos. Los delegados pueden gestionar convocatoria, dorsales y resultado, no crear, eliminar ni reprogramar partidos. Los permisos modulares `manage_trainings` y `manage_matches` habilitan su módulo; no se convierten en rol de entrenador para otros módulos. La navegación y los filtros usan la misma derivación; las acciones comprueban también origen y destino al cambiar de equipo. Se conserva la regla específica de asistencia por temporada.
- La migración `20260905194256_align_sports_capabilities.sql` está preparada pero NO aplicada en cloud: la revisión automática bloqueó el cambio de RLS y triggers por su alcance. Se ha solicitado autorización explícita y se continúa la validación local aislada. No publicar esta corrección como cerrada hasta ejecutar la migración autorizada y sus regresiones de SQL.

## 2026-09-07 - Acta en directo y simplificación para delegados

- Se mantienen el registro sencillo de totales y el acta completa. El acta usa eventos por cuarto, sin reloj, con marcador global prioritario y parciales secundarios. Penalti cometido equivale a una expulsión; dos se destacan en amarillo y tres o roja indican fuera. Entrenadores tienen tiempos muertos y tarjetas, sin límites automáticos de tiempos.
- La revisión del usuario descarta una pantalla larga y complicada. El diseño concentra marcador arriba, celdas de ambos equipos en paralelo y botones accesibles abajo. Terminar cuarto es una acción visible con confirmación y marcador; anotar abre un panel guiado. No se superponen avisos sobre las celdas. Con texto ampliado se reorganizan las columnas.
- Excepción offline explícita: el acta preparada guarda su documento privado en IndexedDB. Se guarda antes de confirmar y se sincroniza mediante Server Action validada, con revisiones e identificadores idempotentes. El resto de respuestas autenticadas continúa fuera de la caché del service worker. Un dispositivo escribe; el cierre de sesión no elimina jugadas pendientes.
- Las migraciones `20260907154016_live_match_sheets.sql` y `20260907155246_live_match_source_guards.sql` están aplicadas. RLS limita la lectura; la escritura transaccional exige actor autorizado y protege marcador y estadísticas derivados. La tabla se incluye en el respaldo.
- PDF mediante jsPDF; compartir requiere una acción del usuario y usa el menú nativo o descarga. Pretext se utiliza únicamente como dependencia de desarrollo para medir texto en la prueba de interfaz. Guía de uso: `docs/guides/acta-en-directo.md`.

## 2026-09-06 - Descarga de cierres y permiso de tesorería

- El endpoint de Excel se alinea con el permiso modular `manage_treasury` de la sección. Se mantiene la lectura autenticada con RLS, sin usar `service_role` para descargar; valida identificadores y no sirve un adjunto parcial si falla su preparación.
- El botón conserva al usuario en la pantalla cuando hay un error, informa del progreso y admite reintento. Un HTML de login no se guarda como Excel; la petición se cancela al salir y el archivo temporal en memoria se libera.
- Se añade regresión SQL reversible con datos sintéticos para gestor modular, revocación y acceso familiar. Pasó contra las políticas existentes sin alterar permisos persistentes ni exportar datos del club. Las pruebas de ruta e interfaz, TypeScript y ESLint pasan; la migración de permisos deportivos sigue pendiente de validación y autorización.

## 2026-09-08 - Entrada del delegado y convocatoria existente

- Por petición del usuario, el acta en directo queda reservada a delegados asignados al equipo, tanto en enlaces como en Server Actions y RLS. Ni administrador, entrenador ni permiso modular sustituyen esa asignación. El resto de estadísticas públicas del partido se conserva.
- El partido muestra un bloque visible con los dos modos. El registro sencillo se abre en `/matches/[id]/registro`, sin trasladar al delegado a administración.
- Se reproduce el error de convocatoria existente con gorros duplicados. Antes cualquier fallo de esquema mostraba un mensaje genérico de preparar convocatoria; ahora se presenta la lista para corregir gorros en la misma entrada, con guardado transaccional y comprobación de permisos y roster.
- Carga y error tienen una pantalla visual accesible, reintento y vuelta al partido de origen. Se elimina el enlace erróneo a `/admin/matches`.
- Migración `20260908120517_live_match_delegate_entry.sql` aplicada tras ensayo transaccional con fixtures y rollback. Los triggers de totales conservan su protección aunque el acta quede oculta por RLS a otros gestores.

- Ampliación pedida por el usuario: impedir duplicados desde su origen. Los selectores de gorro deshabilitan números ocupados por convocados activos; un trigger serializa escrituras por partido y rechaza inserciones, cambios y reactivaciones que repetirían gorro. Los datos antiguos no se renumeran automáticamente. Preparar gorros admite intercambios atómicos sin dejar números temporalmente duplicados.
- Se corrige además la validación de `updateCallup`: la convocatoria tiene clave compuesta partido/jugador, no un UUID concatenado. El error impedía editar sus datos aunque ambos identificadores fueran válidos. El resultado estructurado conserva mensajes útiles en producción.

## 2026-09-08 - Plan del acta tras la prueba con un delegado

- La prueba con el padre de Rubén valida el recorrido principal como fácil e intuitivo. Se conservará la selección equipo → jugador → acción, mejorando visibilidad, legibilidad y acabado.
- Se redacta [36-acta-live-feedback-plan.md](36-acta-live-feedback-plan.md), con los requisitos ACT-01 a ACT-13: relevo, asistencias, portería, tiempos pedidos, tiros simplificados, penalti rival y prevención de duplicados, corrección accesible, colores de sanción, convocatoria máxima de 14 y PDF horizontal/vertical.
- El máximo de Morvedre pasa a ser un requisito de 14 convocados activos; el rival tendrá 14 por defecto y cantidad ajustable.
- El plan distingue métricas calculables de las que el registro simplificado no permite conocer, conserva la compatibilidad de actas históricas y define pruebas de integridad, offline, dos dispositivos, accesibilidad y PDF.
- El arreglo anterior del error 500 de la propuesta de convocatoria queda aparcado como asunto separado; no se da por terminado dentro del trabajo del acta.

## 2026-09-09 - Ejecución del rediseño del acta tras la prueba familiar

- Rubén autoriza ejecutar el plan 36. El documento del acta evoluciona a versión 2, manteniendo lectura de la versión 1 y evitando que un cliente antiguo sustituya silenciosamente datos nuevos.
- El relevo usa UUID seguro compatible y conserva un intento idempotente antes de enviarlo. Una respuesta perdida se recupera sin repetir el cambio de propietario ni perder pendientes locales.
- Se añaden asistencias, tiro a córner y el flujo de penalti rival. Gol normal y en superioridad se guardan antes de preguntar la asistencia. La sanción rival se guarda antes de elegir lanzador y resultado. Los posibles goles de penalti duplicados se confirman en ambos órdenes.
- Portería se muestra en un bloque propio con paradas, encajados y sanciones. El portero activo tiene un control directo y un gol rival no puede guardarse sin portero válido. Los tiempos se rotulan siempre como pedidos y las tarjetas del entrenador comparten ese acceso visible.
- La corrección pasa a ser una acción permanente con controles grandes y confirmación de anulación. El riesgo por sanciones colorea toda la fila y conserva cifra y texto para no depender del color.
- La convocatoria propia queda limitada a 14 en dominio, acciones y trigger transaccional. Un acta histórica más grande conserva lectura. El rival parte de 14 y permite ajustar cantidad y números.
- El PDF usa primera página horizontal y páginas verticales para análisis y secuencia por cuartos. Solo publica porcentajes deducibles de los eventos registrados; no inventa minutos ni tiros entre palos.
- Las pruebas locales específicas, TypeScript, renderizado del PDF y auditoría responsive pasan. La migración `20260908182336_enforce_fourteen_player_callups.sql` está preparada pero no aplicada en cloud: la revisión automática rechazó `supabase db push --dry-run` al alcanzarse el límite de uso de Codex. Quedan pendientes el ensayo remoto y una nueva prueba sin ayuda con delegados reales.

## 2026-09-11 - Remediación visual y de usabilidad del acta

- Se ejecuta el plan 37 tras la autorización de Rubén. La pantalla adopta una jerarquía estable de marcador, tabla de jugadores y controles, eliminando tarjetas y resúmenes duplicados que reducían la zona útil.
- Morvedre vuelve a ordenarse por gorro del 1 al 14, con los porteros dentro de la misma lista. Sus filas muestran paradas y goles encajados; su elección se mantiene en un control compacto y visible.
- En 360 px o más se conservan ambos equipos en paralelo. A 320 px se alternan mediante un selector rotulado para que cifras y sanciones sigan siendo legibles. Una y dos expulsiones usan fondos ámbar y naranja; tres o roja usan rojo, siempre con cifra y estado textual.
- Los paneles comparten Atrás, contexto, título y Cerrar. Se elimina la navegación variable al pie de cada paso. Cerrar una continuación opcional no deshace la jugada ya registrada ni provoca que el panel se abra de nuevo.
- Tiempo muerto indica expresamente «Pedidos» y comparte la zona fija con Morvedre, Rival, Corregir y Terminar cuarto. Con poca altura se permite scroll de página; con texto al 200 % los controles pasan al flujo y a una columna.
- La misma versión pasa TypeScript, ESLint, 46 pruebas focalizadas y la auditoría completa con datos sintéticos: nueve viewports entre 320×568 y 768×1024 más paisaje, texto al 150 % y 200 %, objetivos táctiles de 48 px, offline, seis cuartos, corrección y PDF. Falta repetir la prueba sin ayuda con delegados; no se atribuye a esta versión la aceptación de una anterior.

### 2026-09-11 — Continuidad del acta y portería

- El penalti cometido por Morvedre guarda primero la sanción y permite seleccionar lanzador rival y resultado: gol, parado o fuera. Cada resultado registra un único tiro recibido para el portero activo; fuera no cuenta como parada.
- La acción de portero «Tiro rival fuera / palo» sustituye al botón directo de penalti parado; los penaltis parados siguen disponibles mediante el flujo de penalti.
- La sincronización concilia la convocatoria por identidad. Conserva el historial de jugadores retirados y adapta los gorros para evitar perder estadísticas. Migración `live_match_roster_recovery` aplicada.
- Ajustes de nombres, expulsiones, separación de controles, confirmación de anulación, contraste y ancho de panel en tablet.
- Comprobación breve: TypeScript sin errores y 45 pruebas del acta superadas. Pendiente validación visual en dispositivos reales; no se ha realizado una auditoría extensa.

## 2026-09-14 — Rediseño profesional del acta en PDF y panel de compartir

- **Panel "Compartir acta" (`live-match-client.tsx`)**:
  - Se eliminan los espacios en blanco excesivos: el panel inferior abraza su contenido de manera compacta con safe-area insets (`pb-[max(1.25rem,env(safe-area-inset-bottom))]`).
  - Se incorporan dos acciones diferenciadas con iconos dedicados: "Ver o descargar PDF" (descarga directa / apertura inmediata de blob sin intermediarios) y "Compartir por WhatsApp" (usando el menú nativo del sistema con fallback).
  - El resultado y los parciales en el panel adoptan sutiles acentos cromáticos deportivos según el desenlace (verde para victoria, ámbar para empate, rojo para derrota).
  - El texto explicativo se sintetiza para ser conciso y directo.

- **Página 1 (Horizontal A4 — Acta Oficial Federativa en `acta-pdf.ts`)**:
  - Eliminación total del espacio muerto en blanco inferior: las tablas y la sección inferior aprovechan armoniosamente toda la altura disponible de 210 mm.
  - Se corrige el error tipográfico `(LOCAL/VISITANTE)`, mostrando explícitamente `CW MORVEDRE [EQUIPO] · LOCAL/VISITANTE` y `[RIVAL] · VISITANTE/LOCAL`.
  - Se sustituye el encabezado ambiguo "Jugada" por el término reglamentario de waterpolo "Acción".
  - Se amplía el ancho de la columna de jugadores a 48 mm para evitar truncamientos en nombres compuestos (ej. Oliver Torres Domínguez).
  - Los jugadores con participación bajo palos se identifican inequívocamente con `(P)`.
  - El bloque inferior se estructura en 3 componentes federativos alineados:
    1. Marcador final destacado con badge de resultado y matriz tabular de parciales por cuarto (Morvedre vs Rival) con tiempos muertos solicitados.
    2. Tabla completa de portería con lanzamientos a puerta, paradas (con desglose de penaltis), goles encajados y % de efectividad del equipo.
    3. Resumen disciplinario federativo con desglose de faltas graves (20"), penaltis y tarjetas, junto al sello oficial del club.

- **Página 2 (Vertical A4 — Informe Técnico y Analítica Deportiva)**:
  - Eliminación estricta de métricas inventadas: se suprime la falsa estadística de "defensa en inferioridad" al no existir registro de goles rivales en exclusión propia.
  - Se incorpora la barra comparativa bicolor de exclusiones solicitada por Rubén: reparto porcentual y total de expulsiones temporales (20") entre Morvedre (azul) y Rival (naranja).
  - Se mantienen con exactitud la efectividad en superioridad numérica (+1) y la efectividad en penaltis de 5 metros a favor y en contra.
  - Rediseño integral del rendimiento individual: se sustituyen las tarjetas informales por una tabla deportiva analítica de alto nivel para jugadores activos (ordenados por impacto ofensivo), con desglose táctico de goles (Acción / +1 / Penalti), tiros, % de acierto, % de contribución goleadora del equipo, asistencias, paradas de portero y sanciones disciplinarias.
  - La leyenda del gráfico de evolución sustituye los glifos de viñeta por círculos vectoriales nativos para evitar artefactos de codificación `%Ï`.
  - Se incluye al pie de la página un cuadro institucional de convocatoria y banquillo para aquellos jugadores convocados sin lanzamientos ni sanciones registradas.

- **Página 3 (Vertical A4 — Cronología Oficial Jugada a Jugada)**:
  - Secuencia cronológica limpia y legible organizada por cuartos, con marcador parcial y acumulado en cabecera y viñetas codificadas por tipo de jugada (goles, asistencias vinculadas, exclusiones, penaltis, tarjetas y tiempos muertos).

- **Verificación**: 810 pruebas unitarias e integrales superadas en Vitest (93 suites). Renderizado e inspección visual de las páginas generado sin anomalías.

### 2026-09-14 · Rediseño del PDF del acta

El informe del club separa registro horizontal, análisis de equipos, aportación individual y cronología por partes. Paleta azul/gris con naranja para rival, gráficos vectoriales y etiquetas completas. No se presenta como acta arbitral. Los porcentajes de tiro usan solo acciones detalladas, excluyen marcadores importados y muestran sin datos cuando no hay denominador. Eficacia del portero = paradas / (paradas + goles asignados), excluyendo tiros fuera. No se calcula eficacia rival ni de superioridad sin registro completo de intentos/posesiones. La paginación conserva nombres y filas completos. La muestra reproducible usa datos ficticios: scripts/preview-acta-pdf.mjs.

### 2026-09-14 · Ajustes del acta y cuartos de portería

PDF informativo: expulsiones temporales y penaltis en columnas separadas; ambas siguen sumando para el límite de tres sanciones. Tiros rivales = goles + paradas + otros tiros recibidos de nuestra portería. Indicador 1+ = goles propios de superioridad / expulsiones rivales, excluyendo penaltis. Asistencias y goles con igual peso; orden individual por suma. Tiros a portería incluye goles, paradas, bloqueos y córner; penaltis fallados sin destino permanecen sin clasificar.

La elección de portero inicia el siguiente cuarto. keeperStints, opcional en el documento del acta, registra tramos; cambio real conserva ambas participaciones, corregir selección sustituye el último tramo y reasigna sus acciones de portería. Sin temporizadores ni deducciones de duración. Compatible con sincronización y cambios de gorro. En documentos anteriores solo se infieren cuartos con acciones registradas. No requiere nuevas tablas.

### 2026-09-15 · Lectura visual del acta y evolución gol a gol

Primera hoja: columnas estadísticas iguales, ceros atenuados como guiones, goles de 1+ adicionales al total, goles de penalti y tarjetas condicionales. Resultado final en parciales; marcador previo separado cuando existe para que las sumas cuadren. Banda de resultado y datos del partido, sin declarar victoria/derrota hasta el cierre. Gráfico escalonado de cada gol, en orden dentro del cuarto, con cierre de cuartos marcado; no representa tiempos de reloj. La aportación individual incluye toda la convocatoria. Portería comparada en filas; goleadores rivales ordenados en bloques secundarios.

### 2026-09-15 · Auditoría y planificación del panel de administración

A petición de Rubén se auditan funciones, organización, diseño y accesibilidad del panel antes de implementar su rediseño. Documento general y fichas por sección en [auditoría de administración](../audits/2026-09-15-admin/00-panel-general.md). Se distingue evidencia de código, observación local, problema reportado y propuesta pendiente de validar. La operación cotidiana debe centrarse en la temporada actual, con consulta histórica y preparación de curso separadas. Se priorizan integridad de entrenamientos/fichas, consultas fallidas, accesos a catálogo y solicitudes, ciclos completos de mantenimiento y accesibilidad. No se cambian funciones, datos ni permisos en esta fase; las nuevas propuestas no se consideran decisiones de producto cerradas.

### 2026-09-16 · Gorras de partido del 1 al 14

Las convocatorias admiten únicamente gorros del 1 al 14. Un jugador puede quedar temporalmente «Sin gorro» para facilitar intercambios; los números ocupados no se ofrecen al editar. La misma regla se aplica en la interfaz, las Server Actions, las funciones de dominio y la base de datos.

### 2026-09-23 · Pulido del acta tras la demo

- Se retira el registro manual de «solo goles y expulsiones» de las entradas, la administración y su Server Action. Las actas antiguas y sus totales se conservan para lectura.
- El delegado elige 2, 4 o 6 cuartos. Los rivales empiezan en 14 gorros y se ajustan entre 5 y 15; se elimina la revisión de números rivales.
- El tiro rápido solo ofrece fuera/palo o bloqueado. El penalti fallado se registra mediante el flujo de sanción y lanzamiento. Una sanción de penalti pendiente no se puede abandonar sin resultado; la asistencia conserva la salida explícita «Sin asistencia».
- «Entrenador» reúne tiempos muertos y tarjetas, con equipo visible en cada paso. Se admite roja de jugador rival. La corrección del último tramo de portero pasa a «Corregir»; el selector ordinario solo elige quién juega.
- La tanda muestra gorros y resultados anteriores, situación de la ronda y muerte súbita. No se impone la rotación de cinco lanzadores: la normativa infantil FNCV confirma una tanda de cinco penaltis, pero no se ha verificado una regla única aplicable a todas las categorías y torneos del club. El delegado conserva la elección del lanzador, con los que ya tiraron señalados.
- La vista de parciales usa tres columnas para seis cuartos y dos para cuatro, también en el panel de compartir tras una tanda.
- El PDF mantiene su estructura y omite la comparación de tiempos muertos cuando ninguno se ha pedido. Las tarjetas ya se muestran solo si existen.

### 2026-09-24 · Caducidad de noticias

Las noticias con fecha de caducidad desaparecen de las vistas pública y de gestión al llegar esa fecha. Una tarea horaria las elimina de la base de datos junto con sus reacciones y notificaciones vinculadas. Esto sustituye el comportamiento anterior, que solo las desfijaba y las conservaba en administración.

## 2026-09-24 — Alta y acceso vinculados a perfiles del club

- El administrador crea al jugador con nombre completo, año de nacimiento y equipo principal de la temporada actual. El jugador no puede darse de alta a sí mismo: solicita vincular el perfil existente indicando esos tres datos. Una coincidencia ambigua o ya vinculada bloquea la solicitud y se resuelve con el club.
- El familiar puede solicitar acceso aunque el hijo no tenga cuenta. Escribe el nombre completo y año de nacimiento de cada jugador; el administrador verifica el vínculo antes de aprobar. Cada persona que quiera un acceso individual necesita un correo distinto.
- Personal y directiva se crean desde el panel de personal con correo. Los roles de entrenador, delegado y directiva se asignan exclusivamente desde administración; elegir «Personal y directiva» en la solicitud no concede permisos.
- La solicitud con correo se aprueba mediante contraseña aleatoria única, visible una sola vez al administrador, que la entrega por un canal privado. El primer acceso obliga a establecer una contraseña personal.
- La solicitud iniciada con Google conserva la identidad de Google verificada. Tras la aprobación se accede con Google sin generar ni comunicar una contraseña provisional.
- Las solicitudes avisan a los administradores por notificación dentro de la app y por correo configurado. El panel de solicitudes conserva el estado aunque falle una vía de aviso.
- Las solicitudes públicas se validan en Server Actions y las tablas continúan bajo RLS. Los perfiles y los roles solo se vinculan tras aprobación administrativa.

## 2026-09-28 — Convocatoria habitual y separación de tareas del partido

La convocatoria se edita en una pantalla propia; los datos del encuentro tienen una entrada «Editar partido» independiente y el acta se abre desde la ficha del partido. Cada equipo puede guardar una convocatoria habitual que se copia automáticamente al crear sus próximos partidos. El editor ofrece además la convocatoria anterior y una propuesta automática, siempre con guardado explícito y opción de convertir el resultado en la nueva plantilla. Se retira la logística de coches al no utilizarse. Plan de implementación y límites de migración en `27-match-callup-simplification.md`.

### 2026-09-29 · Convocatoria sin respuestas de asistencia

La convocatoria del partido muestra jugadores y gorros, sin estados «pendiente de respuesta» ni botones de confirmación. Las familias comunican ausencias al entrenador por el canal del equipo. Se retira la acción de respuesta y su interfaz de ficha y calendario; los estados históricos permanecen en la base para conservar registros antiguos. El editor móvil separa la selección de la búsqueda y mantiene el guardado visible. Se corrige la cabecera comprimida de la ficha del partido.

### 2026-09-29 · Una sola convocatoria por defecto

El editor ofrece únicamente la convocatoria por defecto del equipo. Se retiran las entradas «anterior» y «automática». Guardar una edición exige elegir entre aplicarla solo al partido actual o también a los próximos partidos del equipo. La segunda opción actualiza la plantilla que se copia al crear partidos futuros; no modifica los ya creados. La confirmación de quitar gorros usa la misma lámina inferior que las demás acciones y explica que los jugadores siguen convocados.

### 2026-09-29 · Ajustes de edición tras revisión móvil

Los diálogos de convocatoria reutilizan la estructura y animación de las láminas del acta, con decisiones breves y contrastadas. Al cambiar la lista de un partido que difiere de la plantilla, se puede volver explícitamente a la convocatoria por defecto. El formulario «Editar partido» avisa al salir con cambios y ofrece guardar y volver, seguir editando o descartar. El estado del partido vuelve a compartir una única línea con la competición y la fecha.

### 2026-09-29 · Sede única del partido

El partido muestra un solo campo «Lugar» y un enlace a Maps; el campo separado «Piscina» deja de editarse y mostrarse. Los partidos de liga como local proponen Piscina Internúcleos y su ubicación en avenida Fausto Caruana s/n, Sagunto. La sede sigue siendo editable para casos excepcionales y los partidos ya guardados conservan su lugar.

### 2026-09-29 · Corrección de convocatoria durante un acta

Las jugadas del acta se asocian al ID estable del jugador; el gorro que figuraba al registrarlas se conserva como referencia. Cambiar gorros mantiene las estadísticas con cada jugador. Si un convocado era erróneo, el delegado lo reemplaza desde «Editar convocatoria» y confirma el traslado de todas sus acciones al jugador correcto; no se modela una sustitución real entre ambos. Un jugador sin acciones puede quitarse sin traslado. Los gorros 1 y 13 son siempre los porteros, independientemente del nombre. La edición se guarda primero en el móvil y se sincroniza junto con el acta al volver la conexión. La convocatoria por defecto del equipo no cambia.

### 2026-09-30 · Propuesta de participación y descanso por cuartos

Rubén solicita planificar el registro de portero y jugadores de campo de ambos equipos al empezar los cuartos 1–4 en las categorías inferiores, con indicadores discretos y funcionamiento sin conexión. Se redacta `39-youth-participation-plan.md`, pendiente de aprobación antes de implementar. Incluye rotación, excepción de portero único, sustitución infantil y descanso excepcional del quinto, cuatro expulsiones en Benjamín y la propuesta de formato para Escuela. Respaldo previo del código subido a GitHub en `codex/backup-before-youth-rotation-2026-09-30`, commit `d30f7fb85f6db70f5b17ff32e68b114a27b710b7`. Las propuestas no se consideran decisiones de implementación aprobadas.

### 2026-09-30 · Participación por cuartos aprobada

Rubén aprueba íntegramente el plan 39, incluido Benjamín y el formato Benjamín para Escuela cuando exista un partido. El acta de estas categorías registra portero y jugadores de campo de ambos equipos en los cuartos 1–4. Se añaden avisos al terminar el tercero y preparar el cuarto, confirmación de cuarta participación ordinaria y revisión de un jugador no alineado antes de atribuirle una acción. Asistentes y lanzadores se limitan a quienes juegan durante el tramo controlado. Desde el quinto desaparecen las marcas generales y se conserva únicamente el aviso de descanso infantil excepcional cuando proceda. La selección incompleta permanece como borrador local; confirmar guarda el comienzo y ambas alineaciones juntos. Los gorros 1/13 siguen siendo porteros y las referencias propias utilizan el ID del jugador. Las incidencias ayudan al delegado a consultar al entrenador/árbitro, sin impedir registrar el partido real. La migración `20260930002921_youth_participation` amplía el guardado existente sin nuevas tablas ni cambios de RLS.

### 2026-09-30 · Revisión visual de la participación juvenil

Rubén pide pulir la primera implementación. La selección de jugadores y las consultas usan el panel blanco de juego; las decisiones y confirmaciones conservan el panel con cabecera azul. «Revisar participación» se mantiene dentro de «Corregir» y deja de ocupar espacio sobre la tabla principal. La revisión usa tablas ordenadas por gorro, alternando Morvedre/Rival, y nombres adaptativos en una sola línea. Las marcas de cuartos no cambian la altura de las filas y distinguen la participación actual. Los errores de selección quedan junto al botón inferior, siempre visibles. Se retiran «Faltan jugadores: registrar incidencia» y el acceso a sustituciones por lesión; no se eliminan los datos históricos de sustituciones. El selector de acciones muestra únicamente quienes están jugando durante los cuartos controlados; las correcciones históricas siguen permitiendo revisar a todos. Se conserva la confirmación de una rotación incorrecta para registrar lo ocurrido realmente.

### 2026-09-30 · Mínimos de convocatoria y portero único automático

Rubén establece un mínimo de 8 convocados por equipo en Benjamín y Alevín, y 9 en Infantil. Siempre debe estar inscrito un portero con gorro 1 o 13. El editor y la selección rival impiden quitar un jugador cuando el resultado incumple el mínimo o elimina el último portero, y explican el motivo. Se comprueba también al guardar y al empezar el partido. La falta de gorro sigue siendo un estado temporal del editor y nunca una convocatoria guardada válida.

La excepción de descanso del único portero se calcula automáticamente por equipo, incluido Benjamín: si solo está inscrito uno de los gorros 1/13, puede jugar los cuatro primeros cuartos sin confirmar una casilla ni recibir avisos de descanso. Si hay dos porteros inscritos se mantiene la rotación. Esta decisión sustituye la activación manual anterior.

Solo en la demo, por falta de niños y para un torneo no oficial, Rubén autoriza que Morvedre Benjamín tenga 7 convocados. El rival de Benjamín en la demo sigue necesitando 8. Core mantiene el mínimo de 8 para ambos equipos. La excepción y la lista de seis categorías de la demo quedan documentadas en `docs/decisions.md` de la demo independiente.

### 2026-10-01 · Correcciones de la beta trasladadas a Core

Rubén solicita trasladar a Core las correcciones y diseños aprobados en la demo, utilizando esta solo como referencia. Respaldo previo del código y sus cambios pendientes: `8972f408d77427d16a7295eff1d2f7e59cdab48c`, referencia `codex/core-before-demo-sync-2026-10-01`. Se conservan las rutas, permisos, Server Actions y sincronización de Core; no se importa el almacenamiento de partidas de la demo ni su excepción de siete Benjamines propios.

Una expulsión definitiva bloquea los cuartos posteriores y no puede confirmarse como una excepción de descanso. La previsión de rotación distingue equipo, campo, portería, sanciones y plazas. Los borradores utilizan una revisión propia y una comprobación atómica en IndexedDB para evitar sobrescrituras entre pestañas. Los parciales conservan el mismo orden local–visitante que el marcador.

Se sustituye expresamente la decisión anterior sobre descanso excepcional en el quinto: desde el cuarto 5 no se aplican restricciones de participación ni un descanso por haber jugado los cuatro primeros. Las expulsiones definitivas siguen vigentes. El PDF no incluye un anexo de participación; conserva el relato del partido y la tanda.

Si una sanción requiere sustitución y hay candidatos, la elección y su confirmación son obligatorias. No se permite cerrar ni posponer. Si no hay candidatos, se juega con uno menos sin abrir un selector vacío. Si el expulsado era el único portero disponible, un jugador de campo puede asumir la portería. La migración `20261001125450_acta_demo_parity_emergency_keeper` permite sincronizar ese caso respaldado por alineación y sanción válidas, sin cambiar las demás comprobaciones o permisos.

La sustitución utiliza la cabecera azul de decisiones, la ficha del expulsado con fondo rojo sutil y altura adaptable. Los pasos Morvedre/Rival son botones accesibles y conservan lo seleccionado. Se actualiza la guía oficial. Detalle del traslado y pruebas: `docs/audits/2026-10-01-demo-core-parity.md`.

### 2026-10-01 · Rediseño de la gestión administrativa de partidos

Rubén pide rehacer el listado, la creación y la edición de partidos con la claridad y los componentes visuales del acta. El listado separa Por jugar, Jugados y Cancelados; conserva los filtros en la URL y regresa a ellos tras editar. Se muestran equipos competitivos de la temporada actual, conforme a la separación existente de Escuela sin partidos.

Crear un partido se divide en Equipos, Fecha y Revisar. La fecha se elige expresamente; Maps y notas son opcionales. La lámina bloquea el desplazamiento del fondo y protege los datos al cerrar. La edición comparte controles y ofrece Datos, Piscina y Notas, con guardado visible y confirmación antes de cancelar un partido. La sede introducida manualmente y la piscina histórica se conservan al modificar otros datos.

Se mantiene el backend, la autorización y las Server Actions existentes. No se modifica la demo. Revisión móvil en 393 × 852 y 412 × 915 px y evidencias en `docs/audits/2026-10-01-admin-matches-redesign.md`.

### 2026-10-01 · Filtros unificados de partidos

Tras probar el rediseño, Rubén solicita una vista inicial más limpia: todos los partidos y categorías, búsqueda y botón Filtros. Estado, equipo y competición se reúnen en un panel con selectores nativos. El botón destaca en azul oscuro y muestra cuántos filtros se aplican, incluso con el panel cerrado. Se retiran las pestañas visibles y el contador gris. La búsqueda admite fragmentos y palabras combinadas, sin distinguir tildes ni mayúsculas, en rival, categoría, competición, estado y sede. Las tarjetas muestran solo Morvedre, sin repetir categoría junto al nombre, y conservan el orden local–visitante sin rótulos visibles.

### 2026-10-01 · Tienda sencilla para Sol

La gestión de tienda se organiza en Pedidos y Productos. Sol trabaja con Pendientes y Entregados, con confirmación de entrega y posibilidad de devolver un pedido a pendientes. Los productos se separan en Publicados y Ocultos; añadir y editar usa los pasos Producto, Opciones y Revisar. Se conserva la aprobación familiar de pedidos de menores y la compatibilidad con los estados internos anteriores.

Los pedidos muestran el nombre completo y, para jugadores, la categoría derivada de su nacimiento y temporada actual, independientemente del equipo. El PDF permite todos los pendientes o una selección y excluye entregados. Se mejoran los correos y se prepara el recordatorio mensual con el mismo PDF, deduplicación y reintentos.

Rubén acuerda usar temporalmente `galvillo9@gmail.com` como destinatario de pruebas. Core sigue en local; la URL pública, destinatario definitivo y programación del envío mensual se configurarán al desplegar. El envío programado todavía no se activa. Se aplican permisos de tienda a productos ocultos, edición y galerías, y se protege la sustitución de fotos ante fallos. Detalle y verificaciones en `docs/audits/2026-10-01-admin-shop-redesign.md`.

### 2026-10-01 · Pulido de tienda tras la prueba de Rubén

Productos pasa a ser la pestaña inicial y queda a la izquierda de Pedidos. Ambos listados comparten búsqueda y filtros, con estados y contadores separados. El PDF se concentra en un botón que abre una decisión con cabecera azul: descargar todos los pendientes o elegir tarjetas completas. Las confirmaciones de tienda reutilizan la lámina azul del acta, conforme a la petición explícita de Rubén.

Se añade historial por persona/familia, reuniendo padres e hijos mediante sus vínculos, con fechas, estados, recuentos y precios originales. Los nombres de pedido se abrevian progresivamente para compartir línea con la categoría. Los productos ocultos permanecen recuperables en administración.

Solo se ofrecen Camisetas, Pantalones, Sudaderas, Bañadores y Accesorios. Las fotos se acumulan hasta ocho, admiten eliminación y orden por arrastre o flechas; la primera es portada. Las tallas se eligen expresamente entre Sin talla, Talla única o Elegir tallas. La personalización conserva el campo Nombre y añade un consejo breve al comprador. Se elimina el máximo comercial por pedido: los artículos se encargan bajo demanda.

Los correos usan las etiquetas Categoría y Correo y no adjuntan el PDF en cada pedido. El recordatorio mensual conserva el PDF y queda pendiente de activar al desplegar. Se mejora la maquetación del PDF con pedidos delimitados, artículos, contactos y totales. Detalle y pruebas: `docs/audits/2026-10-01-shop-polish-checklist.md`.

### 2026-10-01 · Sustitución por expulsión en las tres categorías inferiores

Rubén detecta en la demo que Alevín no abre el selector de sustituto de un jugador alineado y expulsado definitivamente. La condición estaba limitada a Infantil y también existía en Core. Se corrige para Benjamín, Alevín e Infantil durante los cuartos 1–4, tanto en Morvedre como en el rival, manteniendo los límites de sanción por categoría, el caso sin sustitutos y la liberación desde el quinto. Se conserva el modal obligatorio y su diseño aprobado. Regresión y evidencias en `docs/audits/2026-10-01-youth-sanction-replacement.md`.

### 2026-10-02 · Tienda pública y confirmación segura

Rubén solicita rediseñar toda la tienda pública con los componentes y la claridad de administración, orientada a familias con poca experiencia tecnológica. Se unifican Productos, Carrito y Mis pedidos; las imágenes se muestran completas y los precios tienen prioridad. Añadir al carrito no envía el pedido: se revisa el importe y se confirma expresamente en la lámina azul. El resultado permanece visible con referencia y enlace al pedido. Las decisiones familiares usan el mismo sistema.

La confirmación pasa a una operación transaccional exclusiva del servidor, con validación de precios y disponibilidad, contacto elegido para el pedido y clave de idempotencia persistida. Se conservan título, foto y precios originales para el historial. El historial reúne pedidos propios y de hijos vinculados, incluyendo aprobación pendiente y rechazados. El cierre mensual toma la fecha de aprobación y conserva compatibilidad con solicitudes antiguas sin esa fecha, evitando perder pedidos aprobados otro mes.

Se mantienen el encargo bajo demanda, la ausencia de pagos en la aplicación, RLS, aprobación de menores y separación de la demo. La revisión completa y sus límites están en `docs/audits/2026-10-02-public-shop-redesign.md`.

### 2026-10-02 · Tarjetas uniformes en el catálogo

Rubén solicita que todas las tarjetas de producto tengan el mismo tamaño. Las miniaturas del catálogo se recortan dentro de un marco cuadrado uniforme, sin que las dimensiones originales de la foto afecten a la tarjeta. La cuadrícula iguala también las alturas entre filas y conserva el título y el precio. Dentro del producto se sigue mostrando la imagen completa.

### 2026-10-02 · Detalle de producto y ayuda de Sol

Se elimina el rótulo superpuesto Ampliar: tocar la imagen o activarla con el teclado abre la foto completa. Se conserva solo el precio y se refuerza la legibilidad de los detalles. El contacto con Sol usa un botón compartido de WhatsApp verde oscuro con borde y aparece en producto, catálogo, carrito, pedidos y revisión familiar, con mensaje contextual sin envío automático.

Se corrige la animación de salida compartida: la captura anterior no conservaba su opacidad final y reaparecía bajo la pantalla de carga o la página siguiente. Se mantiene oculta hasta finalizar la transición. Evidencia y verificaciones en `docs/audits/2026-10-02-shop-detail-polish.md`.

### 2026-10-02 · Equipos con el diseño compartido de tienda y acta

Rubén solicita renovar Equipo, gestión administrativa y sus pantallas vinculadas para familias con poca experiencia tecnológica. Se adopta el sistema de cabeceras azules, superficies blancas, contornos oscuros, controles grandes y confirmaciones con la lámina azul del acta. Los directorios comparten búsqueda sin distinción de tildes y filtros agrupados. Administración separa Plantilla, Personal y Datos; la ficha pública conserva Resumen, Plantilla, Partidos y Tiempos.

Se priorizan los jugadores en la plantilla pública, se añade búsqueda y se conservan los integrantes con edades desconocidas o excepciones. La categoría se calcula con la temporada del equipo. Se mantienen Escuela y los permisos existentes. Los tiempos de nado comparten el estilo, bloquean cambios durante el guardado y conservan la identidad del reintento. No se modifica la demo ni se publica. Auditoría, correcciones funcionales y evidencias: `docs/audits/2026-10-02-teams-redesign.md`.

### 2026-10-02 · Equipos: simplificación pública y consulta deportiva

A petición de Rubén, el directorio público conserva solo Todos / Mis equipos, sin búsqueda ni filtros. Las tarjetas y cabeceras reducen el protagonismo de entrenadores y contadores. Se elimina la distinción visible de género también en la edición; el campo técnico existente se conserva para mantener compatibilidad, sin modificar los datos históricos.

Los partidos del equipo se muestran en listas plegables con ampliación de cinco en cinco y conservan el origen al volver desde una ficha. La ficha del jugador añade estadísticas derivadas de las actas finalizadas, indicando el alcance de medias y eficacia. El gorro deja de cubrir la foto. Evidencia y límites en `docs/audits/2026-10-02-teams-polish.md`.

### 2026-10-02 · Equipos: categorías visibles y personal con acceso deportivo común

Rubén solicita retirar también la búsqueda, los filtros y el distintivo de temporada del directorio administrativo. Se muestran los equipos de la temporada actual. La cabecera de cada ficha evita repetir la categoría y conserva una altura compacta. Las categorías derivadas de la edad usan sus propios colores en refuerzos, candidatos y plantilla administrativa. Añadir jugadores permite elegir un gorro entre 1 y 14, con los ocupados desactivados y la opción expresa Sin asignar. Se retiran las notas internas de la interfaz y el color se edita directamente.

Ver equipo se coloca arriba. La ficha pública conserva la pestaña administrativa de origen al cambiar sus pestañas y al consultar jugadores o partidos. Los nombres y el vs de los encuentros pendientes comparten el centro vertical.

El personal nuevo se elige solo como Entrenador o Delegado. Por petición expresa de Rubén, ambos tienen acceso deportivo a partidos, actas, horarios y tiempos de nado de sus equipos; pasar lista queda reservado al entrenador. No se conceden permisos de tienda, tesorería ni otros equipos. Asignar, cambiar o retirar personal sincroniza el rol del equipo mediante un trigger transaccional, manteniendo compatibilidad con asignaciones antiguas. La migración `20261002150000_team_official_shared_access` se aplica en Supabase y se verifica con fixtures temporales descartados mediante rollback. Esta decisión sustituye la diferencia anterior entre entrenador y delegado para gestión deportiva. Detalle y evidencias: `docs/audits/2026-10-02-teams-refinement.md`.

### 2026-10-02 · Inicio de Administración sencillo y limitado por permisos

Rubén solicita actualizar el menú de Administración al estilo de tienda, acta y equipos. Se retiran el saludo, los contadores generales y las consultas que los generaban; no hay búsqueda ni filtros. Los accesos completos tienen contorno oscuro, icono, título, descripción breve y flecha, agrupados por Gestión diaria, Personas y Organización cuando hay varios grupos visibles.

Se conserva el filtrado de servidor por los permisos del usuario autenticado. Sol, con permiso exclusivo de tienda, recibe solo Tienda; Mónica, con permiso exclusivo de tesorería, recibe solo Tesorería. No se alteran sus roles ni permisos. Las rutas mantienen su comprobación independiente de acceso. Auditoría y evidencia en `docs/audits/2026-10-02-admin-home.md`.

### 2026-10-02 · Cabecera del equipo y estadísticas del jugador

A petición de Rubén, se retira la temporada de la cabecera del equipo y se amplía el contador de jugadores. La ficha deportiva destaca Partidos, Goles y Asistencias, con tarjetas de altura uniforme y cifras centradas. Expulsiones se mantiene en el bloque secundario, Tiros sustituye a Tiros registrados y se retira la explicación inferior. Paradas y Goles recibidos se muestran independientemente solo cuando su valor es positivo. Se conservan los cálculos y el alcance de las actas existentes.

La foto subida se puede ampliar tocándola y cerrar con un botón visible, regresando al mismo perfil y restaurando el foco. Sin foto no se ofrece un control vacío. Verificación: 25 pruebas correctas, TypeScript y ESLint, revisión móvil a 393 × 852 px y evidencias en `docs/audits/evidence/player-profile-2026-10-02/`.

### 2026-10-02 · Retirada de la importación de jugadores

Por petición expresa de Rubén, se elimina íntegramente la sección /admin/players/import: página, accesos administrativos, panel, acciones de servidor, esquema, plantilla y pruebas exclusivas. Se conserva la gestión habitual de jugadores, sus datos y permisos. La biblioteca Excel sigue siendo necesaria para las exportaciones de tienda y tesorería. Las referencias de auditorías anteriores describen el estado histórico.

### 2026-10-02 · Crear equipos en la temporada actual y editar gorros por defecto

Rubén solicita retirar la elección de temporada al crear equipos. La creación usa siempre la temporada actual, comprobada en servidor y en la política de inserción; sin temporada actual no se ofrece crear un equipo.

Plantilla permite editar los gorros de la convocatoria por defecto con los controles del acta: números del 1 al 14, Sin gorro, limpieza e intercambio confirmado. Se conservan los refuerzos guardados y la pertenencia a los equipos. Los integrantes fuera de la lista por defecto aparecen sin número; asignarles uno los añade si hay plaza. El primer guardado inicializa la lista cuando aún no existe, con hasta 14 jugadores y prioridad para los gorros asignados. La lista admite gorros pendientes de asignación, sin saltarse las validaciones del partido.

Guardar desde Plantilla y guardar Este y los próximos desde Editar convocatoria sincronizan los gorros propios. No se modifican las convocatorias de partidos ya creados ni los gorros de un refuerzo en su equipo de origen. Las escrituras son transaccionales, con rechazo de cambios desactualizados. Evidencia y pruebas en `docs/audits/2026-10-02-team-default-caps.md`.

### 2026-10-03 · Gestión de jugadores con el estilo de tienda, equipos y acta

Rubén solicita rehacer la gestión de jugadores para administradores con poca experiencia tecnológica. El directorio muestra solo perfiles con rol de jugador, con búsqueda sin tildes y filtros agrupados por estado, categoría por edad y equipo. Se conserva la importación eliminada. El alta presenta nombre, año y equipo principal, dejando foto, contacto y otros datos en secciones desplegables. Se revisa antes de guardar y se confirma la salida con cambios y la activación o desactivación.

Las fotos se seleccionan como archivos. El registro de perfil, rol y equipo se realiza mediante una transacción exclusiva del servidor; se comprueban temporada actual, elegibilidad, duplicados y gorros. Las ediciones guardan solo cambios efectivos. El gorro preferido de la ficha se mantiene separado de la convocatoria por defecto, que se gestiona en Equipos. Se controla la abreviación de nombres, la alineación de datos y las acciones en una línea en móvil. Auditoría, pruebas y límites en `docs/audits/2026-10-03-admin-players-redesign.md`. No se modifica la demo ni se publica.

### 2026-10-03 · Categorías por temporada y simplificación de la ficha de jugador

Rubén confirma que en 2025/2026 los nacidos en 2010 y 2011 son Cadetes; en 2026/2027, 2010 es Juvenil de primer año y 2011 Cadete de segundo año. Se corrige el cálculo compartido con el año de inicio de la temporada: Benjamín hasta diferencia 9, Alevín hasta 11, Infantil hasta 13, Cadete hasta 15, Juvenil hasta 17 y Absoluto después. En 2025/2026 corresponden Benjamín 2016 en adelante, Alevín 2014–2015, Infantil 2012–2013, Cadete 2010–2011, Juvenil 2008–2009 y Absoluto 2007 o anterior. Cada temporada desplaza estos años uno hacia adelante.

Las convocatorias y los rankings usan la temporada del partido o de la consulta; tiempos de natación convierte su año final al año inicial. El alta transaccional y el futuro archivo de temporada usan los mismos límites. Se corrige la agrupación por categoría de los rankings existentes conservando sus cifras. No se cambian años de nacimiento ni se mueve a los jugadores de equipo automáticamente.

Se retiran Género y Notas internas del formulario de alta y edición, de su validación y de los datos enviados. Los valores históricos almacenados se conservan. Verificación y evidencias en `docs/audits/2026-10-03-player-categories.md`.

### 2026-10-03 · Perfil personal, familia y ajustes actualizados

Rubén solicita renovar Perfil y sus flujos con el estilo de Tienda, Equipo y Acta, para niños y familias con poca experiencia tecnológica. La portada reúne identidad, edición, actividad, familia y cuenta. Los accesos de administración y asistencia dependen de los permisos propios; los hijos vinculados no amplían las facultades de la cuenta.

La edición permite nombre, foto y contacto privado, además del gorro preferido para jugadores. El año de nacimiento queda a cargo del club porque determina categorías y reglas de menores. Se revisan los cambios antes de guardar y se protege la salida con borrador, incluido el gesto Atrás. Los cambios de foto se preparan sin alterar la foto guardada, con verificación del resultado y protección frente a ediciones simultáneas.

Familia conserva la vinculación existente y ofrece ficha deportiva, asistencia, tiempos, pedidos por autorizar y cuotas. Los ajustes agrupan notificaciones, contraseña y calendario personal. Se mantienen los orígenes de navegación desde el perfil al visitar otras secciones. Auditoría, evidencias y límites en `docs/audits/2026-10-03-profile-redesign.md`.


### 2026-10-03 · Perfil, actividad y avisos móviles

Rubén pide dar más espacio a la foto y al nombre del perfil, retirar el texto de gestión del nacimiento y reunir los controles de cuenta en la portada. El nacimiento sigue siendo gestionado por el club. Calendario pasa a actividad deportiva; la antigua ruta de ajustes redirige a Perfil. Cuotas, historial de asistencia y tiempos de nado adoptan los componentes y criterios visuales compartidos.

El buzón pertenece a la cuenta propia; los avisos deportivos del jugador se generan también para los familiares vinculados. Se separan Sin leer y Todas, con detalle y paginación. Las preferencias por tema controlan la entrega al móvil; los avisos se conservan siempre en el buzón. La suscripción se activa y desactiva por dispositivo, y el botón de prueba comprueba el envío real al dispositivo actual.

Se centralizan eventos de partidos, convocatorias, entrenamientos, asistencias y pedidos en la base de datos. Cada aviso se entrega por una cola persistente a los dispositivos activos, con contenido propio, comprobación de preferencias y reintentos limitados. El trabajador y la generación de recordatorios son exclusivos del servidor. Se necesita programar el procesador periódico al publicar Core; no se crea una automatización temporal contra localhost ni se da por probada la recepción nativa sin dispositivos físicos y HTTPS.

Auditoría y pruebas: `docs/audits/2026-10-03-profile-notifications.md`. Preparación operativa: `docs/guides/notificaciones.md`. No se modifica la demo ni se publica Core.

### 2026-10-04 · Horarios conjuntos y gestión de fechas de entrenamiento

Rubén solicita renovar Entrenamientos con el estilo de tienda y acta y simplificar su gestión para personas con poca experiencia tecnológica. Se separan Fechas y Horario semanal. El alta sigue Equipos, Horario y Revisar, con confirmación, protección del borrador, controles contrastados y acciones visibles. Los tipos nuevos son únicamente Agua, Físico/seco y Reunión.

Un horario puede reunir varios equipos, varias franjas y vacaciones; también admite días sueltos y jugadores concretos. Los cambios por fechas pueden afectar a un día o un periodo sin alterar el horario habitual. Se conservan cancelaciones, excepciones, historial y asistencia al editar, renovar o finalizar. Finalizar cancela las fechas futuras pendientes, con confirmación.

Se mantienen registros por equipo para permisos y asistencia, unidos por metadatos de horario y sesión conjunta. Calendario, actividad, estadísticas y resumen familiar evitan duplicar una sesión compartida. Los avisos se dirigen a los participantes y familiares; gestionar horarios no concede al delegado permisos de asistencia. Las mutaciones se validan en servidor y se ejecutan de forma transaccional bajo RLS, con rechazo de solapamientos y cambios no autorizados.

Estado previo conservado localmente; no se cambian automáticamente la temporada ni los horarios reales del club. Auditoría y evidencias en `docs/audits/2026-10-04-admin-trainings.md`, guía en `docs/guides/entrenamientos.md`. No se modifica la demo ni se publica Core.


### 2026-10-04 · Inicio centrado en actividad, familia y acciones pendientes

Rubén solicita replantear Inicio con la identidad y los componentes de las pantallas renovadas. La portada reúne escudo, saludo, agenda personal o familiar, tareas reales, estadísticas de actas finalizadas, último resultado y noticias. Se retiran resúmenes vacíos y enlaces de relleno. Las acciones de acta y gestión dependen de los permisos propios; los hijos no conceden facultades de administración.

La agenda incorpora entrenamientos conjuntos y convocatorias como refuerzo, con elección de hijo y fichas accesibles. Las estadísticas incluyen actas de otras categorías donde la persona está inscrita. El resultado con penaltis comparte el cálculo de la ficha del partido. Se conserva el origen Inicio al abrir los flujos relacionados y se presentan de forma distinta la ausencia de actividad y los errores de carga.

Se conserva una copia local del Inicio anterior. Auditoría, evidencias y límites en `docs/audits/2026-10-04-dashboard.md`. No se cambian la temporada ni los horarios reales, no se modifica la demo ni se publica Core.


## 4 de octubre de 2026 · Calendario y asistencia

Se conserva el calendario mensual compacto y se retira su modo semanal para centrar el flujo en entrenamientos, partidos y asistencia. La leyenda y el detalle usan las láminas actuales del acta. La asistencia familiar conserva el registro de cada persona; una sesión sin lista no se cuenta como falta. Las convocatorias de refuerzo aparecen aunque sean de otro equipo, salvo filtro explícito por equipo. Los enlaces de regreso conservan mes, persona, categoría y día.

Abrir una lista nueva de asistencia ya no registra automáticamente a todos como presentes: prepara la selección y solo guarda por una elección explícita o al pulsar guardar. El resumen técnico conserva sus periodos semana/mes. Evidencias y límites en `docs/audits/2026-10-04-calendar.md`.

### 2026-10-04 · Rankings del club y ajuste de podio y tarjetas

Rubén solicita una sección coherente de Rankings, Rachas y Leyendas con jugadores, equipos y un resumen de posiciones por persona. Las clasificaciones deportivas priorizan el acta finalizada sobre los registros manuales, evitan duplicados y separan el resultado con tanda de las estadísticas individuales. Los datos avanzados requieren una fuente que realmente los registre. Se conservan los empates y mínimos de muestra para medias y eficacia.

Nado mantiene el último registro por defecto y permite consultar el mejor. Leyendas conserva los intentos históricos y su categoría de entonces; los archivos anteriores no duplican la temporada actual. La asistencia técnica depende de los permisos propios y no considera una lista sin registrar como ausencia.

Tras revisar el primer resultado, Rubén aprueba la navegación y funcionalidad y pide rehacer únicamente las tarjetas y el podio: filas compactas, superficie de categoría y cifra azul, y podio escalonado de oro, plata y bronce. Se conserva el resumen al pulsar y la navegación aprobada. Auditoría y evidencias: `docs/audits/2026-10-04-rankings.md`. Copia previa fuera del proyecto. No se modifica la demo ni se publica Core.

### 2026-10-05 · Estadísticas compactas, empates y acumulados de rankings

Rubén pide mantener las estadísticas secundarias de las tarjetas, con abreviaturas e integración compacta, y sustituir los puestos visibles del podio por esos datos. Los empates tienen exactamente el mismo color y dimensiones. Se amplían las zonas de paginación y se utiliza «partidos» en las comparaciones. MVP muestra porcentaje de partidos como MVP.

La tanda pasa a contar en las estadísticas de Ranking y Leyendas: goles, tiros, paradas y goles recibidos, por identidad del jugador o portero. Se incorporan partidos jugados y expulsiones y más rachas de contribuciones, paradas, disciplina y resultados. Una roja corta la racha sin sanciones. Cada clasificación mantiene ayuda propia.

Leyendas ofrece las métricas de Ranking con nombres simples y acumula temporadas mediante una fila por jugador y temporada. El cierre conserva contadores compactos de estadísticas completas y asistencia sin duplicar entrenamientos conjuntos. Los datos antiguos ausentes no se reconstruyen con ceros inventados. Las medias se calculan con totales, no promediando temporadas. Se aplican las migraciones de resumen compacto y asistencia histórica; se conservan los archivos existentes y la temporada actual. Auditoría y verificación: `docs/audits/2026-10-05-rankings-refinements.md`. No se publica Core.

### 2026-10-05 · Resumen visual y asistencia provisional

Rubén solicita búsqueda de jugadores, tarjetas separadas y calendario mensual individual al pulsar una persona en Ver resumen. Los días distinguen asistencia confirmada, falta y entrenamiento sin revisar por color; el detalle conserva hora, categoría y motivo dentro de la misma lámina.

Se cambia expresamente el criterio anterior de excluir listas sin revisar de los recuentos: cada participante elegible se considera presente de forma provisional hasta registrar su ausencia. La lista continúa sin revisar; consultar el resumen o abrir Pasar lista no escribe presencias automáticas. Solo un registro explícito cambia la revisión individual. No se cuentan sesiones futuras, canceladas, fuera de las fechas de pertenencia o ajenas a una convocatoria específica.

El criterio se comparte entre resumen, historial personal, familia, calendario, rankings y acumulados históricos. Las sesiones conjuntas se deduplican por persona y prevalece la última revisión explícita. El resumen semanal conserva sus propios totales, pero ofrece el calendario del mes completo. Se aplica la migración de asistencia provisional sin alterar RLS ni crear registros de asistencia. Auditoría y evidencias: `docs/audits/2026-10-05-attendance-summary.md`.

### 2026-10-05 · Acta: feedback de delegados e integración de estadísticas

Rubén pide aplicar primero a Core goles de contraataque con asistencia, tiros bloqueados por un defensor rival, bloqueos defensivos, control de tiempos muertos e intercambio rápido de gorros entre portero y jugador en Benjamín, Alevín e Infantil. Se conserva un punto de retorno de código en GitHub: commit `d29eafd` y etiqueta `checkpoint/acta-before-2026-10-05`.

Autoriza usar la última normativa publicada como provisional: cero tiempos muertos en Benjamín y Alevín, dos por equipo y partido desde Infantil hasta Absoluto. Los cupos se verifican en el cliente, Server Action y base de datos, respetando registros antiguos sin permitir nuevos excesos. La clave histórica `shot_blocked` conserva su significado de parada rival; el bloqueo nuevo usa `shot_deflected`. El intercambio mantiene las identidades y el historial de portería, incluida la sincronización conjunta con el cierre sin conexión.

Tras revisar el primer diseño, Rubén descarta una sección conjunta de métricas nuevas y detalles bajo cada jugador. El PDF integra columnas condicionales abreviadas en el orden goles, tiros, asistencias, defensa y sanciones; Aportación individual conserva sus columnas anteriores. Por aclaración posterior de Rubén, las tablas no distinguen los tiros bloqueados por un rival: solo cuentan Tiros. La tabla principal sí incorpora los bloqueos defensivos realizados por Morvedre. El gol de contraataque sustituye al acceso directo a gol de penalti, manteniendo el flujo de penalti existente. Tiro bloqueado usa una etiqueta breve sin ayuda añadida y Entrenador muestra un contador compacto sin insignias. Auditoría, fuentes, verificaciones y bitácora acumulativa: `docs/audits/2026-10-05-acta-feedback-delegados.md`. La demo no se modifica y Core no se publica.

Rubén simplifica después los encabezados de la tabla principal del PDF: «Bloqueo» y «Penalti». La tabla rival utiliza también «Penalti». El significado y los recuentos se conservan; se actualiza la bitácora para el traslado a la demo.

Rubén solicita registrar superioridad rival y comparar su eficacia con nuestras expulsiones para analizar la defensa en inferioridad. Se mantienen sus cuatro acciones: Gol abre únicamente normal o superioridad, sin asistencia. En Lectura del partido se integra la eficacia de ambos equipos antes de Nuestros lanzamientos, junto al bloque de penaltis. La tabla rival incorpora G. 1+ cuando existe. Se aplica la migración de resultado rival y se corrige el cómputo de tiros acertados de contraataque en rankings y rendimiento personal. Fuentes y traslado a la demo continúan en la bitácora del acta.

Rubén pide eliminar el detalle (x de contra) de la etiqueta Goles en Lectura del partido del PDF. Esa comparación muestra solo Goles y los totales; la tabla principal conserva G. contra. Decisión incorporada a la bitácora para trasladarla después a la demo.

Rubén revisa los accesos del acta: rival con Gol y Gol 1+ arriba, Penalti y Expulsión debajo y roja blanca de ancho completo fuera de la cuadrícula. Bloqueo defensivo sustituye Otras acciones; las asistencias solo se crean tras gol. El intercambio de gorros se traslada al bloque inferior Portero en juego, dentro de Revisar portero en los cuartos 1–4 y junto a la selección de porteros desde el quinto. Las categorías sin tiempos muestran un aviso único legible, sin solicitud; se conserva el cupo independiente y la prohibición de superar el máximo. Comportamiento y verificaciones actualizados en la bitácora para la demo, que continúa sin modificar.

Rubén pide que Gol 1+ no ocupe varias líneas: se abrevia la etiqueta visible rival a Gol 1+, manteniendo el nombre accesible Gol en superioridad · 1+. Los avisos de tiempos muertos y las superficies informativas del acta incorporan reborde azul oscuro de 2 px y texto de alto contraste. Ajuste documentado en la bitácora de traslado a la demo.

Rubén pide fondo rojo para la tarjeta roja rival y textos de tiempos muertos más sutiles y compactos. Se mantiene el botón de ancho completo, se abrevia el aviso de prohibición y cupo agotado y se resume la confirmación a disponibles y concesión del árbitro. Contornos oscuros y límites automáticos se conservan; la normativa completa sigue documentada en la bitácora para la demo.

Rubén solicita Morvedre azul y Rival amarillo en la selección de tiempos muertos y comunica que Infantil tampoco los permite con la normativa actualizada. Infantil pasa a cero por ambos equipos, en dominio y protección SQL; se conserva el historial anterior sin permitir nuevos tiempos. Migración 20261005164256_acta_infantil_no_timeouts.sql aplicada y verificada. La bitácora registra la nueva fuente comunicada por Rubén, pendiente de incorporar el enlace al anexo, y sustituye la regla provisional anterior para el traslado a la demo.
