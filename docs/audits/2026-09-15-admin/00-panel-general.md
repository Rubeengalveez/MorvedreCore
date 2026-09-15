# Panel de administración: auditoría y plan de rediseño

Fecha: 15 de septiembre de 2026. Base: HEAD `29a0ff3` y árbol de trabajo local, con cambios previos sin commit. **Estado: auditoría para planificación; aplicación sin modificar.** La evidencia de navegador y sus límites se registran en [Verificación](15-verificacion.md). No se atribuye a producción lo observado localmente.

## Diagnóstico

El problema principal es que el panel reúne pantallas y operaciones, pero no ofrece recorridos completos de gestión. Hay capacidades existentes sin entrada visible, altas sin mantenimiento equivalente, criterios de temporada inconsistentes, errores que parecen ausencia de datos y demasiado trabajo para interpretar los formularios.

No procede limitar el trabajo a colores, tarjetas o botones. Cada sección necesita definir quién la usa, qué tarea termina, qué información necesita antes de decidir y cómo corrige un error después.

### Tus observaciones, contrastadas

| Observación | Evidencia actual | Consecuencia |
| --- | --- | --- |
| No se pueden crear partidos | Existe formulario y Server Action. El botón depende de que se carguen equipos editables; puede desaparecer sin explicación | Diagnosticar cuenta, equipos, consulta y versión publicada; no implementar otra creación duplicada |
| No salen jugadores | Reproducido con demo: consulta rechazada al pedir teléfono, email y notas; los IDs permitidos cuentan 210 perfiles. El error se oculta | Usar lectura administrativa autorizada sin abrir datos privados a todos; corregir errores y refresco |
| Solo se pueden añadir productos | Existen editar y eliminar, pero falta el listado de catálogo administrativo y enlaces de entrada | Recuperar gestión completa desde Tienda; retirar productos con historial mediante ocultación |
| Entrenamientos mezcla temporadas | Consulta y selectores incluyen todas; el formulario vacío no hereda el filtro seleccionado | Operación sobre la temporada actual, histórico separado |
| Demasiadas cosas y faltan acciones | Once tarjetas al mismo nivel; Solicitudes no aparece; tesorería mezcla mantenimiento y cierre; varias acciones solo existen en servidor | Nueva arquitectura por trabajo, con ciclos completos y acciones localizables |

## Alcance y método

Revisión funcional del código de páginas, componentes, consultas, acciones y esquema local pertinente; revisión heurística de estilo, claridad y accesibilidad; recorrido local de lectura; propuestas de tareas y criterios de aceptación. El inventario de rutas y acciones está en [Inventario](16-inventario.md).

Clasificación de evidencia:

- **C:** confirmado en código local. Una función existente no demuestra que se ejecute correctamente en producción.
- **V:** observado en navegador; especificar ruta, cuenta, tamaño y estado.
- **R:** reportado por Rubén, aún sin reproducción exacta.
- **P:** propuesta de producto; no es requisito previo incumplido ni implementación autorizada.
- **H:** hipótesis que necesita prueba de datos, permisos o entorno.

No se han enviado comunicaciones, generado cierres, cambiado permisos, aprobado solicitudes ni borrado datos para esta revisión. Las escrituras y la autorización por roles se ensayarán con datos sintéticos aislados. El SRS original completo no está en esta conversación: se han usado AGENTS.md, decisiones, guías y código; no se afirma conformidad total con un SRS no disponible.

## Documentos por sección

| Sección | Documento | Objetivo |
| --- | --- | --- |
| Inicio y navegación | [01](01-inicio-navegacion.md) | Saber qué requiere atención y llegar a la tarea |
| Solicitudes y cuentas | [02](02-solicitudes-acceso.md) | Resolver altas sin duplicados ni errores invisibles |
| Jugadores | [03](03-jugadores.md) | Mantener una ficha y completar su incorporación |
| Importación | [04](04-importacion.md) | Cargar datos, revisar conflictos y conocer el resultado |
| Familias | [05](05-familias.md) | Mantener vínculos y entender su alcance |
| Personal y permisos | [06](06-personal-permisos.md) | Dar capacidades correctas a personas concretas |
| Equipos y plantillas | [07](07-equipos.md) | Mantener equipos de la temporada actual |
| Temporadas e histórico | [08](08-temporadas.md) | Preparar y activar curso sin mezclar gestión e histórico |
| Entrenamientos y asistencia | [09](09-entrenamientos.md) | Programar semana, resolver excepciones y pasar lista |
| Partidos, convocatoria, actas y viajes | [10](10-partidos.md) | Completar el ciclo del partido |
| Tienda: catálogo y pedidos | [11](11-tienda.md) | Mantener productos y atender pedidos |
| Tesorería | [12](12-tesoreria.md) | Mantener cargos y completar el cierre mensual |
| Noticias | [13](13-noticias.md) | Publicar, revisar, corregir y retirar avisos |
| Diseño y accesibilidad | [14](14-diseno-accesibilidad.md) | Contrato común de interacción y presentación |

