# Acta en directo: plan de mejora tras la prueba con un delegado

Fecha: 8 de septiembre de 2026.

Estado actualizado el 11 de septiembre: **implementación previa en revisión; diseño rechazado por el usuario y cambios pausados para analizarlo.** Rubén autorizó la ejecución inicial, pero ahora solicita únicamente diagnóstico y planificación. El [plan 37](37-acta-design-review-and-redesign-plan.md) sustituye la dirección visual de porteros separados y define la próxima propuesta, pendiente de nueva orden para implementar. Las comprobaciones históricas de este documento no acreditan la usabilidad ni el render de cada cambio posterior. La migración y la validación en dispositivos reales siguen pendientes.

## 1. Objetivo y punto de partida

La prueba con el padre de Rubén valida el recorrido principal: lo ha considerado «fácil e intuitivo». Hay que conservar la secuencia equipo → jugador → acción y mejorar su claridad, fiabilidad y acabado. El delegado debe poder mirar el partido, reconocer los datos importantes de un vistazo y registrar sin tener que aprender terminología informática.

Este documento recoge todos los comentarios de esa prueba, sus consecuencias en datos y PDF, las decisiones propuestas y los ensayos necesarios. El usuario de referencia es una persona de 40–60 años, con distinta familiaridad tecnológica, usando el móvil durante un partido. No se presupone que la edad determine por sí sola sus capacidades.

**Alcance ejecutado:** dominio, interfaz, persistencia local, relevo, convocatoria, migración SQL, PDF, pruebas unitarias y auditoría responsive local. El error anterior de la propuesta de convocatoria continúa como asunto separado. La migración remota y el ensayo con delegados en dispositivos reales siguen pendientes y no deben darse por acreditados con pruebas locales.

### Requisitos que se mantienen

- Acta en directo para delegados asignados al equipo. Mantener los dos modos: registro sencillo y acta completa.
- Marcador global prioritario; goles y expulsiones individuales de ambos equipos siempre fáciles de consultar. Los parciales son secundarios.
- Sin reloj de partido ni obligación de anotar minutos. Cuartos para parciales: seis hasta Infantil y cuatro desde Cadete.
- Tres sanciones personales como máximo; el penalti cometido suma una. Una roja deja fuera aunque no se hayan acumulado tres. Amarilla como advertencia.
- Porteros habituales con gorros 1 y 13; conservan acciones de jugador de campo.
- No incluir «gorro desconocido» en el registro de jugadores. Se puede corregir después.
- Guardado local, sincronización al recuperar conexión y protección ante cambio de dispositivo.
- Acta consultable desde la app según sus permisos y PDF compartible mediante el menú del móvil, incluido WhatsApp.

## 2. Inventario de cambios pedidos

| ID | Cambio | Resultado esperado | Prioridad |
| --- | --- | --- | --- |
| ACT-01 | Error `crypto.randomUUID is not a function` al tomar el relevo | El segundo móvil toma el control sin perder el acta y el primero deja de escribir en el servidor | Bloqueante |
| ACT-02 | Asistencia manual | Botón directo que suma una asistencia; aparece en el PDF, sin columna nueva en el resumen en directo | Alta |
| ACT-03 | Asistencia después de gol normal o en superioridad | Selección opcional del asistente; omitir no borra ni retrasa el gol | Alta |
| ACT-04 | Porteros en el resumen | Mostrar paradas, encajados y sanciones; hacer evidente quién está jugando | Alta |
| ACT-05 | Tiempos muertos | Mostrar «pedidos», equipo y cantidad; acceso visible, sin cupos reglamentarios | Alta |
| ACT-06 | Simplificar tiros | Fuera, bloqueado, a córner y penalti fallado; sin más preguntas obligatorias | Alta |
| ACT-07 | Penalti cometido por rival | Tercera acción rival y continuación opcional para elegir lanzador y gol/fallo | Alta |
| ACT-08 | Posible gol de penalti duplicado | Confirmación contextual en ambos órdenes de anotación, sin borrar goles por deducción | Bloqueante de ACT-07 |
| ACT-09 | Corregir errores | Entrada visible, interfaz amplia y edición de jugador, acción, cuarto y portero cuando corresponda | Alta |
| ACT-10 | Expulsiones más visuales | Fila completa amarilla suave, naranja o roja; número y texto además del color | Alta |
| ACT-11 | Plantillas | Morvedre: máximo 14 convocados activos. Rival: 14 por defecto y número editable | Alta |
| ACT-12 | PDF útil para el equipo técnico | Primera hoja horizontal con tabla completa; análisis y relato por cuartos en vertical | Alta |
| ACT-13 | Pulido general | Tamaños legibles, controles amplios, contraste, estados claros y adaptación móvil | Transversal |

## 3. Evidencia en la implementación actual

Inspección estática del árbol de trabajo el 8 de septiembre. No equivale a reproducir estos problemas en el móvil del usuario ni a probar una solución.

| Archivo / zona | Observación | Consecuencia para el plan |
| --- | --- | --- |
| `components/matches/use-live-match.ts`, `takeover()` | Llama directamente a `crypto.randomUUID()`. `change()` ya usa `generateUuid()` | Unificar creación de identificadores y probar el recorrido real de relevo sin esa API |
| `lib/utils/uuid.ts` | Existe helper con alternativa basada en `Math.random()` | Revisar el helper, no limitarse a sustituir una llamada; preferir aleatoriedad de Web Crypto |
| `components/matches/acta-player-board.tsx` | Todos los jugadores tienen columnas Goles/Exp.; texto auxiliar de 11 px y nombres de 13 px; el color de riesgo está en gorro/casillas | Diseñar filas específicas de portería, aumentar lectura y extender el color a toda la fila |
| `components/matches/live-match-client.tsx` | Porteros bajo un desplegable al final; cambio de portero dentro de las acciones del portero | Sacar la elección del portero a una franja siempre localizable |
| Mismo archivo | Tiros ofrece fuera/palo, parada rival, bloqueado y penalti fallado | Simplificar etiquetas conservando datos históricos |
| Mismo archivo | «Jugadas» abre el historial; corregir reutiliza la selección de acciones | Crear un editor de corrección explícito y preservar relaciones entre eventos |
| `lib/domain/live-match.ts` | No hay asistencia ni córner. Acciones rivales permitidas no incluyen penalti. Documento versión 1, hasta 30 jugadores | Versionar el documento y validar nuevos tipos y relaciones de forma compatible |
| `server/actions/live-match.ts` | Acta nueva genera 13 gorros rivales; portero inicial se infiere entre 1/13 | Cambiar a 14 y hacer visible la confirmación de portero |
| `lib/domain/callups.ts` | Sugerencias por defecto de 13; creación por otras vías no queda limitada por ese valor | Aplicar 14 en todo el recorrido, incluida validación transaccional |
| `lib/domain/acta-pdf.ts` | PDF vertical, tablas básicas y texto lineal; no incluye análisis ni asistencia | Construir un modelo de informe y una maquetación por tipo de página |
| Migraciones `20260907154016_live_match_sheets.sql` y `20260908120517_live_match_delegate_entry.sql` | Documento JSON, revisión, propietario, dispositivo e identificador de mutación; proyección de goles/expulsiones a `match_stats` | Mantener las garantías de sincronización; al ampliar datos revisar SQL y consumidores |

Referencias del proyecto: [guía actual del acta](../guides/acta-en-directo.md), [identidad visual](18-visual-identity-v2.md) y [estado operativo](../audits/2026-09-04-operational-status.md).

## 4. Dirección de interfaz

### 4.1 Conservar lo que ya funciona

No convertir el acta en un panel lleno de gráficas, pestañas y formularios. Durante el juego interesa anotar y ver lo esencial. El análisis detallado pertenece al informe y a la consulta posterior.

