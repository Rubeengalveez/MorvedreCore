# 09 · Entrenamientos y asistencia

[Documento general](00-panel-general.md). Sección de máxima prioridad.

## Qué queremos

El entrenador piensa «horario del equipo», «entrenamiento del jueves» y «pasar lista». Debe programar una semana, cambiar un día y saber qué verá la familia. No debería gestionar generación y resincronización de objetos técnicos.

## Inventario

| Tarea | Situación local |
| --- | --- |
| Crear horario semanal con varios grupos de días | Existe |
| Crear/editar bloque | Existe; edición llama luego a resincronización |
| Generar sesiones | Existe como acción explícita |
| Cancelar/reactivar sesión | Existe |
| Asistencia | Existe en panel y rutas de asistencia |
| Cambiar una sesión concreta de hora/lugar | No encontrado en los controles de sesión revisados |
| Crear entrenamiento aislado sin horario | No encontrado en el flujo visible revisado |
| Ver sesiones anteriores desde listado admin | La consulta solo carga desde ahora hasta cuatro semanas |
| Historial de asistencia | Existe fuera del listado administrativo |

## Hallazgos

- **ENT-01, P0 (C):** confirmación de `training-block-card.tsx` promete borrar futuras. `deleteTrainingBlock` elimina el bloque sin fecha; `0012_training_sessions.sql` y `0013_training_attendance.sql` encadenan borrado de sesiones y asistencia. Riesgo confirmado en contrato local; no se ha ejecutado borrado ni verificado el esquema remoto.
- **ENT-02, P1 (C):** `training-block-form-sheet.tsx` actualiza bloque y después llama a `resyncFutureTrainingSessionsAction`. Esta elimina e inserta en peticiones separadas. Si falla tras eliminar, el horario puede quedar parcialmente aplicado. No confundir con la función transaccional usada por otro flujo de creación.
- **ENT-03, P1 (C/R):** carga y opciones abarcan todos los equipos/temporadas. «Todos los equipos» mezcla cursos.
- **ENT-04, P1 (C):** el botón del estado vacío usa `defaultTeamId` y no el equipo filtrado. El formulario cambia equipo sin recalcular automáticamente el periodo inicial.
- **ENT-05, P2 (C):** ventana desde el instante actual elimina del listado sesiones ya comenzadas, aunque se quiera pasar lista hoy. Un vacío puede decir «No hay sesiones generadas» cuando solo no hay sesiones dentro de la ventana.
- **ENT-06, P2 (C):** mezcla «bloque», «horario», «categoría» y «equipo». «Generar más sesiones» obliga a entender funcionamiento interno.
- **ENT-07, P2 (C):** generar/reactivar no tienen captura local de errores equivalente a cancelar; experiencia de fallo desigual.

## Diseño propuesto

Tres vistas: **Semana**, **Horario habitual**, **Asistencia**. Equipo actual en cabecera; entrenador ve sus equipos. Semana abre en hoy y próximos días, con anterior/siguiente y fecha visible. Cada sesión: equipo, hora, piscina, estado y acciones.

«Crear horario» presenta días y horas, vigencia dentro de temporada, lugar y resumen de sesiones. «Editar horario» pregunta fecha efectiva y muestra cuántas sesiones cambiarán. «Cambiar este entrenamiento» afecta únicamente a una sesión. «Cancelar entrenamiento» explica aviso al equipo y mantiene registro. «Terminar horario» deja de generar futuro y conserva pasado.

El botón «Generar más sesiones» deja de ser una tarea habitual; la aplicación debe mantener coherencia al guardar. Antes de modificar futuro, mostrar sesiones con asistencia, canceladas y excepciones que se conservarán.

## Asistencia

Entrada contextual desde sesión de hoy y enlace estable a historial/resumen. Separar «sin registrar» de «presente»; los valores por defecto no equivalen a una lista guardada. Mostrar guardado, error, persona que registró y restricciones de fecha. Conservar las reglas actuales de quién puede pasar lista hasta validar cualquier cambio.

## Aceptación

1. Configurar Cadete B martes/jueves sin seleccionar temporada pasada.
2. Crear desde filtro Juvenil abre Juvenil, no el primer equipo.
3. Cambiar un jueves no modifica toda la semana.
4. Reprogramar futuro conserva pasado, asistencia y excepciones.
5. Fallo tras validación deja todo intacto o resultado recuperable exacto.
6. Terminar horario no borra asistencias; prueba SQL con fixtures y rollback.
7. Sesión iniciada hoy sigue accesible para pasar lista.
8. Escuela permite sus dos días sin funciones competitivas.
9. En 320 px, teclado y zoom se puede revisar y guardar sin controles ocultos.

## Dependencias y decisiones

Temporada, permisos deportivos, conservación histórica, avisos y tratamiento de solapamientos. Proponer detección de solapamiento, pero no bloquear equipos que compartan piscina sin conocer las reglas. No se han creado ni cancelado entrenamientos reales.

## Formulario observado

Se abre y cierra correctamente en los tres anchos probados, sin guardar. La mejora necesaria es el flujo: periodo inicial de 2025, opciones históricas, resumen de efectos y manejo de excepciones. No se declara que «el formulario no abre» a partir del primer intento afectado por carga.
