# Sugerencias de funcionalidades para Morvedre Core

> **Estado: todas las sugerencias rechazadas por el usuario (2026-06-26).** El SRS y lo extraído en discovery son la especificación. No metemos feature creep. Este documento queda como histórico de "se consideró y se descartó".
>
> Lección aprendida: el usuario es claro y decisivo, no quiere que se invente funcionalidad que no resuelve un problema real. Mantenerse en el alcance del SRS.

## Tier 1 — Altamente recomendado (alta relación valor/esfuerzo)

### 1. Historias del club (micro-stories automáticas)

- **Qué es**: cada lunes, un mensaje push al club: "Esta semana hace 4 años, el Alevín ganó 12-8 a Elche con 5 goles de Carlos. ¿Te acuerdas?"
- **Por qué**: genera orgullo de pertenencia, mantiene viva la memoria del club, es contenido gratuito
- **Cómo**: cron semanal que cruza `historical_player_stats` + `matches` + `team_matchups` y elige una historia destacada
- **Coste**: 1 semana de implementación (Fase 8, sin coste extra)

### 2. End of season report (informe de fin de temporada)

- **Qué es**: en julio, cada familia recibe un PDF con el año de su hijo: partidos jugados, goles, % asistencia, mejor partido, foto grupal del equipo, mensaje del entrenador
- **Por qué**: los padres lo comparten, los jugadores lo guardan, los entrenadores lo agradecen. Es un objeto emocional
- **Cómo**: Server Action que genera el PDF con `@react-pdf/renderer` o similar, envía por Resend
- **Coste**: 1.5 semanas (Fase 8, vale la pena)

### 3. Muro del equipo (fotos privadas del club)

- **Qué es**: feed estilo Instagram pero privado del club. Cada jugador puede subir 1 foto/semana de entreno/partido/viaje. Solo reacciones (likes, celebra), no comentarios
- **Por qué**: los adolescentes ya están en Instagram, esto les da un sitio "suyo" sin padres opinando. Y el club tiene un álbum organizado
- **Cómo**: tabla `team_photos` con moderación del entrenador
- **Coste**: 1 semana (Fase 4 o 5, encaja con la lógica de noticias)

### 4. Reto del mes (gamificación sana)

- **Qué es**: el entrenador propone un reto mensual: "Este mes, el que más exclusions positivas (robos) sume se lleva un gorro firmado". Auto-registrable y público
- **Por qué**: motivación extra, gamificación sin ser tóxica (no es "yo contra todos" sino "todos juntos")
- **Cómo**: tabla `challenges` + `challenge_participations`, ranking al final
- **Coste**: 1 semana (Fase 3, encaja con stats)

### 5. Notificación de cumpleaños (opt-out)

- **Qué es**: el día del cumple de cada miembro, push al club con foto y "Felicidades a Carlos, que cumple 14 hoy. Felicidades del Cadete B"
- **Por qué**: comunidad. Es un gesto pequeño que cohesiona
- **Cómo**: cron diario + `profile.birth_date` (añadir campo) + opt-out en preferencias
- **Coste**: 2 días (Fase 4)

### 6. Historial de rivalidades (ya en SRS pero más rico)

- **Qué es**: página por rival con histórico completo: partidos totales, victorias/derrotas, racha actual, máximo goleador contra ellos, mejor resultado, peor resultado, último partido
- **Por qué**: los waterpolistas son muy de rivalidades, esto lo hace tangible
- **Cómo**: vista derivada de `matches` + `historical_team_matchups`
- **Coste**: 3 días (Fase 8)

## Tier 2 — Útiles pero opcionales (depende de appetite)

### 7. Documentos digitales (ficha federativa, certificado médico)

- **Qué es**: el jugador sube su ficha federativa, certificado médico, DNI del tutor. La app los guarda y avisa cuando van a caducar
- **Por qué**: evitar el caos de "¿quién tiene la ficha de Carlos?". Eva (secretaria) lo agradecerá
- **Cómo**: tabla `documents` con subida a Supabase Storage, recordatorio automático 30 días antes de expirar
- **Coste**: 1 semana (Fase 1 o 2)

### 8. Chat del equipo (in-app, sustituye WhatsApp gradualmente)

- **Qué es**: canal de chat por equipo, dentro de la app. NO chat general del club (ya descartado)
- **Por qué**: los WhatsApp de equipo son ruidosos, se mezclan con familia, se pierden. Tenerlo en la app mantiene el contexto
- **Caveat**: los jugadores menores ya usan WhatsApp. Esto es para "asuntos oficiales" no para conversación diaria
- **Cómo**: Supabase Realtime + tabla `messages`
- **Coste**: 1.5 semanas (Fase 4 o 9)

