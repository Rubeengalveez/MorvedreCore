# Tiempos de nado: flujo y diseño funcional

Fecha: 14 de septiembre de 2026. Estado: implementado en el repositorio y pendiente de validación presencial con entrenadores. Las decisiones de producto de este documento se adoptan con la flexibilidad otorgada por Rubén y pueden ajustarse tras probar el flujo.

## 1. Objetivo

Un entrenador puede registrar 50 m, 100 m o ambas distancias para varios jugadores sin entrar y salir de sus perfiles. Cada intento conserva jugador, fecha y salida; admite corrección y alimenta perfil, ranking de temporada y Leyendas.

La facilidad depende de etiquetas claras, estabilidad de pantalla, teclado adecuado y recuperación de errores, además del número de pulsaciones. La edad del entrenador orienta el caso de uso; la validación real será su capacidad de completar tareas sin ayuda.

## 2. Encaje con la aplicación actual

- `/team` muestra el directorio de equipos y la relación del usuario con ellos. Añadir un acceso «Añadir tiempos» junto a cada equipo que entrene el usuario, como enlace hermano del enlace al equipo; nunca anidar controles interactivos. Mantener el orden actual del directorio.
- `/team/[teamId]` abre Resumen y tiene Plantilla y Partidos. Añadir el mismo acceso visible bajo la cabecera, disponible en las tres pestañas, para no obligar a pasar por Plantilla.
- La nueva pantalla de registro será `/team/[teamId]/swim-times`. Volver conserva el equipo y la pestaña de origen.
- La ficha deportiva actual `/team/[teamId]/players/[playerId]` exige que el jugador esté en la plantilla consultada. No puede ser el único destino de las marcas históricas.
- Incorporar una página estable `/players/[playerId]/swim-times`, accesible desde la ficha deportiva, Mi perfil, el perfil familiar y las filas de rankings. Consultar la identidad deportiva autorizada sin depender de una plantilla activa ni exponer contacto personal.
- `/rankings` ya tiene métricas y filtros por categoría. Añadir «Tiempos de nado» como métrica, con selector de distancia dentro de ella; conservar navegación Temporada/Rachas/Leyendas.
- `/legends` actualmente agrega por jugador y no tiene filtro de categoría. La vista de nado necesita consultas por intento y sus propios filtros. No reutilizar la suma histórica existente.

## 3. Recorrido principal: registrar una plantilla

1. Pulsar Equipo en la navegación inferior.
2. Pulsar «Añadir tiempos» en el equipo que entrenas. Ya se muestra la plantilla: no hay otro selector de equipo.
3. Escribir un tiempo en la tarjeta del jugador y pulsar «Guardar tiempos» en esa tarjeta.
4. Continuar con el siguiente jugador en la misma pantalla. Sin modal de confirmación, sin volver a la plantilla y sin avance de foco sorpresivo.

Desde el directorio son una navegación y un guardado para el primer jugador, además de tocar y rellenar los campos. Los siguientes no requieren navegación. Si entras desde el detalle del equipo, el acceso está igualmente a una pulsación. No contar las pulsaciones de teclado como si desaparecieran.

Pantalla propuesta, con datos ficticios:

```text
← Cadete B
Añadir tiempos
Hoy, 14 septiembre 2026       Cambiar fecha
Crol · Salida desde el agua
Cambiar salida

Ana García                         Gorro 7
50 m · segundos       [ 34,52       ]
100 m · segundos      [             ]
Puedes rellenar uno o los dos.
34,52 segundos
[           Guardar tiempos          ]

Luis Pérez                         Gorro 9
50 m · segundos       [             ]
100 m · segundos      [ 78,40       ]
1 minuto y 18,40 segundos
[           Guardar tiempos          ]
```