Se han considerado tres composiciones: una lista única alternando equipos, pestañas separadas y dos columnas simultáneas. **Propuesta:** conservar dos columnas de resumen porque permite vigilar ambos equipos. En anchuras o ampliaciones donde no sean legibles, pasar a bloques sucesivos con encabezados claros, conservando el marcador. No encoger el texto para forzar dos columnas.

Composición de referencia:

```text
Volver       ACTA                  Compartir
Morvedre            8 – 6          Nombre rival
Cuarto 3 de 4                      Parcial 2–1
Portero en juego: #1 Pablo          Cambiar
Tiempos muertos pedidos: Morvedre 1 · Rival 2
──────────────────────────────────────────────
MORVEDRE: nombre/gorro, goles, sanciones | RIVAL
Filas de campo y bloque propio de portería
Zona desplazable para consultar todos los gorros
──────────────────────────────────────────────
[       Morvedre       ] [       Rival        ]
[Tiempo muerto] [Corregir] [Terminar cuarto 3]
```

Es un esquema de jerarquía, no una promesa de que todos los rótulos quepan en una sola línea a 320 px. La composición debe medirse antes de implementarse. «Entrenador» seguirá a un toque dentro del panel Tiempo muerto/banquillo, con pestaña o botón rotulado «Tarjeta al entrenador»; no ocultarlo en ajustes generales. El acceso de tarjeta conserva como máximo selección de equipo y color, sin otra navegación intermedia.

### 4.2 Comportamiento al anotar

- En reposo domina el resumen. Morvedre/Rival y Corregir quedan accesibles abajo.
- Tocar una fila sigue siendo el atajo directo a sus acciones.
- Al abrir acciones, panel inferior amplio con gorro y nombre elegido en su cabecera. El marcador permanece visible; el resumen se comprime temporalmente, sin reducir el tamaño de sus letras.
- En móviles muy bajos o con letra ampliada, panel de altura casi completa con su propio resumen de marcador y botón de volver. Solo el contenido necesita desplazarse.
- Volver a jugadores conserva equipo y contexto, sin guardar acciones intermedias. Cerrar vuelve al resumen y restaura el lugar de lectura.
- Feedback después de guardar: «Gol de #7 guardado» o «Asistencia de #4 guardada». Diferenciar guardado en móvil de sincronizado. No esperar al servidor para permitir la siguiente jugada si el guardado local ha terminado.
- Las continuaciones de asistencia y penalti indican qué se ha guardado ya. Sus botones de omitir nunca significan deshacer lo anterior.

### 4.3 Lectura, tacto y acabado

| Elemento | Objetivo propuesto |
| --- | --- |
| Texto de acciones y nombres en selección | 16–18 px; hasta dos líneas para nombres largos |
| Datos secundarios y leyendas | 14 px como objetivo mínimo del acta; no 10/11 px para datos de juego |
| Marcador | 36–48 px según espacio; números tabulares |
| Gorro / valores de resumen | 18–24 px, con peso y alineación constantes |
| Botón principal | Altura preferida 56 px; mínimo táctil 48 × 48 px en todos los controles |
| Separación de acciones vecinas | Preferir 8 px; evitar botones destructivos pegados al registro habitual |
| Texto normal | Contraste mínimo 4,5:1; datos críticos con contraste alto incluso sobre filas coloreadas |
| Bordes, foco e iconos informativos | Contraste medido; nunca depender únicamente de una sombra o cambio de tono |

Usar escala de espacios coherente, fondos sobrios y azul del club. Sin degradados decorativos detrás de cifras ni animaciones que retrasen pulsaciones. Selección, sanción y error deben tener códigos visuales diferentes. Foco visible, controles semánticos, etiquetas de lector de pantalla, avisos accesibles y movimiento reducido.

La referencia WCAG de objetivos ampliados es 44 × 44 CSS px; **el proyecto mantiene su objetivo más exigente de 48 × 48**. No afirmar conformidad WCAG por cumplir solo esa medida. Ver fuentes al final.

Validar a 320, 360, 390, 430 y 768 px, en vertical y horizontal; letra al 200 %, zoom y teclado cuando proceda. Permitir desplazamiento vertical para consultar 14 jugadores: no caben todos en un móvil pequeño manteniendo legibilidad. Sin desplazamiento horizontal de la pantalla ni botones tapados por barras del navegador.

## 5. Relevo entre dispositivos: ACT-01

### Problema y diagnóstico pendiente

El error comunicado es compatible con una API no disponible. El código contiene la llamada directa en el lugar indicado. `randomUUID()` requiere contexto seguro; `getRandomValues()` tiene disponibilidad distinta, incluido contexto no seguro. Una prueba por IP local con HTTP podría explicar la diferencia entre ordenador y móvil; **no se ha confirmado el protocolo ni el navegador de la prueba**. No presentar esa hipótesis como diagnóstico ejecutado.

Al implementar, primero reproducir con `randomUUID` ausente y ensayar dos sesiones independientes. La petición actual solo autoriza planificar, por lo que no se añade ni ejecuta ahora una corrección o prueba funcional.

### Solución planificada

1. Helper único para identificadores de evento, mutación y dispositivo: usar `randomUUID` si existe; alternativa UUID v4 con `crypto.getRandomValues`, incluyendo bits de versión y variante.
2. Revisar la alternativa actual con `Math.random()`. No utilizarla como solución principal ni como mecanismo de autorización. Si faltan ambas APIs adecuadas, mostrar error recuperable antes de mutar; estudiar reserva de IDs del servidor solo si los navegadores realmente soportados lo necesitan.
3. Auditar todas las llamadas de cliente, incluidas creación, corrección, reintento, borradores de continuaciones y relevo.
4. Tomar la última revisión remota y transferir el control sin cambiar su documento. Mantener comprobaciones del delegado y bloqueo transaccional de revisión/dispositivo.
5. Persistir un identificador estable del intento de relevo: si el servidor aceptó y se perdió la respuesta, reintentar o consultar el resultado, sin crear otra operación lógica ni reinicializar el acta.
6. Tras confirmación remota, persistir el nuevo estado local y habilitar escritura. Si falla IndexedDB, explicar que no se puede anotar todavía y permitir recuperar el resultado del relevo; no fingir éxito.

### Estados y datos pendientes

| Situación | Conducta |
| --- | --- |
| Segundo móvil, con conexión y sin pendientes locales | «Este partido se está anotando desde otro móvil» → «Tomar el relevo» → confirmación explicativa |
| Sin conexión | Relevo deshabilitado con «Conéctate para cambiar de móvil» |
| Segundo móvil con cambios propios pendientes | No sustituirlos por la copia remota. Conservarlos y ofrecer revisión/recuperación |
| Primer móvil con jugadas sin enviar | Avisar de que el segundo solo dispone de la última versión sincronizada; no afirmar que conoce los pendientes del otro móvil |
| Dos intentos simultáneos | Una transferencia válida; el otro recibe conflicto y vuelve a consultar, sin sobrescribir |
| Primer móvil vuelve a conectarse | Conservar su copia, bloquear su sincronización obsoleta y mostrar «El acta se está anotando en otro móvil» |
| Respuesta de red perdida tras transferencia | Recuperar resultado de la misma mutación; un solo propietario y ninguna pérdida de eventos |

La resolución de pendientes antiguos debe permitir compararlos por identificador con el acta vigente y recuperar explícitamente jugadas faltantes desde el dispositivo autorizado. Nunca subir a ciegas una instantánea vieja por encima de la nueva. Es un caso de integridad a cubrir junto al relevo, aunque la interfaz de recuperación solo aparezca cuando haga falta.

Mantener la exigencia de HTTPS para las garantías de PWA/offline. Arreglar un UUID en HTTP no convierte toda la aplicación en una PWA plenamente operativa en ese origen. Ningún almacenamiento web garantiza conservar datos tras borrado explícito o expulsión por el sistema: conservar avisos existentes y verificar cada escritura.