### 9. Exportar calendario a Google/Apple Calendar (.ics)

- **Qué es**: el padre puede "suscribirse" al calendario de su hijo y todos los entrenos/partidos aparecen en su app de calendario del móvil
- **Por qué**: muchos padres viven del Google Calendar. No van a abrir la app cada día, pero sí el calendario
- **Cómo**: endpoint que genera un .ics dinámico, subscripción por URL
- **Coste**: 3 días (Fase 2)

### 10. Equipamiento personal (gorro, bañador)

- **Qué es**: cada jugador tiene asociado su gorro numerado, bañador oficial, talla. Sol ve de un vistazo quién tiene qué. Se alerta cuando un gorro se pierde
- **Por qué**: Sol (la del equipaje) lo agradecerá infinito
- **Cómo**: tabla `player_equipment` + relación con `shop_orders`
- **Coste**: 1 semana (Fase 5)

### 11. Justificar faltas

- **Qué es**: cuando un jugador no asiste, puede dejar un motivo ("viaje familiar", "enfermedad", "examen"). El entrenador lo ve y puede aceptarlo o no
- **Por qué**: justo con los chavales. Si dice "estaba enfermo" y el entrenador lo sabe, no debería contar como falta
- **Cómo**: campo en `training_attendance.reason` + UI para el jugador
- **Coste**: 2 días (Fase 2)

## Tier 3 — Considerar más adelante (Fase 9 o v2)

### 12. Live match updates para los que no pueden ir

- **Qué es**: el delegado mete los goles en directo, los que están en casa lo ven en tiempo real
- **Por qué**: mola, pero requiere que el delegado esté pendiente del móvil durante el partido (no siempre pasa)
- **Coste**: 1 semana. Requiere cambiar flujo de acta

### 13. Mapa del rival y la piscina

- **Qué es**: enlace a Google Maps con la dirección de cada piscina rival
- **Por qué**: útil, barato. Solo es un campo `pool_address` y un link
- **Coste**: 1 día (Fase 2)

### 14. Evaluación cualitativa del jugador (por el entrenador)

- **Qué es**: el entrenador deja notas por jugador: "Ha mejorado el tiro exterior", "Debe trabajar la defensa". Privadas, no públicas
- **Por qué**: añade un valor pedagógico al sistema
- **Coste**: 1 semana (Fase 9, cuando haya datos suficientes)

### 15. Votaciones para eventos del club

- **Qué es**: "Qué día hacemos la paella?", "¿Vamos a la Copa de Navidad?". Votación simple, sin debate
- **Por qué**: ahorra 30 mensajes de WhatsApp cada vez
- **Coste**: 3 días (Fase 9)

### 16. Aniversario de partidos (memoria histórica)

- **Qué es**: "Hoy hace 5 años, tu infantil ganó el campeonato". Mini-noticia generada automáticamente
- **Por qué**: refuerza orgullo. Pero requiere datos históricos (que no tenemos)
- **Coste**: 1 día cuando haya histórico (Fase 8+)

## Tier 4 — NO recomiendo (al menos en MVP)

❌ **Pasarela de pago en la app** — ya descartado, pero lo repito: las comisiones te comen
❌ **Chat general del club** — ya descartado
❌ **Geolocalización para pasar lista** — problemas de privacidad con menores, no compensa
❌ **App nativa** — ya descartado
❌ **Streaming de partidos en directo** — fuera de scope, no aporta
❌ **Marketplace de segunda mano** — Sol ya gestiona esto fuera de la app
❌ **Sistema de mensajería entrenador-padre individual** — el WhatsApp ya cubre esto, no reinventar
❌ **Votación de MVP del partido** — no hay MVP formal
❌ **Comunidad para padres de otros clubes** — el club no es una red social
❌ **Sistema de sanciones** — fuera de scope, es un tema de la directiva

## Coste total estimado del Tier 1 + Tier 2

Si metemos todo el Tier 1 y Tier 2, hablamos de unas **6-7 semanas extra** sobre el roadmap actual. Distribuibles entre Fase 8 (histórico) y Fase 9 (polish).

**Mi recomendación**: meter **Tier 1 completo** (5-6 semanas) y dejar Tier 2 para más adelante, según demanda.

## Si quieres meter algo de Tier 1, dime cuál y lo planifico.

Si no quieres meter nada, el SRS actual + discovery es suficiente para empezar Fase 0.