Usar tarjetas de los componentes existentes, nombre completo y foto/gorro como ayuda. Nombre visible incluso si falta foto o dorsal. Lista por nombre, estable durante la sesión; no reordenar después de guardar. Búsqueda por nombre opcional arriba para plantillas grandes; la lista ya está visible sin buscar. Mantener únicamente una tarjeta editable por jugador, no una tabla horizontal en móvil.

Después de guardar, la tarjeta muestra valores y fecha, «Guardado», «Corregir» y «Añadir otro intento». Los campos se cierran para evitar que otro toque en Guardar cree un duplicado. El resto de las tarjetas permanece en su posición y conserva lo escrito. El resumen superior cuenta jugadores guardados en esta sesión, no intentos históricos ni campos completados.

Al abrir la pantalla, si hay marcas para la fecha y salida seleccionadas, mostrar la última con «Corregir» y «Añadir otro intento». Así se puede completar más tarde el 100 m de una anotación que solo tenía 50 m. El historial completo queda a un enlace «Ver tiempos» por jugador.

Elegir guardado por jugador, no un guardado obligatorio de toda la plantilla: el entrenador recibe confirmación inmediata de cada anotación y un error no bloquea a los demás. No añadir dos mecánicas de guardado en la primera versión.

## 4. Escribir el tiempo sin aprender un formato

- Un campo por distancia, etiquetado permanentemente «50 m · segundos» / «100 m · segundos», teclado decimal y tipografía de al menos 16 px.
- Entrada principal en segundos: `34`, `34,5`, `34,52`, `78,40`. Aceptar también punto decimal. No exigir centésimas cuando no se han medido.
- Permitir pegado/escritura alternativa `1:18,40` o `1:18.40`. La forma con dos puntos exige segundos entre 00 y 59. No obligar a buscar los dos puntos en el teclado móvil.
- Interpretar `1,18` como 1,18 segundos, nunca como 1 minuto 18. Mostrar la interpretación debajo del campo, antes de guardar, para detectar el error.
- Máximo dos decimales. Rechazar letras, negativos, cero, notación exponencial, separadores mezclados y formatos incompletos; no redondear una entrada ambigua silenciosamente.
- Límites técnicos: mayor que cero y menor de 60 minutos. Como ayuda, pedir revisión explícita si 50 m queda fuera de 15–180 segundos o 100 m fuera de 30–360 segundos. Estos umbrales son heurísticas de captura, no récords oficiales ni criterios de exclusión de deportistas; permitir «Guardar este tiempo» tras revisar.
- Guardar habilitado con al menos un campo válido y ninguno inválido. Un campo vacío significa «sin tiempo», jamás cero. Un error indica distancia y cómo corregirlo, junto al campo.
- Lectura uniforme: `34,52 s` por debajo de un minuto; `1:18,40` con unidad/formato explicado por encima. Nombre accesible completo: «1 minuto, 18 segundos y 40 centésimas».

## 5. Fecha y salida comparables

La fecha de la prueba parte de hoy en Europe/Madrid, se muestra antes de escribir y se guarda explícitamente. La hora real de creación se registra aparte en el servidor. Editar mañana una prueba de hoy no cambia la fecha de la prueba.

«Cambiar fecha» permite anotar un control anterior. No se admiten fechas futuras. La temporada se resuelve desde la fecha, usando el calendario de temporadas del proyecto, no el año natural del dispositivo. Si no existe una temporada que contenga esa fecha, explicar el problema y conservar los campos. No asignar silenciosamente la temporada activa. Al pasar medianoche, una sesión abierta conserva su fecha visible.

Decisión de alcance deportivo: controles de crol en la piscina habitual del club, que siempre es de 25 m. Esa longitud no se pregunta, no se muestra y no se almacena porque no varía. La única condición seleccionable es la salida desde el agua o desde el poyete. No mezclar tipos de salida en un ranking ni afirmar que son marcas homologadas.

La pantalla recuerda el último tipo de salida usado en el equipo. En sesiones siguientes aparece ya seleccionado y no añade pasos. El estilo crol se muestra como alcance fijo, sin selector de estilos en esta versión.