## 6. Asistencias: ACT-02 y ACT-03

### Asistencia manual

Morvedre → jugador → **Asistencia**. El botón está al mismo nivel que Gol, Tiro y Expulsión/tarjeta. Una pulsación registra una asistencia y vuelve al resumen. También disponible para porteros.

No añade columna al tablero de juego. Sí aparece en el editor, historial y tabla del PDF. Se distinguirá de asistencia a entrenamientos en nombres técnicos y en las consultas.

### Después de un gol

1. Gol normal o gol en superioridad se guarda inmediatamente en local y actualiza el marcador.
2. Panel: **«Gol de #7 guardado. ¿Quién dio la asistencia?»**.
3. Gorros y nombres de Morvedre; excluir al propio goleador.
4. Elegir asistente guarda una asistencia vinculada a ese gol y vuelve al resumen.
5. Botón grande **«Seguir sin asistencia»**: cierra el panel, sin cambiar el gol. No abrir esta pregunta después de gol de penalti.

El gol conserva el recorrido rápido de hasta cuatro pulsaciones desde la pantalla principal. Una asistencia inmediata añade una pulsación; omitir añade una. El asistente es opcional y nunca bloquea el guardado del gol.

### Integridad y correcciones

- Máximo una asistencia vinculada a cada gol. Un jugador no se asiste a sí mismo.
- El alta manual es una estadística independiente, porque el usuario pide registro sin opciones. No inventar una relación con un gol distante.
- El botón manual conserva el registro directo sin opciones. Si se apunta manualmente una asistencia ya anotada por el flujo guiado, se puede corregir como cualquier duplicado; no deduplicar por proximidad ni añadir una pregunta obligatoria que contradiga ese recorrido. En el editor, mostrar claramente las asistencias ya vinculadas para facilitar la revisión.
- En «Corregir», permitir vincular una asistencia manual a un gol compatible sin sumar otra; mantener visible cuando sigue sin vincular.
- Si se anula un gol con asistencia vinculada, presentar juntos los efectos y anular ambos al confirmar. Si se cambia el goleador y queda autoasistencia, exigir elegir otro asistente o quitarla.
- Cambiar un gol normal a superioridad conserva asistencia; cambiar a penalti exige resolverla. No borrar asistencias independientes por proximidad en el historial.
- Si se cierra la app después del gol y antes de elegir asistente, el gol sigue registrado. Guardar el contexto pendiente para ofrecer retomarlo u omitirlo al volver; nunca volver a crear el gol.

## 7. Porteros: ACT-04

### Elección visible

Franja compacta junto al marcador: **«Portero en juego: #1 Pablo»** y **«Cambiar»**. Al pulsar, opciones grandes #1 y #13 cuando estén convocados, con nombre y distintivo «En juego». Elegir al otro requiere dos pulsaciones en total. Si solo hay uno, su estado sigue siendo visible.

Antes de empezar: confirmar portero inicial. Al empezar otro cuarto, recordar el actual en la pantalla de descanso y ofrecer cambiarlo allí, sin forzar otra confirmación si continúa.

Un sustituto excepcional con otro gorro debe poder elegirse en «Otro jugador», sin inventar un portero inexistente. Si el portero actual recibe roja o tercera sanción, pedir sustituto antes del siguiente registro que necesite atribución. Mantener accesible la corrección de una acción anterior.

### Resumen adaptado a portería

Propuesta: bloque «Portería» visible dentro de Morvedre, antes de las filas de campo; mismos anchos y lenguaje visual. No esconderlo bajo las 14 filas. Los porteros tienen **Paradas / Encajados / Expulsiones** como información principal, con encabezados propios para evitar que una cifra de paradas parezca un gol.

Fila de referencia: `#1 Pablo · EN JUEGO | 5 paradas | 3 encajados | 1/3`. A 320 px admite dos líneas; se mantiene un objetivo de lectura de 14 px para sus etiquetas. Los dos porteros se ven una vez, sin duplicarlos como filas de campo. Sus goles y tiros siguen en acciones, detalle y PDF, aunque no sean la cifra destacada en directo.

### Registro y reglas

- Parada y Penalti parado son las acciones principales del portero. Debajo: Gol, Tiro, Asistencia y Sanción.
- Gol del rival suma un gol global y un encajado al portero que estaba seleccionado al registrar esa acción.
- Parada suma una parada y un recibido a puerta; penalti parado es un subtipo de parada, no una segunda parada.
- **Recibidos a puerta = paradas + encajados**. Mostrarlo como dato derivado. Evitar un tercer contador manual de «recibidos» que pueda duplicar los dos anteriores.
- Una parada desviada a córner cuenta una vez como parada. El córner ofensivo de Morvedre pertenece al tiro de nuestro jugador, no a las estadísticas de nuestro portero.
- Cambiar el portero actual afecta a registros futuros; no reasignar goles anteriores automáticamente.
- Editor de gol rival permite corregir portero y cuarto. Ofrecer corrección de un grupo de jugadas si se olvidó un cambio, con selección explícita y resumen antes de guardar.
- Si se registra una parada en el portero que no está marcado en juego, ofrecer «Era una jugada anterior» o «Está jugando este portero». No cambiar el portero a escondidas.
- No calcular minutos jugados ni paradas por minuto: no hay reloj deportivo.

## 8. Tiempos muertos y entrenadores: ACT-05

Mostrar una línea visible **«Tiempos muertos pedidos»**, con `Morvedre: 1` y `Rival: 2`. Evitar «Tiempos: 1», «disponibles» o «restantes». Los contadores no descuentan nada y no tienen límite por categoría o temporada.

Botón **Tiempo muerto** → dos opciones grandes: «Morvedre · 1 pedido» y «Rival · 2 pedidos». Al elegir: suma uno y confirma «Tiempo muerto de Morvedre guardado · lleva 2». No pedir una tercera confirmación; permitir corregir inmediatamente.

Tarjetas de entrenadores accesibles desde ese panel como **«Tarjeta al entrenador»** → equipo → Amarilla/Roja. Separar visualmente esas acciones del contador de tiempos. Guardar cada evento con su cuarto y mostrar el estado del entrenador en su bloque; una roja no borra la amarilla previa.

Si se cerró un cuarto por error o se anota con retraso, cambiar el cuarto desde Corregir. Sin consecuencias automáticas sobre otros contadores.

## 9. Tiros: ACT-06 y significado estadístico

Botones previstos en Morvedre → jugador → Tiro:

| Botón | Significado de registro | Incrementa |
| --- | --- | --- |
| Tiro fuera | No fue gol y terminó fuera; incluye palo sin gol, según etiqueta de ayuda | Tiros totales y fuera/palo |
| Tiro bloqueado | Tiro detenido o desviado por portero o defensor, sin gol y sin acabar en córner | Tiros totales y bloqueados |
| Tiro a córner | Tiro sin gol cuyo resultado es córner | Tiros totales y tiros a córner |
| Penalti fallado | Lanzamiento de penalti sin gol, cualquiera que sea el desenlace | Tiros totales y penaltis fallados |

**Tiro a córner es una propuesta pendiente de confirmar**, ya que Rubén lo plantea como posibilidad. El plan lo contempla completo para que no quede improvisado si se incluye.

Un lanzamiento tiene un solo resultado. No sumar fuera + córner ni bloqueado + córner para el mismo tiro. En un penalti fallado que termina en córner se prioriza «Penalti fallado»; el nuevo saque no suma otro tiro. Un segundo lanzamiento tras rebote sí es otro tiro.

Todos los goles, incluidos superioridad y penalti, suman un tiro total y cero tiros fallados. No guardar un evento de tiro adicional al crear un gol.

Conservar `shot_saved` histórico y su significado original aunque deje de aparecer como botón. Las nuevas acciones «bloqueado» no permiten saber retrospectivamente quién bloqueó. No convertir datos antiguos ni nuevos en paradas rivales inventadas.

