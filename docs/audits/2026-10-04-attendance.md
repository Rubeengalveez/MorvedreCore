# Pasar lista · Auditoría y rediseño

## Objetivo

Simplificar `/attendance` y el registro de una sesión para Vitaliy y otros entrenadores con poca experiencia tecnológica. Prioridad: encontrar el entrenamiento, reconocer quién ha venido y terminar con un estado de guardado claro. Se conserva el resumen de asistencia renovado durante la revisión del calendario.

Copia previa: `C:/Users/galvi/Documents/Morvedre Core snapshots/attendance-before-2026-10-04/`. Se conserva fuera del proyecto para evitar que TypeScript compile archivos históricos.

## Hallazgos y cambios

| Hallazgo                                                                              | Solución                                                                                        |
| ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Selector de fecha con demasiados controles visibles y altura                          | Barra compacta con flechas, fecha pulsable y selector en lámina con cabecera azul               |
| Etiquetas de fecha con caracteres dañados                                             | Textos en castellano y fecha de Europe/Madrid                                                   |
| «Hoy» podía conservar el día histórico al llegar desde el calendario                  | El enlace incluye explícitamente la fecha actual, conservando el contexto de regreso            |
| Tarjetas de entrenamientos sin jerarquía suficiente                                   | Equipo y hora destacados; tipo real, plantilla y estado del registro separados                  |
| Filas de jugadores altas y acciones alejadas del nombre                               | Una fila con nombre adaptable y botones «Sí»/«No» de 56 px                                      |
| Terminar exigía recorrer una plantilla larga                                          | Botón fijo «Guardar lista y volver» por encima de la navegación, con estado y recuento          |
| Edición durante el guardado final podía añadir escrituras posteriores                 | Controles bloqueados al terminar; se espera a la cola completa antes de salir                   |
| Errores de consulta se podían interpretar como ausencia de entrenamientos o jugadores | Error recuperable; no se presenta una lista vacía como resultado válido de una consulta fallida |

## Flujo y seguridad

- Una lista nueva prepara a todos en «Sí» sin realizar una escritura al abrirla. Se marcan las faltas con «No» y se termina con «Guardar lista y volver».
- Los cambios se guardan en orden mediante la Server Action existente. Pulsar el valor ya seleccionado no genera otra escritura. Si falla, se mantienen las selecciones y aparece «Reintentar guardado».
- La sesión futura permite consultar la plantilla, sin botones de asistencia ni guardado.
- Se conserva el regreso al calendario, Inicio, actividad personal o entrenamientos de administración según el origen.
- No se amplían permisos. La gestión utiliza la cuenta real y la autorización existente `requireAttendanceManagerOf`, además de RLS y validación Zod. La política actual permite a entrenadores autorizados gestionar los equipos de la temporada; un delegado sin ese permiso no lo adquiere mediante esta pantalla.
- Los entrenamientos conjuntos mantienen sus sesiones por equipo y la plantilla correspondiente; el rediseño no mezcla registros entre categorías.
- La sencillez de esta pantalla exige pocas secciones y acciones visibles. Se aplican las skills de rediseño y accesibilidad con esa prioridad, evitando módulos decorativos o explicaciones extensas.

## Evidencias

- 46 pruebas relevantes: preparación sin escritura, guardado explícito, cambios rápidos y cola de guardado, reintento, regreso contextual, sesión futura, fechas, Madrid, selección de jugadores y errores de consulta; regresiones relacionadas de calendario, historial e Inicio.
- ESLint de los ocho archivos de implementación y pruebas: correcto.
- TypeScript: correcto. Build Next 16.3.3: correcto, incluyendo generación de rutas. El primer intento detectó únicamente la copia histórica dentro de `tmp`; trasladada fuera del proyecto y repetido con éxito.
- Capturas móviles 393×852 de la entrada y el registro de una sesión guardada en `evidence/attendance-2026-10-04/`.
- Sin desbordamiento horizontal en la entrada comprobada. Botones principales de al menos 48 px; «Sí» y «No» de 56 px. «Hoy» se ajustó a 48 px de ancho mínimo tras medirlo.
- Axe sobre el contenido principal de ambas vistas: cero infracciones automáticas. Quedaron comprobaciones incompletas de atributos y, en la sesión, de contraste; no equivale a una certificación de accesibilidad.
- Validación Pretext con `prepare`/`layout`: fecha larga «Hoy · miércoles, 30 sept», acción de guardar y etiquetas de tarjeta caben en una línea a los anchos móviles medidos.
- Comprobados visualmente el selector de fecha con la lámina actual y su cierre. Las escrituras se verifican con Server Action simulada: no se modificó asistencia real ni se enviaron notificaciones de prueba.

## Límites

Falta validar con Vitaliy y con lector de pantalla real. La automatización del navegador dejó de responder en la comprobación adicional final; las capturas y mediciones anteriores están guardadas. No se ha publicado Core ni modificado la demo.

## Referencia técnica

[Consultas y errores de Supabase](https://supabase.com/docs/reference/javascript/select).