Cambiar fecha o salida con campos pendientes requiere resolverlos antes de aplicar el cambio. Las tarjetas guardadas conservan siempre su contexto original. Al corregir un intento, modificar fecha o salida solo afecta a ese intento, no a toda la sesión.

## 6. Corregir, repetir y anular

- «Corregir» abre los valores existentes en la misma tarjeta o en un formulario individual desde el historial. Título: «Corregir tiempos de Ana · 14 septiembre»; botón «Guardar cambios».
- Se puede modificar 50/100, completar la distancia ausente y corregir fecha o salida. El jugador no es reasignable: para un jugador equivocado se anula la anotación y se crea la correcta.
- Quitar un campo que ya tenía tiempo exige una confirmación concreta de retirada de esa distancia. Dejar ambos vacíos remite a «Anular anotación», evitando borrar sin querer.
- «Añadir otro intento» abre campos vacíos, conservando fecha y salida. Varias pruebas de la misma distancia el mismo día son válidas, incluso con el mismo resultado.
- Dos distancias guardadas juntas pertenecen a una anotación. Un 50 m y un 100 m pueden corregirse sin duplicar la otra distancia. La versión anterior permanece en auditoría, no en la clasificación.
- «Anular anotación» requiere confirmación y hace una anulación lógica con motivo, nunca un borrado físico. La primera versión no muestra anuladas ni ofrece restauración desde la interfaz.
- Conservar autor de creación, último editor y cambios antes/después en auditoría protegida. El historial deportivo muestra las marcas vigentes; el detalle de correcciones es para entrenadores autorizados.
- Si dos entrenadores modifican a la vez, rechazar la versión antigua con «Este tiempo ha cambiado. Revisa la última versión». Mostrar lo escrito y lo ya guardado; no sobrescribir silenciosamente.

## 7. Perfil y familia

Bloque «Tiempos de nado» en la ficha deportiva aunque no tenga estadísticas de partidos. En Mi perfil, mostrarlo para el jugador propio y dar acceso explícito al de cada hijo desde Familia, con su nombre. El perfil seleccionado no concede permisos de escritura.

Resumen por distancia: «Tiempo actual» principal y «Mejor tiempo» de toda su trayectoria secundario, ambos con fecha y salida. No confundir récord histórico con récord de temporada. Ejemplo ficticio: «50 m · Actual: 34,52 s · 14 sep / Mejor: 33,80 s · 2 jun». Debajo aparece el historial completo, de más reciente a más antiguo, con los valores de ambas distancias en la misma anotación.

Cada fila incluye fecha, marcas presentes y salida. Una distancia vacía se presenta como «Sin registrar». Una ficha sin datos dice «Todavía no hay tiempos registrados». Solo el entrenador autorizado ve «Añadir tiempos» y «Corregir». Jugadores y familiares pueden consultar el historial sin entrar en administración.

El historial pertenece al jugador, no al equipo: se conserva al cambiar de equipo, al subir de categoría o al terminar la temporada. Las marcas de jugadores que dejan el club siguen en Leyendas y conservan su detalle deportivo autorizado. Dar de baja a un miembro no equivale a borrar su identidad ni da acceso nuevo a una cuenta deshabilitada.

## 8. Rankings

Seleccionar «Tiempos de nado» muestra inmediatamente dos botones grandes «50 m» / «100 m». En Temporada, otro selector muestra «Tiempo actual» (por defecto) y «Mejor tiempo». No abrir un diálogo intermedio ni exigir elegir para ver datos. Conservar filtros y distancia al cambiar entre Temporada y Leyendas; la URL refleja el estado y Atrás lo recupera. El modo Actual/Mejor solo aplica a Temporada; Leyendas conserva todos los intentos.