### Lo que se puede calcular y lo que no

Al unir bloqueos de portero y defensor y registrar córner sin trayectoria, **no se conoce el número exacto de tiros entre los tres palos**. Tampoco se conoce si un penalti fallado fue fuera, palo, bloqueo o parada. En el PDF se mostrarán los desenlaces registrados; no se etiquetará «tiros dentro» a todo lo que no figure como fuera.

Se puede calcular cuántos goles son en superioridad y qué proporción representan entre los goles tipificados. No la eficacia de oportunidades de superioridad: faltan posesiones/oportunidades y la condición de los tiros fallados. El plan prioriza la sencillez pedida; si posteriormente Vitaliy necesita esas métricas exactas, habrá que acordar datos adicionales antes de añadirlas.

## 10. Penalti cometido por el rival: ACT-07

### Flujo básico

```text
Rival → gorro → Penalti
    Guardar penalti cometido: +1 sanción personal al rival
    «Penalti del rival #8 guardado. ¿Quién lo tira?»
        → Morvedre #7
            «Lanza #7 Marta»
            [Gol] [Fallo] [Cambiar lanzador]
        → [Seguir sin anotar el tiro]
```

- Rival tiene exactamente tres acciones principales: Gol, Expulsión, Penalti.
- Penalti cometido suma una sanción, pero no suma gol, tiro, parada ni penalti fallado.
- El nombre «Cancelar» por sí solo sería ambiguo tras haber guardado la sanción. Usar **«Seguir sin anotar el tiro»** y explicar «La sanción ya está guardada».
- «Cambiar lanzador» vuelve a los gorros de Morvedre sin volver a sumar la sanción.
- Gol genera `goal_penalty` del lanzador: un gol y un tiro. Fallo genera `penalty_missed`: un tiro fallado y ningún gol.
- El resultado se vincula al penalti rival. No añadir una asistencia automática después de ese gol.
- Incluir a porteros entre lanzadores. Jugadores fuera por sanción siguen el tratamiento de anotaciones anteriores; no habilitar su participación nueva por accidente.
- Si se interrumpe o recarga la pantalla, conservar la sanción y el paso pendiente. Reanudar u omitir sin duplicar nada.
- La sanción guarda el cuarto de la jugada. La continuación hereda ese cuarto aunque la interfaz cambie de estado; si el usuario quiere otro, debe corregirlo expresamente.

El recorrido completo puede requerir seis pulsaciones desde el tablero: equipo, rival, penalti, lanzador, resultado y, únicamente ante coincidencia, resolución de duplicado. Sin aviso son cinco. No prometer tres pulsaciones para una jugada que registra sanción y lanzamiento; el atajo desde la fila rival ahorra una.

## 11. Prevención de goles de penalti duplicados: ACT-08

### Principio

Los reintentos técnicos y el doble toque sobre un botón se evitan con identificadores estables y bloqueo mientras se persiste localmente. **La duplicación humana entre dos recorridos se resuelve con una pregunta contextual**, no con una ventana de tiempo ni con borrado automático.

Guardar vínculos explícitos entre sanción rival y lanzamiento. Registrar el origen del resultado (`manual` o `flujo_penalti`) y una operación lógica compartida para identificar qué ya se apuntó. Navegar, abrir un panel o elegir un gorro no constituye una nueva jugada deportiva.

### Caso A: gol manual y después sanción rival

1. Se registra un gol de penalti manual de #7.
2. La siguiente jugada deportiva es un penalti cometido por rival #8.
3. Se guarda la sanción de #8 y se ofrece elegir lanzador.
4. Si se elige Gol, mostrar **«Acabas de apuntar un gol de penalti de #7. ¿Es el mismo gol?»**, con cuarto, marcador y lanzador recién elegido.
5. **«Sí, ya está apuntado»**: vincular la sanción al gol existente. No sumar gol ni tiro.
6. **«No, es otro gol»**: crear el nuevo gol y tiro, vinculado a la nueva sanción.

Si se eligió otro lanzador, no corregir el anterior automáticamente: mostrar ambos gorros y permitir «Corregir lanzador del gol existente» o conservarlo. Si el usuario sale sin resolver, la sanción permanece, pero no se suma el posible nuevo gol.

### Caso B: sanción y gol por el flujo, después gol manual

1. Rival #8 → Penalti → Morvedre #7 → Gol. Sanción y resultado quedan vinculados.
2. La siguiente jugada deportiva intentada es un gol de penalti manual.
3. Mostrar la misma pregunta antes de incrementar. «Sí» no crea evento; «No, es otro gol» crea un lanzamiento distinto.

### Regla exacta para ofrecer el aviso

- Coincidencia entre los dos recorridos opuestos indicados, mismo cuarto y resultado previo de gol de penalti activo.
- En A, gol previo todavía no vinculado a otra sanción. La propia sanción recién guardada forma parte del mismo flujo y no invalida la coincidencia.
- En B, el resultado anterior procede del flujo guiado y no ha habido otra jugada deportiva registrada entre ambos. La pregunta también puede mostrar un cambio de lanzador sin asumir que es otro gol.
- Cambiar portero, navegar o sincronizar no inventa una nueva jugada; registrar otra sanción, tiro, gol, tiempo muerto o asistencia rompe la coincidencia inmediata.
- Cancelar un panel no consume ni crea un resultado. La decisión «es otro» debe persistir con el nuevo resultado para que un reintento no vuelva a preguntar ni sumar dos veces.
- No buscar goles antiguos «parecidos» durante todo el cuarto. Si el duplicado se anota más tarde, se resuelve en Corregir.
- No usar segundos o minutos como prueba de identidad. El usuario no registra tiempos exactos.

### Ejemplos obligatorios de prueba

| Secuencia | Resultado |
| --- | --- |
| Gol penalti manual → penalti rival → Gol → «Sí» | 1 gol, 1 tiro y 1 sanción rival |
| Misma secuencia → «No, es otro» | 2 goles, 2 tiros y 1 sanción rival registrada |
| Penalti rival → Gol → gol penalti manual → «Sí» | 1 gol, 1 tiro y 1 sanción rival |
| Penalti rival → Fallo → otro penalti rival → Gol | 1 gol, 2 tiros, 1 fallo y 2 sanciones; sin aviso por el fallo anterior |
| Penalti rival → Gol → otro penalti rival → Gol | 2 goles, 2 tiros, 2 sanciones; dos flujos distintos, sin deduplicación automática |
| Gol manual → penalti rival → omitir tiro | Conservar 1 gol y 1 sanción, sin crear resultado adicional; ofrecer vinculación desde Corregir |
| Gol manual → otra jugada → penalti rival → Gol | No aplicar la coincidencia inmediata; registrar resultado nuevo |
| Gol penalti → cambiar cuarto → nuevo gol penalti | Goles independientes |
| Doble toque, reintento de red o recarga después de Gol | Un único resultado por ID de operación |
| Se elimina el gol candidato antes de responder | Revalidar; no vincular a un evento anulado ni mostrar un éxito engañoso |

Un gol repetido manual→manual no satisface por sí solo esta regla. El doble toque técnico se bloquea; dos registros manuales separados se mantienen y se corrigen si procede. Esto evita ampliar el detector a una regla deportiva que el sistema no puede conocer.

## 12. Corrección visible y accesible: ACT-09

Botón persistente **«Corregir»**. No exigir que el delegado deduzca que «Jugadas» contiene la edición. Abrir una pantalla/panel amplio titulado **«Corregir una jugada»**, con últimas jugadas primero y filtros por cuarto, equipo y gorro. No sustituir el resumen principal por la última acción: el tablero mantiene su prioridad.

Cada entrada muestra cuarto, equipo, gorro/nombre, acción en lenguaje corriente y marcador resultante cuando sea fiable. Las jugadas vinculadas se presentan juntas: «Penalti rival #8 → Gol de #7», «Gol de #7 · asistencia de #4».

