# Preguntas pendientes (no bloqueantes)

Estas preguntas se resuelven durante la implementación, en la fase correspondiente. No bloquean la Fase 0.

## Para Fase 0 (scaffold)

- [ ] **Contraseña política**: longitud mínima, complejidad, expiración. Default propuesto: mínimo 10 caracteres, sin requisitos adicionales, sin expiración. ¿OK?
- [ ] **Recuperación de contraseña**: solo magic link por email, o admin puede resetear. Default: ambas. ¿OK?
- [ ] **Nombre del paquete en package.json**: `morvedre-core`. ¿OK?
- [ ] **Dominio provisional en Vercel**: `morvedre-core.vercel.app`. ¿OK o prefieres otro?
- [ ] **Email remitente para Resend**: por defecto `noreply@morvedre-core.app` (cuando se configure dominio). ¿OK?

## Para Fase 1 (Estructura deportiva)

- [ ] **Plantilla por defecto cuando se crea un equipo**: ¿qué dorsal se asigna a los jugadores nuevos? Default: siguiente libre.
- [ ] **Criterio de asignación A vs B**: cuando un jugador nuevo llega, ¿quién decide si va al A o al B? Default: lo decide el head coach, no el sistema.
- [ ] **Noticia automática de nuevo jugador**: ¿se publica en el tablón cuando alguien se da de alta? Default: no, solo en el roster del equipo.
- [ ] **Jugador nuevo a mitad de temporada**: ¿se le asigna a un equipo automáticamente? Default: no, el admin/entrenador lo asigna manualmente.

## Para Fase 2 (Entrenamientos y partidos)

- [ ] **Hora de los entrenamientos**: configurable por bloque, pero ¿hay un default? Default: 17:30-19:00 para infantiles, 19:00-20:30 para cadetes/juveniles/absoluto.
- [ ] **Tipos de sesión**: agua, seco, físico, técnico, mixto. Default: solo "agua" y "seco" en MVP, el resto se puede añadir.
- [ ] **Asistencia por defecto**: si un jugador no marca, ¿se asume presente? Default: el entrenador confirma manualmente, no se asume nada.
- [ ] **Recordatorios de convocatoria**: 3 días y 1 día antes. ¿A qué hora del día? Default: 20:00.
- [ ] **Cancelación de entrenamiento**: ¿se notifica a todo el equipo o solo a los del roster? Default: a todo el equipo.

## Para Fase 3 (Estadísticas y rankings)

- [ ] **Tipos de exclusión**: simple, doble, penalti, etc. Default: solo total en MVP.
- [ ] **Fase del partido**: regular, playoff, copa, friendly. Default: configurable por partido.
- [ ] **MVP por partido**: descartado. Solo "máximo goleador del partido" por categoría y general. ¿Se publica cada lunes? Default: sí.
- [ ] **Rankings públicos**: todo el club. ¿Hay un ranking combinado (goles + asistencia + disciplina) o solo los tres por separado? Default: los tres por separado.
- [ ] **Ventana de tiempo de los rankings**: ¿temporada actual, o también histórico? Default: solo temporada actual en MVP. Histórico en "Leyendas".

## Para Fase 4 (Noticias)

- [ ] **Tipos de noticias**: info, urgente, festivo, torneo, resultados, sponsor. Default: todas.
- [ ] **Comentarios o solo reacciones**: solo reacciones (likes, dislikes, celebrates, sad). Confirmado.
- [ ] **Caducidad de noticias**: default 30 días para info, nunca para urgente. ¿OK?
- [ ] **Fijar noticias importantes**: sí. ¿Cuántas se pueden fijar a la vez? Default: 3.

## Para Fase 5 (Tienda)

- [ ] **Estados del pedido**: pendiente_padres → aprobado → encargado_fabrica → recibido → entregado. ¿Falta cancelar? Default: añadir estado `cancelado`.
- [ ] **Quién puede cancelar un pedido aprobado**: el padre puede cancelar mientras no se haya encargado a fábrica. Default.
- [ ] **Stock físico**: no hay control de stock. ¿OK?
- [ ] **Proveedor actual**: ¿cuál? El club probablemente ya trabaja con uno. Sirve para tipografía de los emails a fábrica.

## Para Fase 6 (Tesorería)

- [ ] **Cuota menores (Benjamín y/o Alevín)**: cifra exacta. Default placeholder: 40€ Benjamín, 50€ Alevín, 60€ resto. Ajustable.
- [ ] **Descuento por hermano**: cifra exacta. Default: 0€ (desactivado). Ajustable.
- [ ] **Email de la tesorera**: para enviar el cierre. Default: placeholder `tesorera@morvedre-core.app`. Ajustable.
- [ ] **Cuándo se genera el cierre**: día 1 de cada mes. ¿Hora? Default: 08:00.
- [ ] **Recordatorio de cuota**: ¿cuándo? Default: día 25 de cada mes a las 20:00.

## Para Fase 7 (Logística)

- [ ] **Compensación por viaje**: default 30€. ¿OK?
- [ ] **Plazas máximas por coche**: default 6. ¿OK?
- [ ] **Punto de encuentro por defecto**: "Piscina Municipal Puerto de Sagunto" (a confirmar dirección exacta).

## Para Fase 8 (Histórico)

- [ ] **Cuándo se hace la transición de temporada**: a finales de julio. ¿Día concreto? Default: 31 de julio a las 23:59.
- [ ] **Sección "Leyendas"**: top goleadores histórico, top partidos, top asistencia. ¿Otros? Default: añadir "rachas" (más goles consecutivos en un partido, etc.) si la implementación es sencilla.

## Para Fase 9 (Polish)

- [ ] **Modo oscuro**: lo incluimos. ¿Tema por defecto claro u oscuro? Default: claro, con switch a oscuro en la topbar.
- [ ] **Valencià**: descartado en MVP. ¿Se reconsidera? Si hay demanda, se añade en versión 2.
- [ ] **Lighthouse PWA score**: target 95+. ¿OK?
- [ ] **WCAG**: target AA mínimo, AAA en texto principal. ¿OK?
- [ ] **Sentry**: ¿activamos? Default: sí, plan free, 5k eventos/mes.

## Cosas que pueden surgir durante la implementación

- Conflictos entre eventos en el calendario (un jugador convocado a dos partidos a la vez)
- Jugadores que se dan de baja a mitad de temporada
- Equipos que se quedan sin jugadores suficientes y desaparecen
- Equipos nuevos que se crean a mitad de temporada (poco probable, pero posible)
- Una persona del club dimite de un rol
- Cambio de entrenador a mitad de temporada
- Cambio de directiva tras asamblea anual
- Años en los que no hay liga (¿ha pasado alguna vez?)

Cada uno de estos tiene un default razonable en el modelo de datos. Si ocurre, lo registramos en `00-decisions-log.md` con la decisión tomada.