| Regla                  | Temporada                                                                              | Leyendas                                                        |
| ---------------------- | -------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Qué compite            | Tiempo actual por jugador de la temporada activa; opción Mejor tiempo de esa temporada | Cada intento válido de todas las temporadas, incluida la activa |
| Repetición del jugador | Una fila por jugador                                                                   | Tantas filas como intentos clasificados                         |
| Orden                  | Menor tiempo primero                                                                   | Menor tiempo primero                                            |
| Categoría              | Derivada para la temporada de la marca                                                 | Derivada para la temporada de cada marca                        |
| Contexto de fila       | Nombre, tiempo, fecha                                                                  | Nombre, tiempo, fecha y temporada                               |

Mostrar la regla junto al título: «La última medición de cada jugador esta temporada», «La mejor marca de cada jugador esta temporada» o «Cada intento cuenta. Un jugador puede aparecer varias veces».

Decisión explícita de Rubén durante el diseño: el ranking principal representa la última medición, aunque sea peor que una anterior. Primero elegir el último intento válido de cada jugador para la distancia y salida seleccionadas; después ordenar esas marcas de menor a mayor tiempo. No ordenar jugadores por fecha ni recuperar automáticamente su récord para mejorar su posición.

«Último» se determina por fecha de prueba, luego por creación original e identificador para estabilidad si hay varios intentos el mismo día. Corregir una prueba antigua no la convierte en la más reciente; anotar retrospectivamente tampoco desplaza una prueba realizada después. Se puede corregir la fecha explícitamente. Si se introducen pruebas del mismo día fuera de orden, la creación se usa como aproximación al orden porque no se pide hora de prueba en esta versión; explicar esta limitación en la ayuda.

Calcular 50 y 100 por separado: guardar solo 50 no elimina ni reemplaza el tiempo actual de 100. Mostrar la fecha del tiempo usado, sin descartar mediciones por un umbral arbitrario de antigüedad. No trasladar marcas de otra temporada al ranking de la activa: quien todavía no tiene esa distancia esta temporada no aparece en ese ranking. Su perfil conserva el tiempo actual histórico con fecha.

«Mejor tiempo» cambia la marca representativa, el orden y las posiciones, manteniendo una fila por jugador. No añadir otra cifra a cada fila en móvil: actual y mejor se comparan juntos en el resumen del perfil. Cambiar modo reinicia la página y conserva distancia, categoría y salida.

Ejemplo en Leyendas de 50 m: Ana 30,10 (14 sep), Ana 30,20 (10 sep), Luis 30,30 (12 sep), Ana 30,40 (8 sep). Si Ana tiene las diez mejores marcas, ocupa diez filas. No agrupar por jugador, por día ni por tiempo. Una corrección no cuenta como otro intento.

Filtros: Club / Categoría como en la app, más salida desde el agua o desde el poyete. No hay opción «Todas las salidas» que produzca una clasificación mezclada. Cambiar distancia conserva categoría y salida; cambiar filtros reinicia la paginación.

Empates: mismo tiempo, misma posición deportiva (1, 1, 3). Dentro del empate, fecha de prueba ascendente, creación ascendente e identificador para estabilidad. En modo Mejor tiempo de temporada, representar la primera fecha del récord repetido. En modo Tiempo actual, representar el último intento aunque iguale otro.

Calcular la categoría con año de nacimiento y año final de la temporada, reutilizando la regla de dominio del club. Un infantil que juega con cadetes sigue siendo infantil en tiempos. En Leyendas, una marca de infantil no pasa a absoluto cuando su autor crece. Escuela es la excepción organizativa existente: se identifica desde la pertenencia histórica exclusiva a un equipo school en la fecha; si también hay plantilla competitiva vigente, prevalece la categoría derivada. No guardar una categoría calculada en la marca. Si falta información para derivarla, incluir en Club y excluir de categorías concretas, sin inventar Cadete como fallback.