Al elegir una entrada:

- **Cambiar jugador**: gorros grandes y nombres.
- **Cambiar acción**: solo alternativas compatibles; cambiar familia requiere resolver relaciones.
- **Cambiar cuarto**: selector claro sin inventar minuto.
- **Cambiar portero**: para goles rivales/paradas según el tipo.
- **Asistencia / lanzamiento asociado**: corregir o desvincular explícitamente.
- **Anular**: acción separada, con descripción del efecto antes de confirmar.
- **Guardar corrección** y **Volver sin guardar** siempre localizables.

Cambiar entre Morvedre y Rival no puede conservar una acción inválida para el nuevo equipo. Si se necesita esa corrección, seleccionar un tipo válido y mostrar su efecto.

No borrar definitivamente eventos: conservar anulación y trazabilidad mínima. La edición recalcula marcador, parciales, sanciones, porteros, porcentajes y PDF a partir de las mismas fuentes.

### Relaciones delicadas

- Anular un gol asistido: resolver conjuntamente la asistencia vinculada.
- Anular una sanción rival no debe borrar automáticamente el lanzamiento: pudo ser un error de atribución. Ofrecer «Solo la sanción» o «Sanción y lanzamiento», con diferencias de marcador visibles.
- Cambiar gol de penalti a fallo: un mismo intento cambia de resultado; no duplicar un tiro.
- Cambiar la sanción a otro gorro conserva el vínculo con el lanzamiento.
- Mover un conjunto vinculado a otro cuarto propone moverlo completo. No aceptar vínculos incompatibles a escondidas.
- «Deshacer» revierte la operación elegida, no todas las acciones consecutivas. No hace falta convertirlo en un contador de última acción en el tablero.
- La corrección en el acta cerrada mantiene las restricciones actuales de validación. No añadir reapertura general para delegados sin una decisión explícita. Antes del cierre, ofrecer revisión accesible; después, explicar la vía de corrección autorizada existente.

## 13. Expulsiones: ACT-10

| Sanciones personales | Fila completa | Texto/indicador |
| --- | --- | --- |
| 0 | Fondo neutro | `0/3` y tres casillas vacías |
| 1 | Amarillo muy suave | `1/3` y una casilla marcada |
| 2 | Naranja suave más perceptible | `2/3 · En riesgo` y dos casillas |
| 3 | Rojo reconocible | `3/3 · Fuera` y tres casillas |
| Roja con menos de tres | Mismo estado rojo de fuera | Número real de sanciones + `Roja · Fuera` |

Aplicar al tablero de ambos equipos y al selector de jugadores, incluidos porteros. Los fondos de celdas interiores no deben tapar el estado de la fila. Mantener buen contraste de nombres y cifras y una selección visible que no se confunda con amarilla/roja.

Una amarilla como tarjeta no modifica el conteo de expulsiones ni convierte por sí misma la fila en el estado de una sanción personal. Usar distintivo de tarjeta separado. La escala propuesta interpreta el comentario sobre las dos expulsiones como **naranja claramente diferenciado del amarillo de una**.

No aumentar de tres a cuatro. Para una sanción nueva de alguien fuera, indicar el problema y abrir corrección si se eligió el gorro equivocado. Para una anotación histórica permitir la revisión, sin sortear el máximo válido de sanciones.

## 14. Máximo de jugadores: ACT-11

### Morvedre

**14 convocados activos como máximo**, según el requisito del club en esta conversación. No se presenta como una verificación del reglamento federativo de todas las temporadas.

- Unificar constante y validación en propuesta automática, alta individual, importación, cambio de estado y preparación del acta.
- «Proponer equipo» completa hasta 14 plazas, descontando los activos existentes, y no vuelve a proponer jugadores ya presentes.
- Contar `called` y `confirmed` como plazas activas. Rechazados, retirados o ausentes no ocupan una plaza activa, pero se conserva su historial. Reactivar exige plaza y gorro disponibles.
- Verificación cliente para guiar y servidor/BD para impedir que dos dispositivos acepten a la vez al jugador 15. Bloqueo por partido y operación transaccional.
- 14 jugadores no significa gorros obligatoriamente 1–14: identidad del jugador y número de gorro son conceptos distintos. Mantener números válidos y únicos.
- Convocatorias antiguas de 18: no eliminar cuatro automáticamente. Antes de empezar, pedir seleccionar los 14 definitivos, manteniendo los demás como histórico no activo.
- Actas antiguas ya iniciadas/cerradas con más de 14 deben seguir siendo legibles/exportables. Resolver su compatibilidad antes de imponer un esquema que las rechace. Nunca perder eventos ni impedir recuperar pendientes por introducir el nuevo límite.
- Mantener coherencia con el bloqueo actual de cambios de gorro/convocatoria cuando hay acta preparada: no crear una vía lateral que invalide su lista de jugadores.

### Rival

Generar **14 gorros por defecto**. Antes de iniciar, selector fácil `− / 14 / +` y edición de números, permitiendo menos o más. Propuesta técnica: conservar el techo de 30 entradas y números 1–99 que ya admite el documento; ese techo de protección no es una norma deportiva.

Durante el partido se puede añadir un gorro olvidado desde una opción clara de plantilla rival. Quitar un gorro solo si no tiene eventos; si los tiene, corregirlos/reasignarlos primero. No reducir una lista reconstruyendo 1…N y perdiendo números no consecutivos o estadísticas. Mantener unicidad también aquí.

## 15. Estadísticas y fórmulas compartidas

Un único cálculo de dominio alimenta tablero, editor, informe y cualquier proyección. No mantener contadores paralelos de goles, tiros y paradas que puedan divergir.

| Dato | Cálculo / interpretación |
| --- | --- |
| Goles Morvedre | Normal + superioridad + penalti + goles previos sin tipificar |
| Tiros registrados | Goles + fuera/palo + bloqueados + córner + penaltis fallados + tipos históricos de fallo, una vez por intento |
| Tiros fallados | Tiros − goles; los goles nunca cuentan como fallados |
| Eficacia de lanzamiento | Goles / tiros × 100, con numerador y denominador visibles |
| Goles en superioridad | Conteo de `goal_extra` |
| Proporción de goles en superioridad | Goles en superioridad / goles con tipo conocido × 100; rotular la base y advertir si hay goles previos sin detalle |
| Eficacia en penaltis | Goles de penalti / (goles de penalti + penaltis fallados) × 100 |
| Asistencias | Asistencias activas vinculadas + manuales independientes, sin duplicarlas por su relación |
| Sanciones personales | Expulsiones ordinarias + penaltis cometidos; mostrar desglose y total |
| Paradas | Paradas normales + penaltis parados, contando cada uno una vez |
| Recibidos a puerta del portero | Paradas + goles encajados atribuidos |
| Porcentaje de paradas | Paradas / recibidos a puerta × 100 |
| Tiempos muertos | Conteo por equipo y cuarto, pedidos acumulados |
| Comparación de expulsiones | Total de sanciones personales Morvedre/rival y desglose de penaltis cometidos |

Denominador cero → `—` y «Sin intentos registrados», no `NaN`, infinito ni un 0 % que parezca una actuación medida. Para totales conjuntos de porteros sumar numeradores y denominadores; no promediar porcentajes individuales.

**Calidad de los datos:** si hay totales previos del modo sencillo, estadísticas incompletas o acciones sin detalle, conservarlos y rotular el análisis como registro parcial. Los tiros que derivan de goles previos son un mínimo conocido; no presentar una eficacia global fiable al faltar fallos anteriores. Mostrar `— / Sin datos completos` para esa métrica o un porcentaje explícitamente restringido a jugadas detalladas.

