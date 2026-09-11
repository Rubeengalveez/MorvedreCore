# Acta en directo: diagnóstico del diseño y plan de corrección

Fecha: 11 de septiembre de 2026.

**Estado: rediseño implementado y verificado el 11 de septiembre de 2026. Pendiente de una nueva prueba sin ayuda con delegados.**

Este documento responde a la revisión de Rubén posterior al [plan 36](36-acta-live-feedback-plan.md). Sus requisitos funcionales siguen vigentes. Este documento sustituye la dirección visual que separaba los porteros y las conclusiones de aceptación del diseño anterior. La siguiente fase necesita una nueva orden del usuario.

## 1. Reflexión: qué hice mal

El error principal fue resolver cada petición añadiendo una pieza visible, sin volver a diseñar la pantalla completa. El portero necesitaba un acceso claro y añadí una tarjeta grande. Los tiempos necesitaban explicación y añadí otra franja. La corrección necesitaba visibilidad y la repetí arriba y abajo. Cada decisión tenía una intención razonable; juntas desplazaron precisamente lo que más importa: los jugadores, sus goles y sus expulsiones.

También confundí destacar a los porteros con separarlos del equipo. El delegado busca un número de gorro. Cambiar el orden a «porteros primero, jugadores después» rompe esa búsqueda y obliga a recordar una clasificación nueva. El requisito correcto es ordenar numéricamente a todos, incluidos el 1 y el 13, y adaptar la información dentro de su propia fila.

La navegación creció del mismo modo: cada nuevo caso recibió su propio botón para volver. «Cambiar jugador», «Volver a las acciones» y «Volver sin guardar» aparecen en lugares y niveles distintos. La persona tiene que interpretar la interfaz mientras sigue el partido. No basta con que cada botón sea comprensible por separado: su posición y comportamiento deben ser predecibles.

Por último, di demasiado peso a la validación técnica al describir el acabado. Que una prueba pase, no haya desbordamiento o los botones midan 48 px no demuestra que el delegado pueda reconocer rápidamente al jugador con dos expulsiones. Las capturas, las mediciones y las pruebas con personas deben corresponder a la misma versión y comprobar la tarea real. El visto bueno del padre de Rubén validaba un recorrido anterior; no valida automáticamente los rediseños posteriores.

La corrección requiere reorganizar y simplificar. Una apariencia profesional aquí significa jerarquía estable, cifras fáciles de comparar, espacio suficiente, acciones inequívocas y respuesta fiable. Más tarjetas, sombras o animaciones no resolverían esos problemas.

## 2. Evidencias y límites de esta revisión

Se ha revisado el código actual de `acta-player-board.tsx`, `acta-scoreboard.tsx`, `live-match-client.tsx`, su CSS y el guion de pruebas del acta. Las rutas relativas al proyecto figuran en el plan de ejecución.

El acceso de lectura a `http://localhost:3000` falla porque no hay un servidor escuchando. La inspección de la pestaña existente tampoco ha podido completarse. Las capturas disponibles en `tmp/acta-audit` están fechadas el 7 y 8 de septiembre; no acreditan el render de los cambios posteriores. No se han usado como fotografías del estado actual ni se han creado registros de partido para este análisis.

Por tanto, se distingue entre:

- **Hecho comprobado en código:** orden de porteros, elementos repetidos, tamaños declarados, estructura y navegación.
- **Consecuencia de diseño razonada:** consumo vertical, dificultad de lectura y competencia entre elementos. Las estimaciones de espacio no son mediciones nuevas del navegador.
- **Pendiente de validación:** render exacto, contraste de todos los estados, interacción táctil, texto ampliado y prueba con delegados de la nueva propuesta.

## 3. Diagnóstico concreto

