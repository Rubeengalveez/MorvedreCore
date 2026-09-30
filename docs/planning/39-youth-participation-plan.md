# Participación y descanso por cuartos en el acta

Fecha: 30 de septiembre de 2026.

**Estado: aprobada por Rubén e implementada el 30 de septiembre de 2026 en `codex/youth-participation`. Migración aplicada y verificaciones de código, base de datos y navegador completadas. Aplicación sin publicar.**

## 1. Punto de retorno

El estado del código anterior a esta función se ha guardado y subido a GitHub:

- Rama: `codex/backup-before-youth-rotation-2026-09-30`.
- Commit: `d30f7fb85f6db70f5b17ff32e68b114a27b710b7`.
- [Respaldo en GitHub](https://github.com/Rubeengalveez/MorvedreCore/tree/codex/backup-before-youth-rotation-2026-09-30).
- Incluye los cambios actuales del acta, la corrección de convocatoria, las mejoras visuales y la migración de correcciones de jugadores. Los archivos de configuración privados y los datos de IndexedDB no forman parte de este respaldo del código.

La planificación se escribe después del respaldo, de forma que el commit identifica el estado previo exacto. No se han aplicado nuevas migraciones ni modificado datos de partidos durante esta planificación.

## 2. Objetivo y criterio de diseño

Registrar quién participa en cada uno de los cuatro primeros cuartos, en Morvedre y en el rival. Ayudar al delegado a comprobar que todos juegan y descansan, sin llenar la pantalla del partido de avisos ni exigir conocimientos del reglamento.

La propuesta es una selección guiada de dos pasos al empezar cada cuarto: **Morvedre → Rival → Listo, empezar cuarto**. El portero se elige en una zona propia, separado de los jugadores de campo. Se reutilizan los estilos, controles y animaciones aprobados del acta.

Desde el quinto cuarto desaparecen los indicadores de participación de las fichas y la selección obligatoria de jugadores de campo. El historial sigue guardado para corregir errores y revisar el acta. La excepción infantil de descanso en el quinto conserva su aviso específico.

## 3. Normativa de referencia y categorías

Referencia acordada para el desarrollo: documentación aportada por Rubén, temporada 2025–2026. Se han contrastado los PDF oficiales de [Alevín](https://www.fncv.es/archivos/waterpolo/normativas_reglamento/cas/Normativa%20alev%C3%ADn%2025-26.pdf) e [Infantil](https://www.fncv.es/archivos/waterpolo/normativas_reglamento/cas/Normativa%20infantil%2025-26.pdf), publicados en el [índice FNCV](https://www.fncv.es/waterpolo-normativas). No se presupone una normativa nueva de 2026–2027.

| Categoría del partido      | Portero      | Jugadores de campo por equipo    | Cuartos de referencia | Control de participación         | Expulsiones personales para quedar fuera |
| -------------------------- | ------------ | -------------------------------- | --------------------- | -------------------------------- | ---------------------------------------- |
| Benjamín                   | 1            | 5                                | 6                     | 1.º–4.º                          | 4, según petición expresa de Rubén       |
| Alevín                     | 1            | 5                                | 6                     | 1.º–4.º                          | 3                                        |
| Infantil                   | 1            | 6                                | 6                     | 1.º–4.º                          | 3                                        |
| Escuela                    | 1            | 5, propuesta de formato Benjamín | 6, propuesta          | 1.º–4.º cuando exista un partido | 4, propuesta de formato Benjamín         |
| Cadete, Juvenil y Absoluto | Flujo actual | Flujo actual                     | Flujo actual          | Sin esta función                 | 3                                        |

Reglas compartidas de los primeros cuatro cuartos:

- Cada inscrito debe participar en al menos uno y como máximo tres: tiene que descansar al menos uno.
- El portero cuenta como participante del cuarto. Los gorros 1 y 13 son siempre porteros, según la decisión ya adoptada en la app; no aparecen entre los jugadores de campo.
- No hay sustituciones ordinarias durante esos cuartos. Un cambio entre el tercero y el cuarto sí forma parte de la nueva alineación inicial.
- Una expulsión temporal no constituye descanso ni añade otro participante por sí sola.
- El quinto y sexto permiten cambios libres, salvo un descanso obligatorio procedente de una excepción infantil.

### Decisiones aprobadas con este plan

1. **Escuela y Benjamín son categorías diferentes en la base de datos.** La propuesta incluye Benjamín porque se ha aportado su normativa y pedido cambiar sus expulsiones. Para Escuela se propone reutilizar el formato Benjamín cuando tenga un partido; esto no convierte automáticamente la Escuela en equipo de liga ni crea partidos nuevos. No existe una norma específica de Escuela en el texto aportado.
2. **Portero único en Benjamín/Escuela:** el documento aportado reconoce expresamente la excepción en Alevín e Infantil. El PDF Benjamín 2025–2026 no ha podido recuperarse; el [PDF oficial de 2024–2025](https://www.fncv.es/archivos/waterpolo/normativas_reglamento/cas/Normativa%20benjam%C3%ADn%2024-25------.pdf) incluye al portero en la rotación sin describir esa excepción. La propuesta no extiende automáticamente la excepción de Alevín/Infantil a Benjamín/Escuela. Si hace falta otro portero, se corrigen los gorros 1/13 en la convocatoria.

## 4. Preparación inicial

### Categoría fiable

Las reglas se resuelven desde `teams.category_code` del equipo del partido. No se deducen del nombre visible del equipo ni de la edad de un jugador que juega en una categoría superior. El acta preparada conserva categoría y versión de reglas para funcionar sin conexión.

En las categorías con este control, se propone el formato reglamentario de seis cuartos. Los formatos excepcionales de amistoso/torneo se seleccionan explícitamente antes de empezar y se identifica si el control reglamentario resulta aplicable; no se presenta como comprobada la rotación de cuatro cuartos en un encuentro que solo tiene dos. El selector habitual de categorías superiores conserva su comportamiento.

### Convocatoria rival real

Actualmente `opponentCaps` empieza con 1–14 y se ajusta quitando números consecutivos. Eso no permite saber, por ejemplo, que faltan el 8 y el 13.

En estas categorías se añade una selección inicial **Gorros del rival** con los números realmente inscritos, hasta 14. Se hace una vez y se conserva. No requiere nombres, cuentas ni jugadores nuevos en la base de datos del club. La rotación se calcula sobre esa lista, no sobre catorce jugadores supuestos.

La convocatoria de Morvedre sigue siendo la del partido. Antes de empezar se pueden corregir sus jugadores y gorros desde el editor existente. Si falta un portero o no hay suficientes jugadores para el formato, se indica qué hay que revisar. Una incidencia real de falta de jugadores se puede registrar sin falsificar la alineación.

## 5. Flujo al empezar los cuartos 1–4

1. **Empezar partido / Empezar cuarto** abre la selección del cuarto correspondiente.
2. **Morvedre:** portero arriba, jugadores de campo debajo. Seleccionar o quitar con un toque sobre toda la ficha. Contador directo: `5 de 5 jugadores` o `6 de 6 jugadores`.
3. **Continuar con Rival:** mismo patrón, con gorros en lugar de nombres. Se puede volver al paso anterior sin perder la selección.
4. **Listo, empezar cuarto:** valida ambas alineaciones y guarda localmente, en una sola operación, porteros, participantes y comienzo del cuarto.
5. Solo después de confirmar el guardado local se abre la anotación normal. El doble toque no crea dos comienzos ni dos registros.

Los jugadores de campo se eligen de nuevo en cada cuarto: no se da por confirmada una alineación por haber jugado el cuarto anterior. El portero único fijado expresamente sí puede mantenerse seleccionado. No se abre una cadena de confirmaciones después de cada jugador.

El botón final debe explicar el dato que falta si no se puede empezar: por ejemplo, `Elige 2 jugadores más del rival`. Los errores aparecen junto a la selección relevante. La normativa se resume solo cuando afecta a una decisión.

### Estilo y accesibilidad

- Lámina con cabecera azul oscuro y cuerpo blanco, siguiendo la estructura y animación del acta.
- Seleccionado: fondo azul oscuro, texto blanco y marca de selección. Libre: blanco con contorno oscuro. El color no es la única señal.
- Nombres legibles, gorro destacado y zonas táctiles de al menos 48 × 48 px.
- Controles de avance visibles, lista con desplazamiento interno y espacio suficiente para que ningún jugador quede oculto bajo el botón.
- Funcionamiento a 320 px, teclado, lector de pantalla y movimiento reducido. El foco vuelve al control que abrió la lámina.

## 6. Indicadores durante el partido

En cada ficha, de ambos equipos, se muestran pequeñas marcas de los cuartos realmente jugados: por ejemplo, **1 · 3**. Se colocan como información secundaria sin reemplazar goles, expulsiones ni nombres. El lector de pantalla anuncia `Ha jugado los cuartos 1 y 3`.

Durante la selección puede aparecer una indicación breve cuando ayuda: **Sin jugar** o **Debe descansar**. Se mantiene el orden por gorro para localizar jugadores con rapidez.

Al pasar al quinto desaparecen esas marcas de las fichas. No se borran los registros ni se interpreta que un jugador dejó de participar. Se puede abrir **Revisar participación** para consultar/corregir los primeros cuatro cuartos y ver el estado de ambos equipos. Al compartir el acta, se propone una tabla compacta de participación solo para estas categorías.

## 7. Comprobaciones y excepciones

### Comprobaciones normales

- Un participante solo cuenta una vez por cuarto, aunque tenga varias jugadas o cambie de gorro.
- Solo se seleccionan jugadores inscritos y disponibles; nunca duplicados entre portería y campo.
- Antes del cuarto 4 se destacan los que todavía no han jugado y los que ya llevan tres.
- También se comprueba antes si la selección deja más jugadores sin jugar que plazas disponibles en los cuartos restantes. No basta con descubrir el problema al finalizar el cuarto 4.
- La aplicación no confirma como reglamentaria una cuarta participación ordinaria. Ofrece revisar la selección; una incidencia excepcional debe identificarse y quedar registrada.
- Al finalizar el cuarto 4 se revisan participación mínima y descanso. Se muestran únicamente las incidencias, si existen.
- Se distingue siempre entre `Descansó` y `No consta la alineación`; un dato desconocido no se convierte en descanso.

El acta debe permitir registrar lo que ocurre realmente. Una incidencia o un error de alineación no puede impedir anotar un gol: se ofrece revisar la alineación y se conserva la jugada si el delegado necesita registrarla. Queda pendiente de revisión la discrepancia; no se inventa una sustitución para hacerla desaparecer.

### Portero único de Alevín/Infantil

Si solo hay un portero disponible, se permite elegir expresamente **Mantener este portero los cuatro primeros cuartos**. Esta decisión se conserva para ese equipo y partido, también para el rival. No se aplica automáticamente por tener un solo gorro de portero.

Si se elige mantenerlo, no se avisa de incumplimiento por su cuarta participación. Un cambio posterior durante el tramo controlado se registra como lesión, sanción o corrección de un dato equivocado, distinguiendo estos casos. Con dos porteros disponibles se aplica la rotación normal.

### Sustitución obligatoria en Infantil

Una tercera expulsión en los cuartos 1–4 puede obligar a registrar quién sustituye al jugador. Es una entrada al agua de alguien ya inscrito, distinta de reemplazar un nombre erróneo en la convocatoria.

- Se elige al sustituto en una lámina breve y se vincula la sustitución a la sanción.
- El expulsado y su sustituto cuentan como participantes de ese cuarto.
- Si el sustituto acaba participando en los cuatro primeros, queda registrado su descanso obligatorio en el quinto.
- Al empezar el quinto aparece solo ese aviso concreto. Las marcas generales desaparecen igualmente. Si se intenta atribuir una acción a ese jugador durante el quinto, se avisa y se permite corregir el dato o registrar una incidencia real; no se borra la acción.
- Anular/corregir la sanción o el sustituto recalcula la participación y el descanso pendiente.

Lesiones y otras sanciones definitivas se pueden documentar como incidencias reales. No se extrapola la excepción específica infantil a Alevín/Benjamín sin una norma confirmada. La app registra, orienta y deja constancia; no sustituye al árbitro.

## 8. Correcciones de alineación y de convocatoria

Desde **Revisar participación** se puede corregir un cuarto ya registrado. El diálogo diferencia **Corregir quién jugó** de una sustitución real permitida. Corregir no añade goles ni modifica automáticamente el autor de las jugadas.

Si una corrección afecta al portero al que se atribuyeron paradas o goles recibidos, se reutiliza la corrección de portero existente con su confirmación correspondiente. La participación y el portero del cuarto deben quedar coherentes.

Integración con la corrección de convocatoria ya implementada:

- Cambiar/intercambiar gorros conserva los cuartos jugados con el ID del jugador, igual que sus estadísticas. El rol de portero sigue dependiendo del gorro actual 1/13; se revisan las alineaciones afectadas sin perder su historial.
- Reemplazar a una persona convocada por error traslada también su participación, las referencias de portería y las incidencias vinculadas al jugador correcto, con la confirmación existente.
- Un jugador que participó ya tiene historial aunque tenga cero goles y cero expulsiones. No puede desaparecer silenciosamente de la convocatoria.
- Si se añadió un jugador erróneo que nunca participó y no tiene otros datos, se puede quitar normalmente.
- El estado temporal **Sin gorro** sigue disponible durante la edición, pero continúa impidiendo guardar la convocatoria.
- Modificar los inscritos del rival conserva los registros previos y pide resolver un gorro con historial antes de quitarlo.

La convocatoria por defecto no incluye alineaciones por cuarto, sanciones ni excepciones. Estas pertenecen exclusivamente al partido.

## 9. Datos, sincronización y compatibilidad

### Modelo propuesto

El documento del acta incorpora una nueva versión compatible con las versiones 1–3 existentes:

- Categoría, formato y versión de reglas del partido.
- Convocatoria rival confirmada.
- Alineación por cuarto y equipo: portero y jugadores de campo.
- Referencias por ID para Morvedre; identificador de gorro rival dentro del partido para el rival.
- Participantes efectivos adicionales por sustitución excepcional, con su motivo y vínculo a la sanción.
- Elección de portero único y descansos excepcionales pendientes.

Los totales de cuartos jugados y descansados se derivan de esos registros. No se almacenan contadores duplicados ni se infiere una alineación completa a partir de los goles.

La selección aún incompleta es un borrador local separado del documento confirmado. No se sincroniza como si el cuarto hubiera empezado. Su recuperación queda ligada al partido, cuarto y revisión para no reutilizar un borrador obsoleto después de un relevo o corrección.

### Sin conexión

- Categoría, reglas, inscritos, alineaciones, correcciones y excepciones están disponibles en el acta preparada en IndexedDB.
- Cada paso conserva su borrador. Al cerrar la app o recargar, se recupera la selección sin comenzar el cuarto a medias.
- **Listo** guarda el documento completo antes de dar acceso a la anotación.
- Se reutilizan la cola actual, revisión, identificador de mutación, control de dispositivo y reintentos. No se crea una segunda cola independiente.
- Una respuesta antigua de sincronización no puede sobrescribir selecciones o correcciones locales posteriores.
- Un relevo conserva las alineaciones e incidencias del documento confirmado. Los cambios no enviados del otro dispositivo siguen protegidos por el flujo actual de conflicto; no se fusionan silenciosamente.
- Una falta de espacio local muestra un error claro y no anuncia un cuarto guardado que no se pudo escribir.
- Abrir un partido nunca preparado requiere conexión, como hoy; la función nueva no añade conexiones obligatorias durante un acta ya preparada.

### Servidor y migración

Se amplía la validación Zod y se añade una migración nueva para la función SQL de guardado, sin modificar migraciones históricas. El servidor comprueba categoría contra el equipo real, participantes, estructura, versiones y límite de expulsiones: el cliente no puede autoconcederse reglas distintas.

Las mutaciones continúan en Server Actions y las tablas conservan RLS. Se revisan las protecciones de edición de convocatoria que hoy exigen versión 3 para que la nueva versión no rompa reemplazos, estadísticas ni relevos. Un desacuerdo normativo documentado se conserva como incidencia; un documento estructuralmente inválido se rechaza.

Las actas antiguas siguen siendo legibles. En actas ya empezadas no se inventan alineaciones de cuartos anteriores. Se permite completarlas manualmente, identificando los cuartos sin datos. Las comprobaciones que necesitan el historial completo no anuncian un cumplimiento ni una infracción concluyente mientras falte información. Las actas cerradas/validadas no se reescriben para añadir esta función.

## 10. Cuatro expulsiones en Benjamín

Crear una única regla de categoría utilizada por todos los controles. Cambiar solo el texto de la ficha sería insuficiente: el código y el SQL actuales limitan a tres en varios lugares.

Se actualizan de forma coordinada:

- Validación de acta y totales iniciales.
- Indicadores `0/4`, colores, etiquetas accesibles y estado **Fuera**.
- Registro y corrección de expulsiones y penaltis personales.
- Disponibilidad de porteros, jugadores y lanzadores en los flujos existentes.
- Estadísticas guardadas y validación SQL: cuarta permitida en Benjamín, tercera definitiva en las otras categorías; una roja sigue siendo definitiva.
- Exportaciones y cualquier texto que aún presuponga siempre tres.

## 11. Áreas de código previstas

| Área                                                                                     | Cambios previstos                                                                                    |
| ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `lib/domain/live-match.ts`                                                               | Versión, esquema y límites por categoría                                                             |
| Nuevo módulo de reglas y participación en `lib/domain/`                                  | Selección válida, participación derivada, descansos, excepciones y correcciones como funciones puras |
| `lib/domain/live-match-keepers.ts`                                                       | Inicio conjunto del cuarto y coherencia con participación/portero único                              |
| `lib/domain/live-match-identity.ts`, `live-match-roster.ts`, `live-match-roster-edit.ts` | Mantener participación con IDs, cambios de gorro y reemplazos                                        |
| `components/matches/live-match-client.tsx`                                               | Entradas al flujo, revisiones y sustitución excepcional                                              |
| Nuevos componentes pequeños en `components/matches/`                                     | Selector de alineación y revisión, reutilizando los patrones visuales actuales                       |
| `acta-player-board.tsx`, `acta-shootout.tsx`, controles de portero                       | Marcas discretas y límite de sanciones coherente                                                     |
| `components/matches/use-live-match.ts`, `lib/pwa/live-match-store.ts`                    | Borradores recuperables y conservación frente a sincronizaciones concurrentes                        |
| `server/actions/live-match.ts`                                                           | Preparar categoría/reglas y validar documentos                                                       |
| Nueva migración en `supabase/migrations/`                                                | Validación/guardado compatibles con la nueva versión y expulsiones                                   |
| `lib/domain/acta-pdf.ts`                                                                 | Revisión de límites y tabla breve de participación                                                   |
| `tests/unit/`, `tests/database/`, pruebas de navegador                                   | Reglas, integridad, migración y uso offline                                                          |
| `docs/guides/acta-en-directo.md`                                                         | Guía breve del nuevo flujo y excepciones                                                             |

## 12. Orden de ejecución tras aprobar

1. Aplicar las propuestas aprobadas de Escuela, Benjamín y formatos excepcionales descritas arriba.
2. Implementar reglas y modelo, con pruebas de dominio antes de conectar la interfaz.
3. Integrar la conservación de identidad y las correcciones de convocatoria.
4. Crear/probar la migración y la compatibilidad de documentos antiguos en entorno de prueba.
5. Implementar selección inicial, selección por cuarto y marcas de participación.
6. Integrar revisión, portero único, incidencias y sustitución infantil.
7. Completar recuperación offline, sincronización y exportación.
8. Verificar la matriz siguiente y mostrar el resultado local en el navegador integrado.

El respaldo y la implementación tendrán commits identificables. La aprobación autoriza esta implementación; la publicación de la aplicación se mantiene separada.

## 13. Ampliaciones aprobadas durante la implementación

- Avisos de ambos equipos al terminar el tercero y elegir el cuarto, con un resumen compacto y detalle consultable. Las fichas destacan quién debe jugar o descansar.
- Una cuarta participación ordinaria muestra una confirmación explícita y se registra como incidencia; no bloquea la anotación de lo que ocurre realmente.
- Elegir una acción para alguien no alineado pregunta si está jugando y permite revisar la selección antes de anotar. No se inventa el gol ni una sustitución.
- Asistentes y lanzadores de penalti se limitan a los participantes efectivos durante los cuatro primeros; desde el quinto recuperan el comportamiento habitual, respetando sanciones y descansos excepcionales.
- Las correcciones de portero de cuartos anteriores conservan el cuarto y portero actual y corrigen únicamente las intervenciones del tramo afectado, tras confirmación.
- Las sustituciones por lesión/sanción pueden corregirse o anularse desde la revisión, protegiendo las sustituciones posteriores que dependan de ellas.
- Los gorros rivales con jugadas o participación no desaparecen al revisar sus inscritos.

## 14. Verificación y criterios de aceptación

- [x] Benjamín/Alevín piden un portero y cinco jugadores de campo; Infantil, un portero y seis; ambos equipos.
- [x] Cadete/Juvenil/Absoluto mantienen su flujo habitual.
- [x] La selección del primer cuarto y los otros tres se completa sin salir del acta y sin confirmaciones por jugador.
- [x] La lista real rival admite gorros no consecutivos y no avisa sobre jugadores inexistentes.
- [x] Se detectan falta de participación, cuarta participación ordinaria y decisiones que impiden completar la rotación en cuartos posteriores.
- [x] Portero único confirmado en Alevín/Infantil no produce falsos incumplimientos; dos porteros sí rotan.
- [x] La expulsión temporal no se registra como descanso/sustitución.
- [x] La sustitución infantil conserva ambos participantes, permite su excepción y calcula el descanso del quinto. Corregir/anular recalcula.
- [x] Las marcas se ven en las fichas hasta el cuarto 4 y desaparecen al iniciar el 5 sin borrar el historial.
- [x] Un intercambio de gorros y un reemplazo de jugador preservan correctamente jugadas, participación y referencias de portería.
- [x] No se elimina silenciosamente a un jugador que jugó pero no tiene estadísticas.
- [x] Benjamín permite cuatro expulsiones; las otras categorías mantienen tres. Cliente y SQL coinciden.
- [x] Una alineación mal apuntada puede corregirse sin alterar goles ni impedir registrar el partido real.
- [x] Red desactivada en navegador: empezar cuartos, seleccionar ambos equipos, anotar y recuperar tras recarga. Corrección de convocatoria cubierta además por pruebas de sincronización.
- [x] Guardado completo sin duplicados, respuesta atrasada, fallo de red y relevo cubiertos por pruebas de sincronización y RPC; confirmación protegida frente a doble toque.
- [x] Documentos 1–3, actas empezadas sin alineaciones, y actas cerradas conservan compatibilidad en las pruebas de regresión.
- [x] Rechazo de escrituras no autorizadas, categoría manipulada y documentos inválidos en pruebas de base de datos.
- [x] 320/393 px: revisión visual, controles accesibles y pie visible; contenido largo con scroll interior.
- [x] TypeScript, lint relevante, pruebas de regresión y build correctos; aplicación compilada recargada en navegador integrado y recorridos offline en navegador aislado.

El resultado se considerará terminado cuando estos escenarios estén comprobados, no solo porque compile.

## 15. Cierre de ejecución

- Migración aplicada: `20260930002921_youth_participation.sql`.
- Vitest completo: 104 archivos aprobados, 935 pruebas aprobadas y 22 omitidas por condiciones de entorno.
- Playwright sobre compilación de producción: dos recorridos aprobados, incluyendo recargas sin red y avisos de ambos equipos en el cuarto 4.
- Verificación SQL del validador, guardado real, reintento y relevo mediante transacciones revertidas, junto con la suite de compatibilidad anterior.
- Guía del delegado actualizada en `docs/guides/acta-en-directo.md`.
- Alcance y evidencias detallados en `docs/audits/2026-09-30-youth-participation-verification.md`.