## Prioridades

P0 = riesgo de pérdida de información o cambio silencioso; P1 = bloqueo de una tarea esencial; P2 = fricción importante; P3 = mejora secundaria. Las prioridades indican orden de trabajo, no vulnerabilidades verificadas en producción.

| ID | Prioridad | Evidencia | Hallazgo / trabajo |
| --- | --- | --- | --- |
| ENT-01 | P0 | C | Borrar un bloque promete afectar al futuro, pero DELETE y cascadas alcanzan sesiones y asistencia |
| JUG-01 | P0 | C | Editar ficha omite campos de Escuela y la acción los restablece a false |
| ENT-02 | P1 | C | Editar bloque y resincronizar sesiones son pasos separados; posible estado parcial |
| NAV-01 | P1 | C | Solicitudes sin entrada en el panel |
| TIE-01 | P1 | C | Catálogo administrativo ausente; edición/eliminación sin enlace de entrada |
| JUG-02 | P1 | C/V/R | Consulta rechazada por columnas privadas convertida en plantilla vacía |
| JUG-03 | P1 | C | Copia local de jugadores no sincronizada con nuevas props |
| ACC-01 | P1 | C | Aprobaciones/rechazos no muestran result.error; lote puede ocultar resultado parcial |
| PAR-01 | P1 | C/R/H | Nuevo partido desaparece si no hay equipos editables; causa del caso de Rubén pendiente |
| TES-01 | P1 | C | Conceptos y asignaciones sin mantenimiento visible equivalente al alta |
| ENT-03 | P1 | C/R | Temporadas pasadas disponibles en la operación cotidiana |
| DAT-01 | P1 | C | Categoría visual basada en año de reloj, diferente del año de temporada usado al asignar |
| TIE-02 | P1 | C | Cancelación inmediata e irreversible en el flujo permitido; desaparece del tablero |
| A11Y-01 | P1 | C | Búsquedas sin nombre asociado y errores asíncronos sin anuncio en flujos concretos |
| FAM-01 | P2 | C | Vínculos sin edición contextual; filtros dependen de edad y no explican exclusiones |
| PER-01 | P2 | C | Personal mezcla asignación deportiva y permisos globales; descripción desactualizada |
| EQU-01 | P2 | C | Plantilla detrás de Personal, tipos internos sin traducir y gorro sin edición directa |
| TEM-01 | P2 | C | Preparar/activar/archivar necesitan secuencia clara; guía aún remite a scripts |
| PAR-02 | P2 | C | Listado parte de un equipo y orden ascendente; falta prioridad a lo próximo |
| PAR-03 | P2 | C | Borrado y desvalidación tienen acciones sin recorrido visible encontrado |
| TIE-03 | P2 | C | Pedidos excluidos de la vista, sin búsqueda ni histórico completo |
| TIE-04 | P2 | C | Imágenes existentes sin gestión individual; etiqueta agrupa varios controles |
| TES-02 | P2 | C | Exceso de formularios y códigos/estados en inglés |
| NOT-01 | P2 | C | Destinatarios de todas las temporadas con etiquetas iguales |
| NOT-02 | P2 | C | 200 noticias sin paginación; sin separación clara de caducadas |
| NAV-02 | P2 | C | Contadores globales históricos; no pendientes accionables |
| NAV-03 | P2 | C | Falta navegación administrativa persistente entre secciones |
| EST-01 | P2 | C | Filtros de estado local y vuelta sin conservación de contexto |
| A11Y-02 | P2 | C | Semántica de pestañas no acompañada por el patrón completo |
| GUI-01 | P2 | C | Guía promete una entrada inexistente y cifras operativas históricas |

El detalle, la causa y la prueba exigida están en cada ficha. No todos los problemas necesitan funciones nuevas: varios se resuelven con navegación, contexto, mensajes y reutilización de acciones existentes.

## Arquitectura propuesta