| Prioridad | Hallazgo y localización actual                                                                      | Consecuencia                                                                                  | Corrección prevista                                                        |
| --------- | --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Alta      | `live-match-client.tsx:643`: contenedor a altura de viewport, cuerpo con scroll y pie que no encoge | Cabecera y pie compiten con la zona de datos; añadir bloques arriba reduce su ventana útil    | Presupuestar el espacio completo y definir una salida para poca altura     |
| Alta      | `live-match-client.tsx:760`: tarjeta de portero vertical hasta `sm`                                 | En móvil se apilan etiqueta, nombre y botón completo                                          | Un único control horizontal explícito de 48 px, sin tarjeta introductoria  |
| Alta      | `acta-player-board.tsx`: `keepers` antes de `fieldPlayers`                                          | El 13 aparece antes del 2; buscar un gorro deja de ser predecible                             | Una lista ordenada por número, sin secciones de porteros                   |
| Alta      | Filas de portero con columnas fijas de 36 + 36 + 52 px dentro de media pantalla                     | Nombre y gorro reciben el espacio restante y se comprimen                                     | Identidad y estadísticas en dos niveles dentro de la misma fila            |
| Alta      | `live-match-client.tsx:930` y botones de vuelta en cada rama                                        | Volver cambia de nombre, posición y destino                                                   | Cabecera de panel común y navegación explícita por pasos                   |
| Alta      | `live-match-client.tsx:124` y `closePanel()`                                                        | Si sigue existiendo una continuación pendiente, cerrar provoca que el efecto vuelva a abrirla | Distinguir cerrar, omitir continuación y anular jugada; probar el contrato |
| Media     | Tiempos en franja superior y otra vez en `BenchSummary`                                             | Información repetida que consume altura y atención                                            | Un lugar principal con «pedidos» y acceso a banquillos                     |
| Media     | Corregir en cabecera y pie                                                                          | Ocupa dos ubicaciones para la misma tarea                                                     | Mantener un acceso permanente en el pie                                    |
| Media     | Cabeceras distintas de porteros/campo frente a una sola lista rival                                 | Estructura visual inestable entre ambos lados                                                 | Un patrón de fila y encabezado coherente por equipo                        |
| Media     | `name.split(" ")[0]`, truncamiento y estados de 12–13 px                                            | Nombres ambiguos y estados importantes pequeños                                               | Gorro dominante, nombre corto desambiguado y etiquetas críticas legibles   |
| Media     | Bordes exteriores, divisiones internas, subcabeceras, cuadrados de sanción y fondos                 | Demasiados elementos reclaman atención                                                        | Reducir líneas y estructurar mediante alineación y tipografía              |
| Media     | Ayudante `button()` añade flecha derecha a cualquier acción                                         | «Ir al siguiente paso» y «guardar ahora» parecen lo mismo                                     | Flecha solo para navegación; acción final identificada por su verbo        |
| Alta      | Reglas finales `@container acta (max-width: 18em)`                                                  | Se ocultan rótulos y se apila el marcador; resolver ancho puede empeorar altura               | Variante de lectura ampliada sin quitar nombres de acciones                |

Las líneas corresponden a esta revisión; deberán actualizarse si se mueve código.

### Por qué se amontona aunque haya pocos botones

Hay cinco capas antes de las primeras filas: navegación/marcador, cuarto/parcial, sincronización, tarjeta del portero y tiempos. Después llegan los encabezados de equipo. Abajo se reservan dos filas de acciones. La acumulación es vertical y visual: bordes, fondos y negritas hacen que casi todo parezca igualmente importante.

Como estimación del CSS actual, la tarjeta de portero móvil ronda 125–135 px con etiqueta, nombre, botón y espaciado; el estado tiene un mínimo declarado de 40 px. Son aproximadamente 170 px antes de contar tiempos, cabeceras y marcador. Reducir 2 px una fuente no recupera ese espacio; eliminar duplicaciones y cambiar la composición sí.

En horizontal o con letra ampliada, reservar simultáneamente cabecera y pie puede dejar una ventana de datos casi inutilizable. No se debe solventar haciendo diminutos los controles ni ocultando los rótulos que necesita una persona poco habituada a la tecnología.