No calcular eficacia de tiro rival: solo se registra su gol/sanción y las paradas de nuestros porteros, no todos sus tiros. No confundir sanciones de penalti con lanzamientos: una sanción pendiente puede no tener resultado anotado. No calcular porcentaje de penaltis parados si no se identifican todos los penaltis rivales recibidos; sí mostrar su conteo.

Si el marcador rival incluye goles previos sin portero atribuido, el informe indica cuántos carecen de ese detalle. No cargarlos al portero que aparece seleccionado ahora ni crear un jugador ficticio. Los encajados por portero sumarán el subtotal atribuible, con esa diferencia explicada.

## 16. PDF: ACT-12

### 16.1 Identidad y contenido común

Documento deportivo del club, legible e imprimible, sin fingir que sustituye al acta arbitral oficial. Encabezado: equipo/categoría Morvedre, nombre real del rival, fecha, competición y local/visitante si existen en el partido. No inventar piscina, árbitros ni datos que no se hayan registrado.

Mostrar resultado grande con nombres correctos, estado Final/Provisional, generación y revisión del acta. Un partido cerrado con cambios sin sincronizar sigue teniendo exportación provisional respecto al servidor. Mostrar «Incluye cambios guardados en este móvil» cuando proceda.

No incluir teléfono, correo, identificadores internos de usuario/dispositivo ni notas privadas. Usar el mismo snapshot de datos para todas las páginas; no mezclar revisiones si entra una sincronización mientras se genera.

### 16.2 Primera página: A4 horizontal, resumen de mesa

Propuesta de distribución, con márgenes de 10–12 mm:

1. **Cabecera compacta**: partido y resultado grande, metadatos secundarios.
2. **Tabla principal de Morvedre**, 14 jugadores como máximo en actas nuevas, ordenados por gorro, porteros incluidos para conservar todas sus acciones ofensivas.
3. **Fila de totales**, con todos los campos aditivos.
4. **Franja inferior con tablas independientes** de parciales, portería y banquillos.
5. Leyenda corta de abreviaturas y aviso de datos parciales si corresponde.

Columnas propuestas, con encabezados agrupados:

| Grupo | Columnas |
| --- | --- |
| Identidad | Gorro, jugador |
| Goles | Total, normal, 1+, penalti |
| Tiros | Total, fuera/palo, bloqueados, a córner, penalti fallado |
| Juego | Asistencias |
| Sanciones | Personales total, de ellas penalti, amarillas, rojas |

El total de goles puede superar el desglose si hay goles previos sin tipo: señalar «Incluye N goles previos sin detalle» y no asignarlos a normal. Mantener un resumen legible del tipo histórico parada rival en nota o detalle, sin perderlo en el total de tiros.

Tipografía objetivo 9,5–11 pt en celdas, nombres con espacio suficiente y encabezados a dos niveles; cifras alineadas. No reducir toda la tabla para que quepa un nombre excepcional: partir nombre en dos líneas o utilizar nombre corto no ambiguo y consignar el completo en detalle.

Tablas inferiores:

- **Parciales**: cuarto, goles de ambos y acumulado. Diferenciar cuartos no jugados de un 0–0 jugado. Totales previos sin cuarto en renglón independiente.
- **Portería**: gorro/nombre, paradas, penaltis parados, encajados, recibidos a puerta y porcentaje.
- **Banquillos**: tiempos muertos pedidos de ambos y tarjetas de entrenadores.

No intentar colocar otra tabla completa de 14 rivales en esta página a costa de hacer ilegible la principal. La primera página sí identifica resultado y totales rivales; su detalle individual va en la siguiente sección vertical. Para actas históricas con más jugadores, permitir continuación explícita; nunca recortar filas.

### 16.3 Páginas verticales de análisis

Después de la hoja horizontal, todas las páginas A4 verticales. Distribución objetivo:

- Página 2: eficacia de Morvedre con fracciones, distribución de goles y resultados de tiro; barras comparativas de sanciones y tiempos muertos; evolución del marcador al final de cada cuarto.
- Detalle rival en una tabla con gorro, goles, sanciones personales y penaltis cometidos. Si no cabe con buena lectura, usar otra página vertical.
- Goleadores destacados de ambos equipos y contribución de nuestros porteros, usando cifras registradas y sin valoración subjetiva de rendimiento.

Gráficos de barras y evolución por cuartos con etiquetas directas, escalas honestas y valores escritos. Evitar gráficos 3D, radar decorativo y gráficos circulares con demasiadas porciones. En goles, categorías mutuamente excluyentes; en sanciones, no apilar total y subtipos como si fueran independientes.

Usar leyendas «Fuera/palo registrado» y «Bloqueado, portero o defensor». Omitir gráficas de tiros dentro/fuera exactos, eficacia de superioridades o paradas de penaltis si los datos no permiten calcularlas. La ausencia de dato no se dibuja como cero.

### 16.4 Relato por cuartos en vertical

Título **«Desarrollo del partido por cuartos»**, aunque coloquialmente se pida «minuto a minuto». No imprimir minutos ficticios ni usar la hora del móvil como minuto de juego.

- Orden de registro dentro del cuarto, con indicación «Secuencia de anotación; sin tiempos de juego».
- Cabecera de cada cuarto con parcial y acumulado.
- Gol: gorro/nombre, tipo y marcador tras el gol. Asistencia vinculada en la misma entrada.
- Penalti: sanción rival y lanzamiento vinculados se muestran como una jugada compuesta cuando corresponda.
- Paradas, tiros, sanciones, tiempos muertos y tarjetas con textos breves y símbolos acompañados de palabras.
- Registros tardíos/corregidos no deben aparentar una cronología exacta. Conservar orden estable y señalar «Anotada después» cuando se disponga de esa marca.
- Anuladas excluidas de estadísticas y relato deportivo; trazabilidad técnica aparte, no ruido en el PDF habitual.
- Cabeceras y columnas se repiten al paginar; nunca separar título de cuarto y su primera jugada, ni cortar una fila por la mitad.

### 16.5 Exportación y validación visual

Conservar jsPDF si resuelve orientación mixta, tablas, fuentes y gráficos adecuadamente. Evaluar ayuda de tablas solo si hace falta; no introducir dependencias por decoración. Cargar la generación al solicitar el informe, conservar compatibilidad offline del acta preparada y evitar recalcular un PDF pesado en cada gol.

Nombre de archivo descriptivo y saneado: fecha, equipo y rival. Compartir archivo mediante Web Share cuando exista; descargar cuando no. Cancelar el menú de compartir no es un error deportivo ni altera el acta. El PDF guardado es una copia de esa revisión; las correcciones posteriores requieren regenerarlo.

Ensayo con PDF renderizado a imágenes, no solo extracción de texto: primera página horizontal, resto vertical, cero solapamientos/cortes, totales reconciliados, nombres largos, tildes y caracteres válidos. Revisar impresión en blanco y negro y lectura en móvil. La generación nunca marca el partido como terminado.

## 17. Modelo de datos y compatibilidad

### Evolución propuesta

- Nueva versión del documento del acta que admita asistencia, tiro a córner y penalti rival. Mantener lectura de versión 1.
- Metadatos mínimos para relaciones: ID estable del evento, ID de operación/flujo, origen del lanzamiento y referencias de asistencia→gol y lanzamiento→sanción. Nombres definitivos al implementar.
- Contexto de continuación persistido para gol guardado pendiente de asistencia y sanción guardada pendiente de lanzamiento. No contar ese contexto como estadística.
- Relaciones validadas: mismo partido, equipos y tipos correctos, jugador existente, un resultado activo por lanzamiento, una asistencia vinculada por gol y referencias no anuladas.
- Orden de registro estable; datos técnicos de creación/corrección si hacen falta para trazabilidad. No convertirlos en reloj de partido.
- Guardado de una edición compuesta en una sola operación local y una mutación de sincronización. La sanción y su resultado opcional se guardan en pasos distintos deliberadamente, para conservar la sanción al omitir el tiro.
- Eventos conservados como fuente de verdad. Datos derivados de asistencia/tiros deben quedar disponibles para consultas del partido mediante un resumen validado, sin exponer el documento privado a roles no autorizados.
- Evaluar si se amplía una proyección de estadísticas o se añade una consulta de resumen; no cambiar rankings ni su puntuación con asistencias sin un requisito aparte.

