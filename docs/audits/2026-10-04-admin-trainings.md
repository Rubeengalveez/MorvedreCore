# Entrenamientos: auditoría y rediseño

Fecha: 4 de octubre de 2026. Ámbito: Core, `/admin/trainings` y sus efectos en calendario, asistencia, actividad familiar y avisos. La demo no se modifica. Core no se publica.

## Objetivo y resultado

La gestión distingue dos tareas: configurar el horario habitual y cambiar fechas concretas. Ambas comparten los controles, contornos oscuros, colores y láminas de confirmación del acta y la tienda. El alta recorre Equipos → Horario → Revisar; la última pantalla resume los datos antes de escribir.

| Hallazgo inicial                                                     | Solución                                                                                                           |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Crear por separado el mismo entrenamiento de varios equipos          | Una elección múltiple de equipos crea un horario conjunto y una tarjeta compartida por fecha.                      |
| Mezclar horarios habituales y sesiones puntuales                     | Vistas Fechas y Horario semanal, con navegación que sustituye la URL y conserva el origen de regreso.              |
| Controles antiguos, poco contraste y acciones dispersas              | Componentes compartidos con tienda y acta; botones reconocibles, superficies delimitadas, tipos con icono y texto. |
| Cambiar una semana obligaba a tocar muchas sesiones                  | Cambiar varios días permite elegir equipos y un periodo; se revisan las sesiones afectadas antes de guardar.       |
| Vacaciones difíciles de representar                                  | Rangos de descanso editables, conservados al renovar o modificar un horario.                                       |
| Ausencia de entrenamientos para jugadores concretos                  | Selección de participantes por equipo, búsqueda sin tildes y selección completa.                                   |
| Regenerar horarios podía perder excepciones                          | Cancelaciones, cambios puntuales y sesiones con asistencia conservan su identidad e historial.                     |
| Lecturas limitadas a 1.000 sesiones                                  | Lectura paginada, estable y acotada para el listado administrativo y la revisión de cambios por fechas.            |
| Duplicados al participar en dos equipos de un entrenamiento conjunto | Agrupación en calendario y actividad; deduplicación de asistencia y estadísticas, incluido el resumen familiar.    |

## Funciones disponibles

- Tres tipos para las altas y ediciones: Agua, Físico/seco y Reunión. Los tipos históricos se adaptan visualmente sin borrar sus datos.
- Horarios semanales con varios días y franjas; fechas sueltas, lugar y nombre opcional.
- Entrenamientos conjuntos de varios equipos y entrenamientos para jugadores concretos.
- Vacaciones por intervalos, con revisión de fechas excluidas.
- Edición, cancelación y reactivación de una sesión; edición o cancelación de varios días por equipos y periodo.
- Renovación de horarios vencidos y finalización con confirmación. Finalizar cancela las fechas futuras pendientes y conserva la asistencia registrada.
- Avisos para los participantes y sus familias vinculadas; el entrenador mantiene el acceso de asistencia de la temporada y el delegado no recibe ese control por ser delegado.
- Estados de carga, guardado, error y borrador sin guardar. Durante una navegación se bloquean las acciones sobre los datos anteriores.

## Protección de datos y permisos

Las mutaciones pasan por Server Actions con Zod y funciones transaccionales de Postgres que ejecutan con los permisos del usuario. Se comprueba cada equipo, la temporada actual, los jugadores elegidos y la pertenencia al grupo que se modifica. Las políticas RLS siguen activas.

Los bloqueos por equipo evitan cambios simultáneos incompatibles. Los solapamientos se rechazan tanto al crear o editar como al reactivar una fecha. Un error revierte la operación completa. Las sesiones con asistencia no permiten modificar fecha o participantes ni cancelarse mediante estas operaciones.

Un horario compartido que incluye equipos fuera del ámbito del gestor aparece sin acciones de modificación global. La edición de fechas opera sobre los equipos autorizados, sin ampliar sus permisos.