## 4. Prioridades del nuevo diseño

1. Reconocer el marcador global y encontrar goles/expulsiones de cualquier gorro.
2. Registrar una jugada con la secuencia ya entendida: equipo → jugador → acción.
3. Corregir, apuntar tiempo muerto o cambiar portero sin buscar en menús ocultos.
4. Identificar cuarto, guardado y portero actual sin que dominen la pantalla.
5. Consultar parciales, detalle estadístico, historial y PDF cuando se necesiten.

Se conserva el atajo de tocar directamente la fila. Los dos botones de equipo siguen siendo la entrada obvia para quien no conozca ese atajo. No se sustituye la tabla por «última acción» ni se cambia su orden al marcar un gol o recibir una expulsión.

No es posible mostrar 28 jugadores, sus nombres, todas las estadísticas y controles táctiles grandes a la vez en cualquier móvil. La solución es una lista clara con scroll conservado, ambos equipos presentes en la vista normal y datos secundarios por contexto. No es reducir toda la pantalla hasta que quepa.

## 5. Composición propuesta

### 5.1 Vista de seguimiento

Orden recomendado de arriba abajo:

```text
Volver al partido             Acta             Compartir
Morvedre                    8 — 6              [Rival]
Cuarto 2 de 4 · Parcial 3–2       Guardado / Sin conexión
[ Portero en juego: #1                       Cambiar ]
Morvedre                                  Rival
  1 · Nombre                              1
  Paradas / Encajados · Expulsiones        Goles · Exp.
  2 · Nombre                              2
  Goles · Expulsiones                      Goles · Exp.
  …                                       …
  13 · Nombre                             13
  Paradas / Encajados · Expulsiones        Goles · Exp.
  14 · Nombre                             14
  Goles · Expulsiones                      Goles · Exp.
──────────────────────────────────────────────────────
[        Morvedre        ] [         Rival          ]
[ Tiempo muerto          ] [ Corregir ] [ Fin cuarto ]
  Pedidos: M 1 · R 2
```

Es un esquema de jerarquía, no una maqueta ni una garantía de que todo quepa sin scroll. «Fin cuarto» se desarrollará como «Terminar cuarto» en la interfaz. La línea de tiempos forma parte del propio control, no una franja adicional. Sus abreviaturas solo se usarán junto a equipos identificados y se desarrollarán al abrirlo.

- Cabecera sobria con marcador dominante, una navegación y un acceso a compartir. Corregir se queda abajo.
- Cuarto/parcial y guardado comparten una zona secundaria cuando quepan. El mensaje puede crecer; nunca se trunca un error relevante. El estado se explica con texto, no solo un punto de color.
- Portero en juego: toda la fila es un botón con «Cambiar» a la derecha. No se añade un botón dentro de otro ni se repite una tarjeta. Nombre completo al abrir el selector.
- Lista central de ambos equipos, con más ancho para Morvedre por los nombres. Un desplazamiento vertical; nada de dos pequeñas listas con scroll independiente.
- Pie estable con dos botones principales y tres utilidades. Tiempos incorpora los contadores como pedidos. Las tarjetas de entrenadores se ven en ese panel y, cuando existan, mediante un indicador textual junto al equipo. No añadir otra banda permanente para «sin tarjeta».
- Los mensajes de guardado reutilizan su lugar. No aparecen avisos encima de las celdas ni se reinicia su scroll después de anotar.

### 5.2 Jugadores y porteros integrados

**Orden numérico ascendente en ambos equipos, también en todos los selectores.** En la convocatoria habitual: 1, 2, 3… 13, 14. No se inventan jugadores ausentes ni se renumeran gorros para completar una tabla. Catorce es el máximo de convocados propios, no una obligación de que cualquier acta histórica use todos esos números. El rival conserva su cantidad y numeración configurables.

