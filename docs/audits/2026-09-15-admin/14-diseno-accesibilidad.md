# 14 · Diseño, lenguaje y accesibilidad

[Documento general](00-panel-general.md).

## Diagnóstico de estilo

La base compartida aporta botones de 48 px, foco visible, cabeceras, tarjetas y láminas Radix. No todo necesita sustitución. El problema es la combinación: cabeceras decoradas, tarjetas dentro de tarjetas, formularios de mantenimiento siempre abiertos, mucha negrita y texto secundario pequeño, y patrones distintos para tareas similares.

El panel usa variantes de redondeo, sombras, iconos y acciones de pie construidas por sección. Normalizar jerarquía es más importante que homogeneizar todo como tarjetas. Las observaciones de apariencia deben contrastarse con capturas; el CSS por sí solo no acredita comodidad visual.

## Dirección propuesta

**Mesa de trabajo del club:** información operativa legible, identidad Morvedre en cabecera y acentos, espacio reservado a datos y decisiones.

- Móvil: una tarea principal por pantalla, acciones próximas al objeto, detalles progresivos.
- Escritorio: navegación lateral, tablas para comparar y detalle con anchura limitada para lectura.
- Estructuras según tarea: bandeja de pendientes, lista de personas, semana de entrenamientos, ficha de partido, catálogo y revisión de cierre.
- Componentes específicos propuestos: «Contexto de equipo y temporada» y «Resumen de cambios sobre sesiones». Su valor es evitar errores, no la novedad visual.
- No introducir animación decorativa; mantener feedback de guardado y cambios de estado, con movimiento reducido.

## Hallazgos localizados

| ID | Fuente | Problema |
| --- | --- | --- |
| A11Y-01 | players-table.tsx, families-manager.tsx | Búsquedas sin label/aria-label propio |
| A11Y-03 | treasury-forms.tsx | Errores de los tres formularios iniciales sin role alert ni región de estado |
| A11Y-04 | shop-editor-form.tsx | Botones de portada no seleccionada solo contienen imagen decorativa; selección no anunciada |
| A11Y-05 | shop-editor-form.tsx | Field de fotos envuelve input y varios botones en una etiqueta; revisar asociación y estructura |
| A11Y-02 | admin/matches/[id]/page.tsx | Enlaces con semántica tab sin comportamiento/panel completo |
| A11Y-06 | roster-manager.tsx | FormLabel asociado a estructura de selección; buscador interno necesita nombre propio verificable |
| EST-01 | listas de jugadores, partidos, entrenamientos, personal | Filtros solo en estado local; al volver se pierde contexto |
| EST-02 | page-shell.tsx | overflow-x-clip puede ocultar contenido que sobresale aunque el documento no reporte scroll horizontal |

Fuentes completas en [Inventario](16-inventario.md). Revisar controles en su contexto antes de contar falsos positivos: el botón «sm» mide 48 px; el cierre de Sheet usa touch-target que también impone 48 px. No se ha demostrado un fallo de contraste global.

## Contrato de diseño del proyecto

### Observaciones de capturas actuales (V)

- Jugadores a 320 px: acción «Nuevo jugador» recortada por el borde derecho. El control existe, pero no resulta completamente legible.
- Tienda a 320 px: documento de 6.886 px de alto, con estados apilados y pedidos entregados en la misma página operativa.
- Tesorería a 320 px: documento de 11.273 px; la configuración de personas precede a los formularios de cierre. A 1440 px sigue midiendo 6.078 px.
- Inicio de escritorio: 24 equipos/3 temporadas en el resumen de demo y once tarjetas, sin contexto temporal ni prioridades; no usar esos recuentos como cifras del club real.
- Editor de producto accesible por URL directa: muestra Guardar y Eliminar; confirma que la carencia principal es la entrada al catálogo.

La barra inferior que aparece a media altura de una captura de página completa es un elemento fijo de la ventana: su posición en la imagen larga no demuestra por sí sola que una fila sea inaccesible al desplazarse.

1. Cabecera: sección, contexto útil y acción principal. Subtítulo solo si aporta información.
2. Filtros: etiquetas visibles; búsqueda, estado y equipo/temporada según tarea. URL conserva estado cuando debe sobrevivir a navegación.
3. Lista: nombres completos accesibles, estado textual, cantidades alineadas y acción identificable.
4. Formularios: datos mínimos primero, opcionales agrupados; no pedir IDs, URLs de imagen o códigos salvo necesidad real del operador.
5. Guardado: «Guardar cambios» con carga y bloqueo de doble envío; confirmar éxito o error. Nunca cerrar silenciosamente ante fallo.
6. Cambios sin guardar: salida deliberada y posibilidad de continuar; no diálogos nativos.
7. Destructivas: ConfirmActionSheet con objeto y consecuencia exactos; conservar historia cuando corresponda.
8. Vacíos: distinguir falta de datos, filtro sin coincidencias, permiso insuficiente, carga fallida y trabajo terminado.
9. Lenguaje: equipo frente a categoría; horario frente a bloque; «Cobrado» para registro económico; estados traducidos y fechas de Madrid.

## Accesibilidad: referencia y prueba

Objetivo propuesto WCAG 2.2 AA: navegación por teclado, foco visible/no tapado, nombres y relaciones, errores y mensajes de estado, reflow y contraste. Texto normal 4,5:1; texto grande 3:1; elementos gráficos esenciales 3:1. Comprobar zoom de texto al 200 % y reflow a 320 CSS px. El mínimo de objetivo táctil AA tiene condiciones/excepciones; el **contrato propio del club exige 48×48 px**. [Referencia W3C](https://www.w3.org/WAI/WCAG22/quickref/).

También se consultaron las [Web Interface Guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md) para etiquetas, foco, formularios y navegación. Sus convenciones de inglés no sustituyen el castellano y tono del club.

## Matriz de revisión manual

| Prueba | Qué debe comprobar |
| --- | --- |
| 320, 390, 768 y 1440 px | Sin contenido/acción recortados; no basta scrollWidth |
| Teclado | Orden, apertura/cierre, Escape, retorno de foco, guardado |
| Zoom y texto | Sin superposición, CTA accesible con teclado virtual |
| Lector de pantalla | Nombre, rol, estado, errores, selección y resultado |
| Contraste | Valores calculados sobre fondos reales, hover/foco/selección |
| Contenido extremo | Nombres largos, importes grandes, lista de 250 personas |
| Movimiento reducido | Sin transiciones imprescindibles para comprender |
| Red/error | Guardado fallido, sesión expirada y reintento claro |

No se emite certificación WCAG. Las pruebas dinámicas y pendientes concretos se registran en el documento de verificación.
