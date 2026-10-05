# Equipos: rediseño, accesibilidad y revisión funcional

Fecha: 2 de octubre de 2026. Ámbito: Morvedre Core local.

## Resultado

Se rediseñan `/team`, `/admin/teams`, sus fichas, la gestión de plantilla y personal, la creación y edición de equipos, los perfiles de jugadores y las pantallas vinculadas de tiempos de nado. Se conserva la estructura deportiva, Escuela, las temporadas y los permisos existentes. No se modifica ni publica la demo.

Antes de editar se conservó una copia de los archivos de equipo, consultas y acciones en `tmp/teams-before-2026-10-02/source.zip`. Es un respaldo de este ámbito, no de toda la aplicación ni de la base de datos. Los cambios previos de tienda y acta se mantienen.

## Auditoría inicial y solución

| Hallazgo                                                                        | Solución aplicada                                                                                                                    |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Directorios con controles y tarjetas antiguos, poca jerarquía y contraste débil | Directorio compartido con cabeceras azules, tarjetas blancas delimitadas, búsqueda visible y filtros agrupados                       |
| Búsqueda sensible a acentos y selecciones poco claras                           | Normalización de tildes, mayúsculas, espacios y signos; búsqueda por varias palabras; filtros aplicados visibles y opción de limpiar |
| Administración mezclaba plantilla, personal y datos                             | Tres secciones con botones separados y estado activo azul                                                                            |
| Formularios y confirmaciones inconsistentes                                     | Láminas con cabecera azul reutilizadas del acta, acciones claras, fondo bloqueado y protección de cambios al cerrar la edición       |
| Listas de candidatos truncadas y funciones del personal poco comprensibles      | Búsqueda en todos los candidatos cargados, funciones en castellano y revisión de persona/gorro antes de añadir                       |
| Plantilla pública con prioridad visual del personal y nombres largos            | Jugadores primero, búsqueda propia, gorros, abreviación progresiva en una línea y personal debajo                                    |
| Tiempos de nado difíciles de consultar o registrar                              | Tarjetas delimitadas, últimos tiempos de 50/100 m separados, registro por pasos y retorno a la pestaña Tiempos                       |
| Cargas, vacíos y errores inconsistentes                                         | Componentes compartidos con contornos, mensajes concretos y reintento de carga                                                       |
| Indicaciones ambiguas durante una navegación lenta                              | Indicador de navegación dentro de cada botón, sin cambiar su tamaño                                                                  |

## Errores funcionales corregidos

1. **Ficha administrativa que no cargaba.** Supabase devolvía `PGRST201` porque existían dos relaciones entre equipos y temporadas. Se especifica `teams_season_id_fkey` en las consultas afectadas.
2. **Selector que fallaba al renderizar.** Se intentaba clonar desde el cliente un botón recibido como referencia diferida del servidor. Los formularios ahora crean su propio botón y reciben únicamente su etiqueta.
3. **Jugador retirado que no se podía reincorporar.** La fila histórica impedía insertar otra por la restricción de unicidad. Se reactiva la fila existente, conservando su historial. Una actualización concurrente sin filas afectadas muestra un error en vez de anunciar éxito.
4. **Jugadores que desaparecían de la plantilla pública.** La agrupación excluía edades desconocidas o excepciones deportivas. Se conserva todo el roster; solo se separan los refuerzos de la categoría inmediatamente inferior.
5. **Categoría calculada con otra temporada.** Las fichas utilizan el año de inicio de la temporada del equipo. La categoría sigue siendo derivada, no almacenada.
6. **Datos antiguos tras una edición.** Las acciones actualizan también las rutas públicas y administrativas afectadas; guardar tiempos invalida la pestaña del equipo.
7. **Fallos de consulta mostrados como listas vacías.** Las consultas distinguen un error de carga de un resultado legítimamente vacío.
8. **Partidos cancelados en Por jugar y límite de consulta insuficiente.** Se excluyen cancelados y se eleva el límite de 30 a 1000 partidos del equipo. Este cambio no implementa paginación para más de 1000 registros.
9. **Registro de tiempos susceptible a doble toque o cambios durante el envío.** Se bloquean los controles durante el guardado y se conserva el identificador de operación al reintentar los mismos datos tras un fallo de conexión.
10. **Confirmación de tiempo inusual reutilizada al cambiar de distancia.** Cambiar la distancia requiere una nueva revisión del tiempo inusual.
11. **Errores de red sin recuperación en edición/anulación de tiempos.** Se muestran errores concretos y se conservan los datos introducidos.
12. **Semántica accesible incorrecta.** Se corrigen las etiquetas de nombres abreviados, la descripción del color y la estructura de términos/valores del historial de tiempos.