La fila será una superficie táctil completa, con identidad y sanciones en posiciones estables. Gorro de 20–24 px y cifra estadística dominante. Se propone:

- Campo: identidad arriba; debajo, goles y expulsiones con rótulos comprensibles. Nombre corto visible cuando tenga espacio real, sin apretar números para incluirlo. Nombre e inicial de apellido si hay coincidencias.
- Portero: identidad en el mismo sitio; debajo, «Paradas» y «Encajados» en dos líneas cortas, con sanción al lado. No colocar una parada bajo una cabecera «Goles». Su fila puede ser algo más alta para mantener etiquetas legibles.
- Rival: gorro, goles y expulsiones. No rellenar con nombres ficticios.
- Portero activo: texto «En juego» en su fila, sin otro fondo que compita con expulsiones. El control superior lo mantiene localizable aunque el 13 esté fuera del área visible.
- El gol excepcional de un portero sigue disponible en acciones, detalle e informe. Su resumen no cambia de significado a mitad del partido al marcarlo.

Primera hipótesis de prototipo: filas de campo de unos 64 px y porteros de unos 88 px, creciendo con el texto. No son alturas máximas. Probar dos cifras, apellidos largos y «3/3 · Fuera». Si a 360 px no cabe, simplificar el nombre del resumen antes de reducir cifras, sanciones o etiquetas. En selección y detalle siempre se ve el nombre completo.

Cada lista mantiene su orden; que dos filas queden a la misma altura no significa que esos jugadores estén emparejados. El prototipo comprobará que el mayor alto de porteros no hace confusa la lectura lateral. No se crearán cabeceras adicionales para resolverlo.

### 5.3 Expulsiones y lenguaje visual

| Situación     | Fondo de toda la fila                 | Información que permanece    |
| ------------- | ------------------------------------- | ---------------------------- |
| Sin sanciones | Blanco                                | 0/3                          |
| Una           | Amarillo muy suave                    | 1/3                          |
| Dos           | Naranja suave, claramente más marcado | 2/3                          |
| Tres          | Rojo perceptible con texto oscuro     | 3/3 · Fuera                  |
| Roja directa  | Mismo estado de fuera                 | Conteo real y «Roja · Fuera» |

La roja no convierte artificialmente el conteo en tres. Se conserva la advertencia amarilla cuando exista. El penalti cometido suma una sanción personal. Los pequeños cuadrados actuales no serán necesarios si cifra y fondo comunican bien el estado; eliminarlos libera espacio y ruido.

Identidad del club: azul oscuro para estructura/acciones, blanco y neutros para lectura. Reservar colores de riesgo para sanciones, evitando que el rival o un botón normal parezcan una advertencia. Separadores discretos y radio consistente; no una tarjeta dentro de otra. Cifras tabulares y sistema tipográfico compartido, sin alternar estilos por panel.

## 6. Navegación y registro: un solo contrato

Todos los paneles usarán la misma estructura. Arriba, **«Atrás» a la izquierda y «Cerrar» a la derecha**, ambos con área de 48 px. Debajo, contexto fijo —«Morvedre · #7 Marcos»— y título del paso. El marcador puede seguir visible de forma compacta, sin duplicar otra cabecera grande.

| Acción                                                    | Resultado esperado                                                           |
| --------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Atrás en acciones                                         | Selector de jugadores, manteniendo equipo                                    |
| Atrás en tipo de gol/tiro/sanción                         | Acciones del mismo jugador                                                   |
| Atrás en resultado de penalti                             | Volver al lanzador, conservando la sanción ya registrada                     |
| Atrás en selector inicial                                 | Resumen, conservando scroll                                                  |
| Cerrar sin haber guardado                                 | Descartar solo selección transitoria y volver al resumen                     |
| Cerrar tras guardar gol/sanción con continuación opcional | Conservar lo guardado, omitir continuación y volver al resumen sin reabrirla |
| Cancelar edición                                          | Mantener la jugada original; no guardar cambios parciales del formulario     |

