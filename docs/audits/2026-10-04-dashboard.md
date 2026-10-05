# Inicio · diseño, uso y accesibilidad

## Propósito y diagnóstico

Inicio se reorganiza alrededor de la actividad de la persona y su familia, las decisiones pendientes y las novedades del club. Se conserva una copia local del Inicio anterior en `tmp/dashboard-before-2026-10-04/`.

El diseño anterior dedicaba demasiado espacio a mensajes vacíos, cifras sin actividad y enlaces repetidos. La asistencia tenía protagonismo incluso sin listas pendientes. Las familias no podían explorar cómodamente la próxima actividad de cada hijo. La jerarquía, las superficies y las separaciones no compartían los criterios de las pantallas renovadas.

## Composición

- Cabecera azul profundo con escudo, saludo y fecha del club. Los avisos sin leer aparecen cuando existen.
- Para resolver: continuar el acta, autorizar pedidos familiares, completar listas de hoy o preparar pedidos de tienda. Cada acción depende de datos y permisos reales.
- Tu agenda: una actividad principal y hasta tres posteriores. Entrenamientos conjuntos agrupados, equipo, lugar y convocatorias visibles. Ficha con fecha, horario, participantes y mapa; acciones de acta exclusivamente para personal autorizado.
- Selector de actividad propia o de cada hijo. Con un único hijo y sin actividad deportiva propia, su actividad y estadísticas aparecen directamente.
- Tu temporada: partidos, goles y asistencias de actas finalizadas, incluidos los refuerzos en otras categorías. No se muestran cifras deportivas vacías a personas sin partidos.
- Último resultado: marcador local/visitante y resultado con penaltis cuando corresponde, usando el mismo cálculo de la ficha del partido.
- El club al día: dos noticias visibles, fecha y prioridad, con imagen cuando la noticia la tiene.
- Gestión: como máximo dos accesos adecuados al trabajo de la cuenta. Sol y Tesorería acceden a su módulo; los usuarios sin permisos no ven administración.

No se añaden enlaces de relleno que repitan la navegación principal. El orden móvil se mantiene en escritorio, distribuido en dos columnas cuando existe contenido secundario.

## Integridad y seguridad

- Consultas autenticadas bajo las políticas RLS existentes. Familia procede de los vínculos autorizados del servidor. Los perfiles vinculados no conceden permisos a la cuenta.
- El cliente recibe datos resumidos; no recibe documentos completos del acta, contactos privados ni tokens del perfil.
- Convocatorias de refuerzo incluidas aunque el partido pertenezca a un equipo distinto del habitual. La agregación de estadísticas selecciona los partidos donde está inscrita la persona.
- Exclusión de actividad cancelada o terminada. Conservación de los partidos en curso. Días y horas calculados en Europe/Madrid, incluido el cambio horario.
- Agrupación conjunta por identidad, fecha, duración, tipo y lugar, conservando los destinatarios por equipo.
- Un fallo parcial conserva el contenido disponible. Una agenda que no se ha podido cargar no se presenta como si no hubiera entrenamientos.
- Actualización al recuperar el foco después de un minuto y periódicamente mientras la página es visible. No interrumpe una ficha abierta.
- Regreso a Inicio desde partido, noticia, calendario, asistencia, aprobación de pedidos y salida del acta abierta directamente desde Inicio. Los otros orígenes existentes se conservan.
- Mapas externos limitados a HTTP/HTTPS y abiertos con protección de la ventana de origen.

## Evidencias

Pruebas automatizadas: **125 pruebas correctas en 13 archivos**, con comprobaciones de actividad, familias, permisos, refuerzos, errores parciales, estadísticas, marcador, asistencia y flujos deportivos relacionados. Tras los ajustes finales de consultas se repitieron **26 pruebas de Inicio y navegación**, correctas. TypeScript, ESLint de los archivos afectados y compilación de producción correctos.

Revisión del navegador con datos reales: último partido, noticia, asistencia y calendario abiertos desde Inicio; vuelta directa a Inicio comprobada. El resultado real con penaltis muestra 8–8 y 14–13 con penaltis, coherente con la ficha. Las estadísticas personales incluyen el partido jugado como refuerzo.

Escenario aislado con datos de prueba: familia con dos hijos, pedidos por autorizar, aviso sin leer, entrenamiento conjunto y partido convocado. Selección de un hijo, apertura por teclado, foco dentro del modal, cierre con Escape y devolución del foco al botón de origen comprobados. Este escenario no escribe en la base de datos ni añade una ruta de pruebas a Core.

Revisión visual a 393 × 852 y 412 × 915, además de escritorio. Sin desbordamiento horizontal en la página real. Títulos y rótulos principales medidos con Pretext antes de cerrar el diseño. Objetivos táctiles de las acciones de Inicio de al menos 48 px; selector de 56 px. Nombres adaptativos y títulos completos disponibles en la ficha de actividad.

Auditoría axe del documento real: **0 infracciones detectadas y 26 comprobaciones correctas** para las etiquetas WCAG A/AA incluidas. `color-contrast` conserva nodos que requieren revisión manual, por las superficies y elementos superpuestos del entorno. Se revisan las combinaciones principales de azul profundo, blanco, azul claro, azul de acción y amarillo. La automatización no acredita conformidad WCAG completa ni reemplaza pruebas con lectores de pantalla y usuarios del club.

La revisión automática mediante CDP del escenario aislado fue rechazada por la política de permisos del navegador. Se completó su revisión visual, por árbol de accesibilidad y con teclado; la auditoría automatizada corresponde al Inicio real.

Capturas y resultado automatizado en [evidencias](evidence/dashboard-2026-10-04/). La temporada actual guardada en la base de datos no se cambia: los datos reales consultados no tienen actividad futura en los siguientes 30 días. No se inventan entrenamientos para rellenar Inicio.

## Criterios consultados y alcance

La elección de una estructura familiar y de acciones consistentes se apoya en los patrones W3C de [propósito claro](https://www.w3.org/WAI/WCAG2/supplemental/patterns/o1p01-clear-purpose/), [diseño familiar](https://www.w3.org/WAI/WCAG2/supplemental/patterns/o1p02-familiar-design/) y [consistencia](https://www.w3.org/WAI/WCAG2/supplemental/patterns/o1p03-consistent-design/). Su aplicación concreta a la agenda y a las tareas es una decisión de diseño de Morvedre Core. Las consultas siguen la [documentación de selección de Supabase](https://supabase.com/docs/reference/javascript/select) y las APIs locales de Next.js 16.

No se modifica la demo ni se despliega Core. La validación con dispositivos físicos, lectores de pantalla y familias reales del club sigue siendo una comprobación operativa distinta de esta revisión local.