## Accesibilidad y comprobación móvil

- Tamaños principales revisados: 393 × 852 y 412 × 915 px; comprobación adicional de 320 × 760 px.
- Controles del registro de tiempos: ninguna dimensión táctil inferior a 48 px en la medición de 320 px y sin desbordamiento horizontal.
- Las etiquetas Minutos, Segundos y Centésimas caben en una línea a 320 px. Se midieron con Pretext tras ajustar el reparto de columnas.
- Los botones Plantilla, Personal y Datos se midieron también con Pretext a 393 px: una línea por etiqueta.
- Axe con reglas WCAG 2 A, AA y 2.2 AA, acotado al contenido principal o al diálogo. Las verificaciones finales realizadas no dejaron infracciones ni resultados incompletos en los directorios público y administrativo, Datos, Resumen, Plantilla, Partidos, Tiempos, formulario de registro e historial de tiempos. El formulario de nuevo equipo también obtuvo cero infracciones e incompletos.
- Se revisan visualmente colores, contornos, nombres, navegación, jerarquía y tamaño de controles. El foco de los diálogos vuelve al botón de apertura al cancelar.

## Pruebas funcionales

En el navegador autenticado se verificaron búsqueda sin tildes, entrada a las fichas, las secciones administrativas y públicas, creación sin guardar, confirmación de salida con cambios, elección de jugador y gorro sin guardar, selección por función del personal, cancelación de retirada, apertura de edición, búsqueda en plantilla, perfil de jugador y retorno desde historial a Tiempos.

No se realizaron altas, bajas ni registros de tiempos sobre los datos reales durante estas pruebas. Las mutaciones y sus fallos se verificaron con pruebas automatizadas y dobles de servidor.

Suite específica: **80 pruebas correctas en 8 archivos**:

- `team-presentation.test.ts`: búsqueda, orden y conservación de jugadores.
- `team-actions.test.ts`: reincorporación, concurrencia y rutas afectadas.
- `team-management-ui.test.tsx`: filtros, creación, doble toque, salida, errores y confirmaciones.
- `teams.test.ts`: reglas deportivas existentes.
- `player-profile-navigation.test.ts`: navegación de perfiles.
- `swim-times.test.ts`: validación y reglas de tiempos.
- `swim-time-entry-list.test.tsx`: guardado, reintento y revisión de valores inusuales.
- `swim-history-list.test.tsx`: permisos, cancelación y conservación de datos tras error.

TypeScript y ESLint del ámbito revisado: correctos. Compilación de producción: correcta. Se elimina el componente de tarjeta antigua sin referencias y se comparten controles, directorio, navegación, estados y formularios.

## Evidencias

- [Gestión de equipos, 412 px](evidence/teams-2026-10-02/admin-teams-412.png)
- [Plantilla pública, 393 px](evidence/teams-2026-10-02/public-roster-393.png)
- [Registro de tiempos, 412 px](evidence/teams-2026-10-02/swim-entry-412.png)

## Alcance de la verificación

Las comprobaciones se han realizado en el navegador local con sesión administrativa y con pruebas automatizadas de permisos y dominio. No equivalen a certificación WCAG ni a pruebas con lector de pantalla nativo, dispositivos físicos o todos los perfiles reales del club. La consulta de historial mantiene un máximo de 1000 partidos. No se cambian el esquema de base de datos, RLS ni los permisos.