Antes de pedir asistencia: «Gol guardado». Antes del lanzador: «Penalti del rival guardado». Salidas explícitas: «Seguir sin asistencia» y «Anotar el tiro después». Cerrar tiene ese mismo efecto sobre la continuación opcional; no anula el evento principal. Si falla guardar localmente esa decisión, se explica y permite reintentar, sin simular una salida correcta.

Atrás nunca significa deshacer una estadística. Anular exige una acción explícita desde Corregir. En edición, el contexto indica «Corrigiendo jugada». Cierre por Escape o fondo: misma política que Cerrar. Botón del navegador/Android: retroceder primero el paso o cerrar panel; probar expresamente que no salte a administración ni pierda eventos.

Los pasos usarán altura estable en el móvil habitual, ampliándose cuando haga falta. Cabecera localizable y cuerpo desplazable. Sin paneles apilados ni botones de vuelta al final de una lista larga. No exigir arrastrar una hoja para cerrarla.

Los botones que llevan a otro paso pueden llevar flecha. Los que guardan dicen qué apuntan —«Gol normal», «Tiro fuera», «Asistencia»— y no aparentan abrir otra pantalla. Una jugada corriente mantiene tres o cuatro pulsaciones desde el equipo, y una menos desde la fila. La asistencia es opcional; las comprobaciones excepcionales pueden necesitar más pasos.

## 7. Controles que requieren especial cuidado

**Portería.** La fila superior abre selector con #1 y #13, nombres y «En juego»/«Disponible». Elegir cambia y devuelve al resumen. Otro portero se elige dentro del selector. Un expulsado definitivamente no figura como disponible. Una parada de otro portero mantiene la comprobación contextual sin convertir cada parada normal en una confirmación adicional.

**Tiempos y entrenadores.** «Tiempo muerto» abre «Morvedre · 1 pedido» y «Rival · 2 pedidos». Pulsar registra uno nuevo y confirma total, sin preguntar lo mismo dos veces. Las tarjetas del entrenador tienen acceso rotulado en ese panel. No calcular tiempos restantes ni imponer máximo por categoría.

**Cuartos.** «Terminar cuarto» muestra parcial y global, con «Seguir anotando» y «Terminar cuarto 2». En descanso: «Empezar cuarto 3». En el último: «Terminar partido». El nuevo parcial empieza a cero, el global se conserva. Sin reloj ni cambio de cuarto por tiempo transcurrido.

**Corrección.** Acceso permanente «Corregir». Lista reciente por cuartos, con equipo, gorro, nombre y acción; filtro por jugador accesible. Al tocar una jugada, editor grande con «Guardar cambios». Anular es diferente y tiene confirmación que explica efectos sobre asistencia o penalti relacionado. Tras guardar, mostrar total corregido y volver al punto de consulta. No exigir tocar una cifra minúscula ni pulsación larga.

**Penaltis y asistencias.** Conservar registro manual, continuaciones opcionales y aviso de duplicado. «¿Es el mismo gol de penalti?» enseña registros comparados, jugador y cuarto; no deducir identidad solo por proximidad temporal. Un fallo seguido de otro penalti y gol no se bloquea. Probar ambos órdenes, cambio de jugador, corrección, omisión y recarga a mitad del flujo.

## 8. Móviles reales y accesibilidad

### Matriz de pantallas

Trabajar en **píxeles CSS del área útil del navegador**, no con resolución física del panel ni relaciones de aspecto inventadas. La emulación ofrece muestras reproducibles; barras del navegador, escala del sistema y PWA cambian el área disponible.