### Actualización sin pérdida de datos

1. Servidor capaz de leer versiones antigua y nueva; validación específica por versión.
2. Migración pura v1→v2 que conserve IDs, goles, tiros históricos, sanciones, baseline, portero, cuarto y revisión.
3. Copia de recuperación local antes de transformar un documento con pendientes. No limpiar IndexedDB ni forzar cerrar sesión como método de actualización.
4. No reemplazar un documento remoto v2 por una versión v1 de un móvil antiguo. Responder con actualización necesaria, conservando el borrador de ese móvil.
5. Despliegue compatible con caché PWA anterior y migración de IndexedDB probada con pendientes y sin red.
6. Esquemas Zod, Server Actions y comprobaciones SQL/RLS alineados. Toda escritura mantiene autorización de delegado; el relevo no concede permisos a quien no los tenía.
7. Plan de vuelta atrás que mantenga legibles los documentos nuevos. No volver a una versión que descarte sus campos silenciosamente.

Antes de implementar, consultar las guías locales de la versión instalada de Next.js y la documentación/changelog vigente de Supabase. Las migraciones se preparan y ensayan con datos sintéticos y rollback antes de aplicarse; este documento no acredita el estado del esquema remoto ni autoriza por sí solo su despliegue.

### Lugares previstos de trabajo

| Área | Archivos / componentes actuales |
| --- | --- |
| Dominio y fórmulas | `lib/domain/live-match.ts`; extraer cálculos y relaciones si crece demasiado |
| Flujo de registro | `components/matches/live-match-client.tsx`; dividir paneles de asistencia, penalti y corrección con estados explícitos |
| Resumen y diseño | `acta-player-board.tsx`, `acta-scoreboard.tsx`, `live-match.module.css` |
| Persistencia / relevo | `use-live-match.ts`, `lib/pwa/live-match-store.ts`, `lib/utils/uuid.ts` |
| Servidor y permisos | `server/actions/live-match.ts`, migraciones nuevas, `types/database.ts` si cambia la proyección |
| Convocatorias | `lib/domain/callups.ts`, esquemas de admin, acciones, propuesta y edición individual |
| Informe | `lib/domain/acta-pdf.ts`; separar modelo de informe y maquetación |
| Verificación | Tests de dominio/sincronización/entrada, SQL de acta y scripts de ensayo con datos sintéticos |

Aplicar skills de diseño y accesibilidad a la tarea deportiva, sin añadir secciones decorativas para cumplir cuotas de una plantilla. La facilidad validada por el delegado prevalece sobre la novedad visual. En la ejecución medir rótulos críticos a distintos anchos, incluyendo la herramienta de medición de texto ya disponible si aporta una comprobación útil.

## 18. Ejecución por fases, después de autorización

| Fase | Trabajo | Condición de salida |
| --- | --- | --- |
| 0 | Revisar este plan y confirmar propuestas de §20; registrar estado del arreglo de convocatoria aparcado | Alcance aceptado y cambios anteriores identificados |
| 1 | Reproducción y corrección del relevo, compatibilidad UUID y recuperación | Prueba roja→verde del síntoma y ensayo de dos dispositivos; pendientes conservados |
| 2 | Modelo v2, relaciones, cálculos, migración y tope 14 transaccional | Pruebas de dominio/SQL y compatibilidad con actas existentes |
| 3 | Flujos asistencia, penalti, simplificación de tiros y duplicados | Cada secuencia de §11 cuenta correctamente online/offline |
| 4 | Portería visible, tiempos pedidos, corrección y colores de fila; pulido de paneles | Recorridos accesibles en tamaños objetivo sin ocultar acciones esenciales |
| 5 | Informe horizontal/vertical y métricas disponibles | PDF visualmente revisado y todos sus totales reconciliados con el acta |
| 6 | Ensayo integrado, móvil real y nueva prueba con el padre | Criterios de §19 cumplidos, evidencias registradas y guía actualizada |

Diseñar componentes de portería y corrección durante las fases 2–3 para comprobar que los nuevos datos tienen una presentación viable. No dejar el diseño para cuando ya sea caro cambiar los flujos.

## 19. Matriz de aceptación y pruebas

### Integridad deportiva

- [ ] Gol normal/superioridad/penalti suma un gol y un tiro, nunca fallo.
- [ ] Asistencia manual se añade con un botón, no aparece como columna en directo y sí en PDF.
- [ ] Gol se conserva al omitir asistencia, cerrar el panel, perder red o recargar.
- [ ] No hay autoasistencia ni doble asistencia vinculada al mismo gol.
- [ ] Un córner y un penalti fallado no suman dos tiros por el mismo lanzamiento.
- [ ] Penalti rival suma una sanción; omitir o cambiar lanzador no la repite.
- [ ] Todos los casos de la tabla de §11 pasan, también con reintentos y cambios de lanzador.
- [ ] Penalti fallado → nuevo penalti → gol produce dos tiros y un gol.
- [ ] Portero cambiado recibe únicamente registros posteriores; corrección reasigna el evento elegido.
- [ ] Penalti parado suma una parada; porcentaje conjunto calculado con sumas.
- [ ] Una/dos/tres sanciones colorean toda la fila; roja con una sanción muestra fuera sin inventar tres.
- [ ] Tiempos muertos indican pedidos y no aplican un máximo.
- [ ] Correcciones de eventos vinculados dejan marcador, parciales y resumen coherentes.

### Convocatoria y compatibilidad

- [ ] Alta del jugador 14 permitida; jugador 15 activo rechazado en UI, servidor y concurrencia de BD.
- [ ] Reactivación y propuesta automática respetan plazas y gorros únicos.
- [ ] Rival nuevo tiene 14; permite 10, 16 y números no consecutivos sin perder eventos.
- [ ] Acta histórica con 18 sigue consultable; no se trunca al migrar ni al exportar.
- [ ] v1 con `shot_saved`, baseline y pendientes conserva todos sus datos en v2.
- [ ] Cliente antiguo no sobrescribe campos nuevos; versión incompatible tiene recuperación clara.

### Relevo, almacenamiento y permisos

- [ ] Recorrido real con `randomUUID` ausente, no solo test aislado del helper.
- [ ] Dos contextos/dispositivos: segundo toma el control, primero no sobrescribe.
- [ ] Relevo simultáneo y respuesta perdida sin duplicaciones ni cambios de marcador.
- [ ] Cambio pendiente en primer móvil se conserva y puede revisarse; no se da por sincronizado.
- [ ] Escritura fallida de IndexedDB no produce mensaje de jugada guardada.
- [ ] Continuaciones guardadas sobreviven recarga, cierre de pestaña y pérdida de red.
- [ ] No delegados no pueden leer/escribir acta ni tomar relevo mediante llamada directa.
- [ ] Un delegado de otro equipo tampoco; acta validada conserva sus restricciones.

### Usabilidad y accesibilidad

- [ ] A 320 px y con letra grande se ven marcador, portero actual, contadores pedidos y acciones sin texto ilegible.
- [ ] «Cambiar portero» y «Corregir» se encuentran sin abrir jugadores ni recorrer todo el acta.
- [ ] Tiempos y porteros no requieren interpretar números sin etiqueta.
- [ ] Campos y acciones ≥48 × 48 px; foco visible; controles no cubiertos por paneles/barras.
- [ ] Contraste medido en estados 0/1/2/3 sanciones, selección, disabled y error.
- [ ] Color no es el único indicador; pruebas de teclado, lector de pantalla y movimiento reducido.
- [ ] Nombres repetidos o largos no confunden al seleccionar; gorro y nombre completo disponibles.
- [ ] Secuencia rápida de jugadas no pierde pulsaciones aceptadas ni mantiene paneles anteriores por respuestas tardías.