No exigir partidos, asistencia mínima ni otra estadística para aparecer. No crear ceros por ausencia de marcas. Consultar todas las marcas elegibles antes de aplicar posición y paginación, sin limitar el cálculo a la primera página de resultados de la base de datos. «Ver más» conserva el ranking global y no corta empates de manera que cambie sus posiciones.

## 9. Permisos

Lectura deportiva para miembros activos autenticados del club, coherente con los rankings existentes. Ningún acceso público anónimo ni a teléfono/email. No habilitar notificaciones push o correos para cada nueva marca.

Escritura exclusivamente para la cuenta autenticada con asignación explícita de entrenador al equipo correspondiente. Administrador, delegado, familiar o permiso modular de entrenamientos por sí solos no conceden escritura de tiempos. Rubén puede registrar donde sea entrenador; ser administrador no es un atajo en esta funcionalidad.

Para crear, comprobar asignación de entrenador vigente y pertenencia del jugador al equipo en la fecha de prueba. Para corregir o anular, exigir que la cuenta siga asignada como entrenador al equipo de origen de la anotación. Si ya no existe esa asignación, debe corregirse la asignación desde administración; no introducir una excepción silenciosa de administrador.

Concentrar esta regla en una capacidad de tiempos y reproducirla en SQL. Revisar las asignaciones reales: el directorio de Equipo consulta head_coach en team_staff, mientras que la capacidad compartida coachTeamIds se deriva de roles scoped. No usar una comprobación visual diferente de la autorizada por acciones y base de datos.

## 10. Integridad y propuesta técnica

- Anotación persistente `swim_time_entries`: id, player_id, equipo de origen, fecha de prueba, temporada, salida, tiempo de 50 opcional, tiempo de 100 opcional, autor, creación, último editor, actualización, revisión, estado de anulación y motivo. Crol y piscina de 25 m son invariantes del alcance, no campos configurables. Una fila representa una anotación, no una mejor marca calculada.
- Guardar duración en centésimas enteras para evitar errores decimales. Restricción de al menos una distancia y límites equivalentes en Zod y SQL. No imponer unicidad por jugador/fecha/tiempo: impediría intentos legítimos.
- Guardado atómico por anotación: las dos distancias se confirman juntas. Identificador de operación idempotente para reintentos; una respuesta perdida no debe crear otro intento. Si el mismo identificador llega con otro contenido, detectar conflicto, no tratarlo como éxito equivalente.
- Server Actions con Zod, autenticación y lectura fresca de permisos. RLS en tablas expuestas, privilegios mínimos y protecciones de identidad, autor y revisiones en base de datos. No escribir desde cliente directamente a Supabase. Determinar el mecanismo SQL definitivo durante implementación y probar llamadas directas que intenten saltarse la UI.
- Actualizar historial, resumen y rankings tras crear, corregir o anular. Anular el tiempo actual revela el anterior válido de esa distancia; anular un récord revela la siguiente mejor marca. El cierre de temporada no copia estas filas a históricos agregados ni las borra: Leyendas consulta la fuente persistente.
- Auditoría transaccional mediante integración con audit_log existente, restringida a personal autorizado; no publicar valores previos anulados como marcas deportivas.
- Índices por jugador/fecha e índices para temporada, salida y duración de cada distancia. Consultas y agregados específicos de nado; no acoplarlos a ranking_snapshots de partidos.
- Incluir nuevas tablas persistentes en el manifiesto de respaldo y en las comprobaciones de cobertura y restauración.
- Confirmar estado de migraciones y permisos deportivos antes de integrar. El estado operativo documenta pendientes anteriores; este diseño no los da por resueltos.

## 11. Fallos, accesibilidad y prueba con entrenador

Al guardar, deshabilitar solo la tarjeta en envío, mostrar «Guardando…» y anunciar resultado con región de estado accesible. Un fallo conserva los campos y presenta «No se ha podido guardar. Reintentar». Solo mostrar «Guardado» después de confirmación del servidor. Ante respuesta incierta, reintentar la misma operación y recuperar el resultado.

