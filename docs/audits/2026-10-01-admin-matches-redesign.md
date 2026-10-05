# Partidos del panel de administración: revisión y rediseño

Fecha: 1 de octubre de 2026.

## Alcance y propósito

Gestionar encuentros: encontrar los pendientes, consultar los terminados, crear un partido y corregir sus datos. Se rediseñan `/admin/matches`, su formulario de creación y `/admin/matches/[id]/editar`. La convocatoria y el acta conservan sus flujos propios. La demo independiente no se modifica.

Respaldo anterior de los cuatro archivos existentes en `backups/admin-matches-before-redesign-2026-10-01/`, con extensión `.tsx.txt` para no incorporarlos a la comprobación TypeScript.

## Auditoría previa y correcciones

| Hallazgo                                                                     | Corrección                                                                                                |
| ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Cabeceras, métricas y filtros competían con la lista; estados mezclados      | Una cabecera, acción Nuevo partido y pestañas Por jugar, Jugados y Cancelados                             |
| Tarjetas con escasa jerarquía y acciones difíciles de identificar            | Cabecera azul con fecha y estado; local/visitante, resultado, piscina con contorno y acciones explícitas  |
| Formulario largo, sin distinguir datos obligatorios y opcionales             | Creación en Equipos, Fecha y Revisar; Maps y notas opcionales se despliegan cuando se necesitan           |
| El fondo seguía desplazándose al abrir la creación                           | Lámina modal con bloqueo del documento, foco contenido y restauración del desplazamiento y foco al cerrar |
| Edición con controles y superficies diferentes                               | Controles, tarjetas, etiquetas, errores y botones compartidos entre creación y edición                    |
| Riesgo de perder datos al cerrar o regresar                                  | Confirmación del acta; conservar, descartar o guardar según el flujo                                      |
| Cancelación del partido fácil de confundir con guardar una corrección        | Confirmación específica antes de guardar el estado Cancelado                                              |
| Cambiar filtros y volver desde edición hacía perder el contexto              | Filtros en URL; regreso validado al listado con pestaña, equipo, competición y búsqueda                   |
| Modificar otro dato podía limpiar la piscina histórica                       | Conservar `pool_name` si no cambia la sede; proteger el lugar y Maps introducidos manualmente             |
| En visitante era fácil interpretar el resultado en orden incorrecto          | Resultado y nombres en orden local–visitante, cifras alineadas y etiquetadas                              |
| Acceso a edición sin permiso del equipo                                      | Mostrar Editar únicamente para equipos gestionables; conservar además la autorización del servidor        |
| Espacio y scroll innecesarios en la revisión final                           | Resumen de altura natural, edición directa de los pasos y notas plegadas                                  |
| Contraste insuficiente del contador naranja de notificaciones en la cabecera | Texto azul oscuro sobre naranja; ajuste mínimo del componente compartido                                  |

Durante la prueba real se detectó además que reutilizar `window.history.state` impedía actualizar los filtros en Next.js. Se utiliza `replaceState(null, ...)`, conforme a la documentación de la versión instalada, y se verificó la selección real de pestañas y equipos.

## Diseño y accesibilidad

- Superficies blancas con contornos oscuros, cabeceras azules y tipografía coherente con el acta.
- Controles táctiles de al menos 48 px; entradas y botones principales de 56 px.
- Etiquetas asociadas, errores concretos vinculados con `aria-describedby`, avisos con `role="alert"` y foco al campo incorrecto.
- Pestañas operables mediante flechas, Inicio y Fin, estado seleccionado accesible y un panel asociado.
- Selección Local/Visitante mediante radios reales; selectores nativos para equipo, competición y estado.
- Pie de guardado visible sobre la navegación inferior; envío pendiente bloquea acciones duplicadas y cierre.
- Respeto de áreas seguras y reducción de movimiento en indicadores de carga.
- Pantalla de carga específica, sin un skeleton que invente la estructura final.

## Evidencias

Revisión visual en ventanas móviles de 393 × 852 y 412 × 915 px. No se detectó desbordamiento horizontal en los flujos revisados. En el resumen cerrado de 412 × 915, la lámina mide 676 px y el contenido visible no necesita scroll interno. Maps o notas pueden abrir contenido adicional y desplazarlo dentro de la lámina manteniendo el pie visible.

Comprobaciones automatizadas axe-core con etiquetas WCAG 2 A/AA, 2.1 AA y 2.2 AA:

| Vista                                    | Comprobaciones superadas | Incidencias detectadas |
| ---------------------------------------- | -----------------------: | ---------------------: |
| Listado completo, incluida la navegación |                       30 |                      0 |
| Edición: Piscina                         |                       21 |                      0 |
| Creación: revisión final                 |                       18 |                      0 |

Resultados en [accessibility.json](evidence/admin-matches-redesign-2026-10-01/accessibility.json). Capturas en la misma carpeta: listado inicial, tarjetas y revisión de creación.

Pruebas de regresión: **18 pruebas superadas** en `admin-match-form.test.tsx`, `admin-matches-list.test.tsx` y `match-details-form.test.tsx`. Cubren filtros, teclado, permisos visibles, orden del marcador, rutas de retorno, validación, datos entre pasos, descarte, foco, bloqueo del fondo, error de servidor, doble envío, conservación de sede y confirmación de cancelación. Las mutaciones están simuladas: no se crean ni modifican partidos reales durante estas pruebas.

TypeScript y ESLint: superados en la última ejecución. Compilación de producción `npm run build`: superada. El servidor local se restaura en el puerto 4184 tras compilar.

## Límites de la verificación

La comprobación automática no certifica conformidad WCAG completa. No se ha realizado una prueba con VoiceOver/TalkBack, Safari físico ni delegados reales. Los tamaños son ventanas de navegador equivalentes a móviles actuales, sin simular su sistema operativo. Se conserva la autorización, la validación del servidor y las Server Actions de Core; no se cambia la base de datos ni la sincronización del acta.

## Ajuste tras revisión del usuario

La segunda revisión sustituye las pestañas visibles por un único panel Filtros con tres selectores: estado, equipo y competición. La vista inicial muestra todos los partidos y categorías; solo permanecen visibles búsqueda y botón Filtros. Este cambia a azul oscuro con un contador cuando existen filtros aplicados. El contador gris se retira de la vista y se conserva únicamente como anuncio accesible de resultados.

La búsqueda admite fragmentos y varias palabras sin distinguir tildes ni mayúsculas. Las tarjetas muestran Morvedre sin repetir categoría, y eliminan los rótulos visibles Local/Visitante conservando el orden y las etiquetas accesibles. Se actualizan las pruebas del listado: seis superadas, incluidos Turia, BenePlácito y Alevín. ESLint y TypeScript superados. Esta revisión posterior no ha requerido recompilar producción.

### Pantalla de carga

La carga de partidos se amplía y centra en el espacio disponible entre cabecera y navegación, con tarjeta blanca de contorno oscuro, cabecera azul, indicador de 64 px y título de 24 px. Revisión visual en 393 × 852; captura `evidence/admin-matches-redesign-2026-10-01/loading-mobile.png`. La ruta temporal utilizada para mostrar el componente se elimina al terminar.
