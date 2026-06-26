# Proceso de descubrimiento

> Adaptación de `discovery-interview-guide` + `customer-discovery` al caso Morvedre Core.
> No estamos validando un problema con clientes externos: estamos extrayendo conocimiento detallado de un único stakeholder (tú) que es a la vez product owner, sponsor, experto del dominio y representante del club.

## Por qué dos skills distintas

- **customer-discovery** nos da la disciplina de documentar **hipótesis y validarlas** con evidencia. Lo aplicamos al producto: cada afirmación del SRS se convierte en una hipótesis con nivel de confianza.
- **discovery-interview-guide** nos da la **estructura de preguntas** (pasado, comportamiento, "5 whys"). Lo aplicamos a las entrevistas contigo: extraer el conocimiento operativo del club sin saltar a soluciones.

## Fases del descubrimiento

### Fase 1 — Stakeholder discovery (ahora)

**Objetivo:** convertir el SRS en una especificación operativa suficientemente densa como para empezar a construir sin volver atrás cada 2 días.

**Quién soy yo:** el "interviewer". Estructuro las preguntas, propongo opciones con fundamento, documento cada respuesta.

**Quién eres tú:** el experto del club. Respondes con conocimiento real, matizas cuando no encaja con mi propuesta, confirmas o rectificas.

**Reglas:**

1. Preguntas en lotes de 4–5 máximo, mezclando opción múltiple (rápido) con texto libre (matiz).
2. Para cada lote: doy mi recomendación basada en mejores prácticas y contexto del club. Tú decides si la aceptas, la cambias, o me explicas por qué no aplica.
3. Documento cada respuesta en este mismo archivo o en `00-decisions-log.md`. Tú lo puedes revisar cuando quieras.
4. Si una pregunta no la sabes, marcamos `[P]` (pendiente) y seguimos.

### Fase 2 — User discovery (futuro, post-MVP)

**Objetivo:** contrastar el producto con la realidad de los usuarios reales: un entrenador, una madre de benjamín, un jugador cadete, una directiva.

**Cuándo:** antes de Fase 9 (Polish). 5–8 entrevistas semiestructuradas con perfiles representativos. No es antes porque no tendría nada que enseñar.

**No es bloqueante para construir.** Lo apunto aquí como tarea futura.

### Fase 3 — Solution discovery (futuro, post-MVP)

**Objetivo:** enseñar el producto a usuarios reales y detectar fricciones.

**Cuándo:** al final de cada fase, demos a 1–2 usuarios de cada perfil. Se registran en `docs/research/`.

## Hipótesis del producto

Documentadas en `08-hypotheses-tracker.md`. Resumen del estado actual:

| Hipótesis | Confianza | Validada con | Notas |
|-----------|-----------|--------------|-------|
| H-C1: el club quiere centralizar gestión en una sola app | Alta | SRS | Confirmado |
| H-C2: las personas clave son jugadores, padres, entrenadores, delegados, directiva, admin | Alta | SRS | Confirmado |
| H-C3: hay dolor real con Cluber por comisiones | Alta | SRS | Implícito |
| H-V1: el ahorro de comisiones justifica la inversión de construir la app | Media | — | A confirmar |
| H-V2: el modelo "selección de perfil" padre-hijo resuelve el multi-cuenta | Alta | SRS | Asunción razonable |
| H-V3: la matriz de ascensos reduce errores administrativos | Alta | SRS | Asunción razonable |
| H-R1: el club está dispuesto a invertir tiempo de directiva en mantener la app | Media | — | A confirmar (esfuerzo operativo) |
| H-H1: una PWA accesible desde el navegador móvil es suficiente, no necesitan app nativa | Alta | SRS | Confirmado |
| H-H2: el canal de distribución es "cada jugador/padre accede por enlace" | Alta | SRS | Confirmado |
| H-CH1: el equipo de desarrollo (tú o alguien) tiene tiempo para mantenerla varios años | Media | — | A confirmar |

## Preguntas por bloque

Las preguntas están en `05-decisions-needed.md` (bloque B y C son los próximos). Las nuevas preguntas que surjan del descubrimiento se añadirán a `09-open-questions.md`.

## Reglas de la entrevista

1. **Pasado, no futuro**: pregunto "cómo lo hacéis ahora", no "cómo os gustaría". El primero es evidencia, el segundo es opinión.
2. **Comportamiento, no opinión**: pregunto "qué pasó la última vez", no "qué pensáis". Las acciones pasadas son más fiables que las intenciones futuras.
3. **No salto a soluciones**: si dices "tengo este problema con las actas", no propongo features inmediatamente. Primero confirmo el dolor, luego propongo.
4. **5 whys**: si tu respuesta es superficial ("es un lío"), sigo preguntando hasta llegar al dolor real.
5. **Documento todo**: cada respuesta va a un archivo. Tú tienes la última palabra.

## Cómo responder a mis preguntas

- Si te doy opciones (A/B/C), dime la letra y un "pero..." si hay matiz. Es lo más rápido.
- Si te pido texto libre, escribe lo que te salga. Si es muy largo, varias líneas o un párrafo. Lo importante es la verdad operativa, no la redacción.
- Si no sabes o no aplica, dime "no sé" o "NS/NC" y seguimos. No inventes.