Si falta conexión, mantener los valores en memoria mientras la pantalla siga abierta, advertir que no están guardados y permitir reintentar. No prometer conservación tras recarga o cierre. Esta versión no extiende la excepción offline del acta a los tiempos ni guarda datos personales en localStorage. Advertir al navegar con entradas pendientes; ante cierre forzado del navegador no se garantiza recuperación. Si la prueba real revela mala cobertura habitual, diseñar persistencia offline explícita antes de presentar la función como apta para ese entorno.

Controles de al menos 48 × 48 px, preferiblemente botones principales de 56 px; etiquetas visibles, cifras tabulares, contraste legible, errores asociados al campo y confirmación con texto además de color. Mantener tipografía, tarjetas y tokens del club. Sin iconos solos para Añadir, Corregir o Guardar, sin gestos ocultos ni tablas que obliguen a desplazarse horizontalmente. A 320 px y texto al 200 %, los campos se apilan. Evitar una barra fija que tape al siguiente jugador o el teclado.

Criterios de aceptación previos a lanzamiento:

1. Entrenador encuentra el acceso desde Equipo sin instrucciones y registra solo 50 m, solo 100 m y ambas distancias en tres jugadores diferentes.
2. Continúa sin salir de la lista, entiende qué se ha guardado y corrige una marca equivocada sin ayuda. Medir errores, necesidad de ayuda y tiempo real; no atribuir validación a este documento.
3. Completa un 100 m pendiente, crea dos intentos idénticos el mismo día y anula el registrado al jugador equivocado.
4. Jugador y familiar ven las marcas correctas, sin controles de escritura; acceso directo y llamadas manipuladas tampoco permiten escribir. Entrenador de otro equipo y administrador sin asignación no pueden registrar.
5. Probar comodín de perfil familiar, pérdida de rol y cambio de equipo durante un formulario abierto. La acción rechaza permisos revocados y conserva la entrada para informar.
6. Comprobar formatos de coma/punto/minutos, campos vacíos, límites, advertencias de posibles errores, cambio de medianoche y fechas de temporadas anteriores.
7. Con datos sintéticos, probar tiempo actual por jugador como ranking predeterminado aunque empeore su récord, selector de mejor marca, actualización independiente de 50/100, fechas retrospectivas, correcciones antiguas, ausencia de marcas en temporada y anulación del último intento. Probar diez apariciones del mismo jugador en Leyendas, empates, mezcla de salidas impedida, Escuela, categorías históricas y ausencia de año de nacimiento.
8. Con más filas que una página de API, verificar ranking y posiciones completos, jugador sin equipo actual y cierre de temporada sin pérdida ni duplicación.
9. Probar doble toque, timeout con escritura confirmada, reintento, corrección simultánea, fallo de red y salida con pendientes. SQL debe probar RLS real y atomicidad, no solo mocks de TS.
10. Recorrido de interfaz en 320/390/768 px, paisaje, teclado y texto al 200 %; después prueba sin ayuda con entrenador y móvil real en la piscina. Build y pruebas automatizadas no sustituyen esa sesión.

## 12. Orden de implementación

1. Dominio de tiempos, fecha, salida, categorías y posiciones; esquema, permisos, auditoría y respaldo con pruebas.
2. Captura por plantilla y formulario compartido de corrección; accesos condicionados desde Equipo y ficha.
3. Historial permanente e integración en perfil propio y familia.
4. Métrica de temporada y vista de Leyendas con filtros, posiciones y paginación.
5. Pruebas integradas, verificación SQL, ensayo de usabilidad y ajustes antes de publicar.

La implementación incluye migración, permisos, acciones, captura por plantilla, historial, perfil, ranking de temporada, Leyendas, respaldo y pruebas automatizadas. El despliegue de la migración y la validación con el entrenador quedan fuera del repositorio local.