| Viewport              | Uso                                                          |
| --------------------- | ------------------------------------------------------------ |
| 390 × 844 y 393 × 852 | Referencia principal vertical                                |
| 360 × 780 y 412 × 915 | Cobertura de anchos habituales de Android                    |
| 430 × 932             | Móvil grande; aprovechar espacio sin agrandar todo           |
| 375 × 667             | Móvil pequeño y menos altura útil                            |
| 320 × 568             | Fallback compacto, no modelo rector                          |
| 844 × 390             | Robustez al girar, sin dirigir desde aquí el diseño vertical |

Añadir 360 × 640 para menor altura útil y texto al 150 %/200 %. Reflujo a 320 CSS px y ampliación solo de fuente son pruebas distintas: ensayar ambas. No anunciar compatibilidad con un modelo físico sin probarlo.

Presupuesto inicial a 390 × 844: aproximadamente 140 px de cabecera/estado, 48 px de portero, 128 px de pie, 40 px de títulos/espaciado y reserva para áreas seguras. Quedarían alrededor de 450–480 px para filas según entorno. **Hipótesis de diseño, no medida verificada ni altura fija para recortar texto.** Objetivo: seis jugadores propios completos en ese viewport normal y cuatro a 375 × 667, con datos rivales visibles simultáneamente. Si no se alcanza, revisar estructura antes de encoger controles.

No prometer catorce visibles a la vez. Conservar scroll al registrar, cerrar y cambiar portero. Los encabezados de equipo podrán permanecer visibles dentro de los datos sin acumular otra gran cabecera fija.

### Cuando no cabe

Con texto normal, ambos equipos en paralelo a 360 px o más. A 320 px probar si basta quitar el nombre secundario del resumen, manteniéndolo completo en selección/detalle. Si las etiquetas ya no caben, usar vista de equipo a ancho completo con dos selectores rotulados «Morvedre» y «Rival», y marcador accesible. No apilar catorce filas propias antes de llegar al rival. Es una concesión para poco ancho o texto grande, no el comportamiento habitual.

Con poca altura, dejar de encerrar la tabla entre grandes bloques fijos: cabecera y utilidades secundarias pasan al flujo normal. Mantener como máximo una barra compacta de registro si deja zona útil de lectura; si no, también se desplaza. A 200 % prima leer y acceder a todo frente a ver idéntica cantidad de filas. Nunca ocultar rótulos de botones para pasar una prueba de ancho.

### Reglas verificables