Las franjas poseen una identidad estable: si un horario tiene dos entrenamientos el mismo día, cancelar uno y renovar el horario no elimina el otro. Los cambios de lugar actualizan o retiran el enlace de mapa anterior según corresponda.

## Comprobaciones realizadas

### Código y dominio

- Build de producción correcto, incluido el chequeo de TypeScript de Next.js.
- TypeScript y ESLint correctos tras los últimos ajustes.
- 132 pruebas correctas en 11 archivos: gestión, formularios, paginación, entrenamiento, estadísticas, asistencia, historial, lista de asistencia, calendario y alcance de permisos.
- 14 pruebas adicionales de interfaz de gestión y familia correctas; parte de las pruebas de gestión se solapa con las 132 anteriores.
- Casos de cambio horario de Madrid, generación de fechas, vacaciones, solapamientos, selección de participantes, fechas de inicio futuras, errores de guardado y confirmaciones.

### Base de datos real, con reversión de las pruebas

`tests/integration/training-management.sql` comprueba operaciones bajo el rol autenticado y RLS. El conjunto termina con rollback.

- Alta conjunta, cambio de participantes y conservación de la fecha original.
- Cancelaciones y excepciones conservadas después de reemplazar un horario.
- Dos franjas en un día y tres renovaciones sucesivas sin perder la segunda franja.
- Creación y reactivación con conflictos rechazadas de forma atómica.
- Jugadores ajenos y usuarios sin permiso rechazados.
- Protección de sesiones con asistencia.
- Finalización que incluye excepciones futuras de versiones anteriores del mismo horario.

### Navegador y móvil

Se realizó un recorrido real por las Server Actions con dos equipos y un jugador exclusivamente de prueba: crear reunión conjunta, editar tipo y hora, limitar participantes, cancelar varios días, reactivar, crear horario semanal con vacaciones, editarlo y finalizarlo. Los datos de prueba se retiraron al terminar.

Revisión visual a 393 × 852 y 412 × 915; comprobación adicional de desbordamiento horizontal a 320 px. Los controles de fecha utilizan el selector nativo del dispositivo. Las láminas largas desplazan su contenido dentro del espacio disponible y mantienen las acciones accesibles.

Axe no encontró infracciones en los ámbitos revisados: listado semanal, selección de equipos y tipos, horario y confirmaciones. Se comprobó el bloqueo del fondo y el recorrido del foco dentro del diálogo. Estas comprobaciones automatizadas no equivalen a una certificación integral WCAG ni sustituyen la validación con usuarios del club.

Evidencia: [revisión del horario conjunto](evidence/trainings-2026-10-04/joint-training-review.png). La imagen corresponde a un borrador de comprobación; no se guardó un horario real del club.

## Integridad y punto de retorno

Estado previo conservado en `tmp/trainings-before-2026-10-03/`, con fuentes y copia de los datos de entrenamiento. Es una copia local para recuperación, no documentación pública ni material para publicar.

Antes y después: 11 bloques, 1.017 sesiones y 13.764 registros de asistencia. La comparación del contenido de asistencia coincide con el estado previo. Se añadieron metadatos y se actualizaron sus marcas técnicas; no se sustituyeron registros históricos de asistencia.

Se aplicaron seis migraciones de gestión conjunta, protección, identidad de franjas, metadatos de fecha, solapamientos y reactivación. Los componentes administrativos antiguos sin uso se retiraron.

## Límites operativos que permanecen

- La temporada marcada como actual en estos datos locales sigue siendo 2025/2026; los horarios existentes están vencidos. Se ofrece Renovar, pero no se cambia automáticamente la temporada ni se inventan horarios del club.
- Los avisos se comprobaron en base de datos y su integración conserva el procesador de entrega existente. La recepción push en dispositivos físicos con HTTPS sigue siendo la verificación operativa descrita en la auditoría de notificaciones.
- No se ha desplegado Core ni cambiado la demo. La prueba con los horarios y usuarios reales del club sigue siendo una validación de uso distinta de las pruebas técnicas.