Cinco áreas, visibles según las capacidades reales de la cuenta:

1. **Inicio:** pendientes, contexto de temporada y accesos frecuentes.
2. **Personas:** Solicitudes, Jugadores, Familias, Personal y permisos. Importar dentro de Jugadores.
3. **Deporte:** Equipos, Entrenamientos, Partidos. Asistencia conectada con sesiones; acta y viaje conectados con el partido.
4. **Gestión:** Tienda y Tesorería, con sus propias subnavegaciones.
5. **Comunicación y curso:** Noticias; Temporadas e histórico en configuración de administración total.

En móvil: cabecera breve, selector de área, sección actual y vuelta clara. En escritorio: navegación lateral y espacio central adecuado a tablas. No añadir simultáneamente dos barras inferiores que compitan. Mantener una salida visible a la app del club.

La temporada actual es el contexto operativo por defecto. Equipos históricos no aparecen al crear entrenamientos o partidos ordinarios. El histórico tiene entrada explícita de consulta. La preparación del siguiente curso tiene un flujo separado; no basta con filtrar por `archived_at`, porque una temporada antigua podría seguir sin archivar.

## Roles y alcance

| Perfil | Tareas propuestas | Límite que debe probarse |
| --- | --- | --- |
| Rubén/admin total | Configuración, personas, módulos y supervisión | Acta en directo conserva la condición específica de delegado actual |
| Entrenador | Horarios, asistencia, partidos/convocatorias de sus equipos | No otros equipos ni permisos globales |
| Delegado | Operación del partido y acta/viaje según capacidades | No programación general por ser delegado |
| Eva/secretaría | Personas, familias y accesos si se aprueba delegar esta capacidad | Solicitudes actualmente requiere admin total |
| Mónica/tesorería | Cargos, pagadores, cierre, Excel y envío | Sin gestión deportiva o permisos implícitos |
| Sol/tienda | Catálogo y pedidos | Sin tesorería completa ni acceso general a personas |
| Familiar/jugador | Su uso habitual del club | Sin acceso administrativo por cambiar perfil familiar |

Los nombres describen trabajo del club; la asignación real se debe validar. Un cargo no implica automáticamente todas las capacidades.

## Plan por entregables

| Orden | Entregable | Dependencias | Puerta de salida |
| --- | --- | --- | --- |
| 1 | Estabilización de datos y errores: ENT-01/02, JUG-01/02/03, ACC-01 | Entorno de prueba y cuentas por rol | Ensayos sintéticos de conservación, error y reintento |
| 2 | Contexto de temporada, mapa de capacidades y navegación | Inventario de equipos/temporadas y permisos reales | Todas las entradas y causas de bloqueo visibles |
| 3 | Prototipos de Jugadores, Entrenamientos, Partidos y Catálogo | Pasos 1–2 definidos | Rubén completa escenarios sin ayuda |
| 4 | Personas, Equipos y Temporadas | Contratos comunes y criterios de categorías | Alta completa y transición ensayadas |
| 5 | Tienda, Tesorería, Noticias | Acuerdo sobre retiradas, correcciones y estados | Ciclos completos y exportaciones contrastadas |
| 6 | Accesibilidad y pruebas de uso por rol | Cada flujo listo | Teclado, zoom, móvil real y recuperación de errores |
| 7 | Guías y validación de lanzamiento | Evidencias de pasos anteriores | Pendientes explícitos; sin declarar cierre por build |

Aplicar accesibilidad en cada entrega, no dejarla para una corrección final. No estimar días hasta resolver fallos y acotar las decisiones de producto. El tamaño de trabajo es alto en Entrenamientos/Tienda/Personas, medio en Partidos/Tesorería/Temporadas y menor en navegación de Noticias, pero las verificaciones operativas siguen siendo necesarias.

## Decisiones que necesita la planificación

- Confirmar qué catálogo y estados de pedidos siguen vigentes; no borrar productos por parecer antiguos.
- Acordar si Eva debe aprobar accesos mediante capacidad específica.
- Definir la corrección excepcional de actas validadas y quién la autoriza.
- Acordar si se pueden preparar horarios futuros antes de activar la temporada y desde qué flujo.
- Acordar correcciones de pedidos entregados y cargos enviados, preservando historial.
- Validar si se requiere borrador de noticias; es una propuesta, no una carencia frente al alcance cerrado.

La petición actual autoriza la auditoría y estos documentos. Las propuestas quedan abiertas a revisión antes de implementar.