- Controles de al menos 48 × 48 CSS px y separación suficiente; principales preferiblemente 56 px de alto. Es el estándar del proyecto, más exigente que el mínimo de 24 px de WCAG 2.2 AA, que contempla excepciones de espaciado. [W3C](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html).
- Controles y datos necesarios para actuar: objetivo de 16 px mínimo; 14 px solo para información secundaria. WCAG no impone un mínimo universal de 16 px. Rótulos y cantidades crecen con las preferencias de texto.
- Texto normal con contraste mínimo 4,5:1 y grande 3:1. Medir cada combinación activa y cada fondo de sanción; no afirmar cumplimiento solo por elegir una paleta. [W3C](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html).
- Reflujo sin perder información/funciones ni scroll horizontal de página; comprobar ampliación al 200 % por separado. [Reflujo](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html) y [tamaño de texto](https://www.w3.org/WAI/WCAG22/Understanding/resize-text.html).
- Foco visible, restaurado al control que abrió el panel y sin quedar tapado por barras. Orden de teclado igual al visual. [Foco no oculto](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html).
- Lector de pantalla: equipo, gorro, jugador, estadística y sanciones. Las abreviaturas no son el único nombre accesible. Guardado/error se anuncian sin repetir toda la tabla.
- Ninguna función depende solo de color, icono, hover o gesto. Respetar movimiento reducido y evitar desplazamientos automáticos que hagan perder el gorro buscado.

## 9. Plan de acción para implementar después

Rubén autorizó estas fases el 11 de septiembre de 2026. La implementación se completó como una única revisión coherente de la pantalla.

| Fase           | Trabajo y archivos principales                                                                                                                                | Condición para avanzar                                                                  |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| 1. Referencia  | Levantar entorno y capturar versión actual con datos sintéticos aislados. Revisar `scripts/test-live-acta.mjs` antes de ejecutarlo: crea fixtures en Supabase | Capturas identificadas por versión, viewport y estado, sin cambiar partidos reales      |
| 2. Composición | `components/matches/acta-scoreboard.tsx`, `acta-player-board.tsx`, `live-match-client.tsx`                                                                    | Prioridades legibles a 390 y 375; porteros ordenados; presupuesto vertical comprobado   |
| 3. Navegación  | Extraer estructura compartida y transiciones de `live-match-client.tsx`; conservar persistencia en `use-live-match.ts`                                        | Atrás/Cerrar idénticos; actor estable; cerrar continuaciones no reabre ni deshace goles |
| 4. Contexto    | Portero, banquillos, cuarto, corrección, asistencia y penalti dentro del patrón                                                                               | Recorridos cortos, mensajes inequívocos y totales correctos                             |
| 5. Acabado     | Unificar estilos activos de `live-match.module.css` y utilidades; retirar reglas obsoletas tras comprobar usos                                                | Contraste, tamaño, alineación, foco, scroll y ampliación comprobados                    |
| 6. Entrega     | `tests/unit/live-match-client-ui.test.tsx`, `live-match-sync.test.tsx`, `live-match.test.ts`, ensayo visual y guía                                            | Evidencia funcional y visual de la misma versión; pendientes declarados                 |

Evitar reescribir almacenamiento o PDF para corregir disposición. Extraer por responsabilidad —marcador, lista, controles, panel—, no otra biblioteca ni sistema de estilos paralelo. Reglas de anotación y vínculos permanecen en dominio; componentes presentan estado y despachan acciones. Si una transición exige ajustar persistencia, ensayarla independientemente antes de darla por integrada.

Se conservan todos los requisitos funcionales del plan 36: delegados, dos modos, UUID compatible, relevo, offline, asistencias, tiros simplificados, penaltis/duplicados, porteros, tiempos/tarjetas, máximo propio de 14, rival configurable, PDF horizontal/vertical y consulta/compartición. Esta revisión **no acredita** el despliegue pendiente, el último render del PDF ni resolver el error 500 de sugerir convocatoria, que continúa separado.

## 10. Validación para acreditar una mejora

Pruebas automáticas: integridad y navegación. Capturas: composición. Ninguna sustituye observar a una persona usarla.

Escenarios visuales mínimos: listo, jugando, descanso, terminado, offline con pendientes, consulta/relevo, 14 jugadores, nombres largos/repetidos, rival largo, marcador de dos cifras, portero 13 activo, sanciones 0/1/2/3 y roja directa, selección, acciones, penalti, asistencia, corrección y error de guardado. Revisar también el gorro 14 tras hacer scroll y volver de un panel.

Ensayos funcionales sensibles: doble toque; desconexión antes/después de guardar; cerrar/recargar durante asistencia o penalti; Atrás después del lanzador; cambiar jugador; gol rival al portero correcto; anulación con eventos relacionados; relevo entre dispositivos. No convertir estos casos en excepciones visuales independientes.

Prueba sin explicación previa con el padre de Rubén y otro delegado, cuando estén disponibles:

1. Encontrar quién lleva dos expulsiones y qué rival ha marcado más.
2. Registrar gol normal y asistencia opcional; volver a la tabla.
3. Equivocarse de jugador y volver un paso sin perderse.
4. Apuntar penalti rival con gol, y otro dejando el tiro para después.
5. Cambiar portero y registrar parada.
6. Pedir tiempo muerto y explicar si el contador indica usados o restantes.
7. Corregir una jugada y terminar cuarto.

Registrar dudas, errores, ayudas y pulsaciones. Objetivo: reconocer marcador/sanciones en pocos segundos, registrar jugada corriente en tres o cuatro pulsaciones y comprender Atrás/Cerrar sin ensayo y error. Son metas a comprobar, no resultados obtenidos ni tiempos impuestos a las personas. Si alguien necesita instrucciones para encontrar una acción habitual, revisar diseño antes de añadir tutoriales. La edad no determina por sí sola la capacidad tecnológica: diseñar para atención dividida y distinta familiaridad con móviles.

### Criterios de cierre

- [x] Porteros integrados y gorros ordenados en resumen y selectores.
- [x] Datos prioritarios dominan la vista; sin tarjeta grande de portero ni contadores duplicados.
- [x] Atrás/Cerrar conservan posición, nombre y semántica en todos los pasos.
- [x] Texto, foco y áreas táctiles verificados con contenido realista y ampliado.
- [x] Capturas nuevas de estados críticos revisadas, sin cortes, saturación o pérdida de zona útil.
- [x] Regresiones funcionales y de persistencia pasan sobre la misma versión visual.
- [x] Ensayo con delegados registrado, o explícitamente pendiente sin declarar que ellos validaron el diseño.
- [x] Guía/documentos distinguen implementación, aceptación y despliegue.

## 11. Aprendizajes para la siguiente iteración

Antes de añadir una pieza, decidir qué tarea facilita, cuánto espacio consume y qué reemplaza. «Más visible» no significa «más grande y separado». Una excepción funcional usa la misma navegación. El gorro es el ancla de búsqueda y no se reorganiza por rol o rendimiento. Las medidas de accesibilidad son condiciones de trabajo; la facilidad se comprueba siguiendo un partido.

Skills aplicadas: [redesign](../../.agents/skills/redesign/SKILL.md), [mobile-first-design](../../.agents/skills/mobile-first-design/SKILL.md) y [web-design-guidelines](../../.agents/skills/web-design-guidelines/SKILL.md). Referencias: [directrices de interfaces de Vercel](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md) y W3C enlazadas. Se adaptan al castellano, al sistema del club y a esta tarea; no justifican adornos, patrones nuevos ni cambios de datos innecesarios.

## 12. Resultado implementado

El marcador, el cuarto, el parcial y el estado de guardado forman una sola cabecera. La tabla vuelve a ser el centro de la pantalla: todos los jugadores de Morvedre aparecen del 1 al 14, incluidos los porteros, y cada portero muestra paradas y goles encajados dentro de su fila. Las sanciones colorean la fila completa y conservan cantidad y texto. A partir de 360 px se comparan ambos equipos en paralelo; a 320 px se usa un selector claro entre Morvedre y Rival para evitar celdas ilegibles.

La elección del portero queda en un control horizontal compacto. Los controles inferiores reúnen Morvedre, Rival, tiempo muerto con el número de pedidos, Corregir y Terminar cuarto. Los paneles usan siempre la misma cabecera con Atrás, contexto, título y Cerrar. Cerrar una asistencia o un penalti pendiente conserva la jugada principal ya guardada y no vuelve a abrir el paso descartado.

La auditoría de navegador usa datos sintéticos y los elimina al terminar. Pasó en 320×568, 360×640, 375×667, 390×844, 393×852, 412×915, 430×932, 768×1024 y 844×390, sin desbordamiento horizontal y con controles activos de al menos 48 px. En 375×667 quedan cuatro jugadores completos visibles por encima de los controles. También pasó el reflujo con texto al 150 % y 200 %, el foco del cierre de cuarto, el registro y sincronización offline, las sanciones, tiempos, correcciones, seis cuartos y la descarga del PDF. TypeScript y ESLint no devolvieron errores; 46 pruebas focalizadas pasaron. Los avisos `act(...)` existentes de algunos tests no cambian su resultado, pero conviene limpiarlos cuando se revise esa infraestructura.

La aceptación humana de esta versión continúa pendiente. La valoración anterior de «fácil e intuitivo» corresponde a una versión previa y se conserva como aprendizaje, no como aprobación automática del rediseño actual.