### PDF

- [ ] Primera página horizontal, siguientes verticales; sin cortes, filas perdidas o fuente demasiado pequeña.
- [ ] Suma de goles individuales = marcador Morvedre; rival conciliado con sus eventos y baseline.
- [ ] Parciales + goles previos sin cuarto = global; cuartos no jugados no parecen empates jugados.
- [ ] Tiros = goles + fallos, y goles normal/1+/penalti no duplicados en sus gráficos.
- [ ] Asistencias, penaltis, porteros, tiempos y tarjetas representados; anulación y corrección reflejadas.
- [ ] Datos ausentes no se convierten en cero; ninguna métrica afirma precisión que no existe.
- [ ] Fixture de 0–0, 14 jugadores, 6 cuartos, muchos eventos, nombres largos, baseline y acta provisional.
- [ ] Exportación offline y compartir/descargar sin mutar el partido; revisión visual renderizada y blanco/negro.

### Prueba con el padre y otro delegado

Sin explicación previa de navegación, pedir: abrir el partido, registrar gol con y sin asistencia, cambiar portero, anotar parada, pedir tiempo muerto, corregir gorro y resolver un penalti duplicado. Observar dónde se detienen y qué interpretan de los contadores.

Objetivo: identificar portero/tiempos y acceso a corrección en unos cinco segundos; completar acciones habituales sin ayuda, errores de conteo ni necesidad de leer instrucciones largas. Medir tiempos como evidencia orientativa, no como una promesa universal. Preguntar específicamente «¿Cuántos tiempos han pedido?» y «¿Quién está en portería?».

Un build o una suite unitaria verde no sustituye esa prueba, las pruebas de dos dispositivos ni la revisión visual del PDF.

## 20. Decisiones propuestas para revisar antes de ejecutar

Estos puntos están resueltos como propuesta para no bloquear la planificación; no se consideran nuevas instrucciones ya confirmadas del usuario.

| Punto | Propuesta recomendada | Motivo |
| --- | --- | --- |
| Córner ofensivo | Incluir «Tiro a córner» como resultado excluyente, sin sumar otro bloqueo | Aporta información con una sola pulsación adicional de elección, no una pregunta extra |
| Tiros entre palos | No publicar el porcentaje exacto con el registro simplificado | Bloqueado mezcla portero/defensor y fallos de penalti no distinguen trayectoria |
| Portería en resumen | Bloque visible con paradas/encajados/sanciones y franja de portero actual | Evita cifras bajo cabeceras incorrectas y la búsqueda al final de la lista |
| Asistencia manual | Alta directa independiente; vínculo opcional desde Corregir | Respeta «sin opciones» y permite anotarla tarde |
| Rival | 14 por defecto, hasta 30 entradas editables dentro del límite técnico actual | Flexibilidad pedida sin confundirla con el máximo de Morvedre |
| PDF primera hoja | Tabla completa Morvedre y resúmenes abajo; tabla rival en vertical después | Mantener lectura con 14 jugadores y todas las columnas |
| Acta cerrada | Mantener autorización actual de corrección validada | Facilitar edición no debe eliminar silenciosamente la protección del cierre |

No hacen falta más respuestas para conservar el plan. Antes de ejecutar, Rubén puede aceptar estas propuestas o indicar cambios; no iniciar implementación solo por haber redactado el documento.

## 21. Fuentes y criterios utilizados

Consulta el 8 de septiembre de 2026. Las reglas deportivas proceden de Rubén; no se ha realizado una auditoría del reglamento federativo.

- [MDN: Crypto.randomUUID](https://developer.mozilla.org/en-US/docs/Web/API/Crypto/randomUUID): disponibilidad en contexto seguro; base para el ensayo de compatibilidad, no prueba del dispositivo concreto.
- [MDN: Crypto.getRandomValues](https://developer.mozilla.org/en-US/docs/Web/API/Crypto/getRandomValues): alternativa de bytes aleatorios para generar UUID cuando no existe `randomUUID`.
- [W3C: contraste mínimo](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html): ratios de referencia para texto.
- [W3C: tamaño de objetivo ampliado](https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced.html): referencia de 44 CSS px; el proyecto adopta 48.
- [W3C: reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html): adaptación y lectura con ampliación.
- [W3C: uso del color](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html): estados acompañados de texto/cifras, no solo color.
- [Vercel Web Interface Guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md): semántica, foco, formularios, paneles, feedback y áreas seguras.
- Skills consultadas: `redesign`, `mobile-first-design`, `web-design-guidelines`, `diagnosing-bugs`, `pdf` y `supabase`. Aplicadas aquí a análisis y criterios de ejecución; no acreditan pruebas funcionales ni un PDF generado.

## 22. Estado de entrega

- [x] Comentarios del usuario convertidos en requisitos trazables ACT-01 a ACT-13.
- [x] Código actual inspeccionado para identificar puntos afectados y compatibilidad.
- [x] Flujos, casos límite, fórmulas, diseño de PDF y pruebas definidos.
- [x] Decisiones propuestas diferenciadas de requisitos confirmados.
- [x] Orden del usuario para implementar.
- [x] Fases 1–5 implementadas y verificadas localmente.
- [x] Ensayo responsive automatizado a 320, 360, 390, 430, 768 px y 844 × 390, incluido texto al 200 %.
- [x] PDF de tres páginas renderizado y revisado visualmente.
- [ ] Aplicar y ensayar la migración en Supabase remoto.
- [ ] Ejecutar el recorrido integral contra la base remota con dos dispositivos/contextos.
- [ ] Repetir la prueba sin ayuda con el padre de Rubén y otro delegado.

La revisión automática de permisos rechazó el acceso externo necesario para `supabase db push --dry-run` al haberse alcanzado el límite de uso de Codex. La migración queda preparada en `20260908182336_enforce_fourteen_player_callups.sql`, pero no consta aplicada al entorno remoto.

## 23. Evidencia de implementación local

| Área | Resultado implementado | Evidencia local |
| --- | --- | --- |
| Relevo | UUID v4 con Web Crypto compatible y reintento idempotente cuando se pierde la respuesta | Pruebas de relevo sin `randomUUID`, respuesta perdida y pendiente local |
| Registro | Asistencia manual y tras gol; tiros simplificados; penalti rival con lanzador, resultado y aviso de duplicado | Pruebas de dominio y componente; continuaciones persistidas |
| Portería | Portero actual siempre visible, estadísticas propias, cambio directo y bloqueo de goles rivales sin portero válido | Prueba de interfaz y auditoría visual |
| Resumen | Filas completas con estados de 1, 2, 3 sanciones o roja; textos y cifras además del color | Prueba de accesibilidad semántica y capturas responsive |
| Banquillos | Contadores rotulados como tiempos pedidos y tarjetas de entrenador dentro del mismo acceso | Prueba de componente |
| Plantillas | Máximo local de 14 propios, 14 rivales por defecto y números rivales editables | Pruebas de convocatoria y entrada; trigger SQL preparado |
| Persistencia | Guardado local antes de confirmar, continuación tras recarga y protección de relevo pendiente | Pruebas del hook y de IndexedDB |
| Informe | Resumen horizontal, análisis y secuencia por cuartos en vertical | PDF renderizado a tres imágenes sin cortes ni solapamientos |
| Adaptación | Sin desbordamiento horizontal y controles de al menos 48 px en seis viewports; reflujo al 200 % | Script local de Playwright |

Los ensayos locales específicos del acta pasan. TypeScript también pasa. La validación remota y la prueba de uso con personas siguen siendo condiciones de cierre operativo.
