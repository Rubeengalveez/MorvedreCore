# 08 · Temporadas e histórico

[Documento general](00-panel-general.md).

## Objetivo

Operar en el curso correcto, preparar el siguiente sin interrumpir el actual y conservar la consulta histórica. No presentar temporadas anteriores como destinos normales de creación.

## Funciones existentes

Listado, creación, edición, activación y transición. `season-transition-sheet.tsx` llama a `archiveSeason` y describe archivado, copia de equipos/personal y traslado de plantillas que mantengan categoría. Exige escribir el nombre del curso y avisa de bloqueos por partidos/actas. Hay scripts de preparación utilizados por la guía operativa.

## Hallazgos

- **TEM-01, P2 (C):** «Nueva temporada» y «Iniciar nueva temporada» expresan acciones cercanas con efectos diferentes. La segunda combina archivo y preparación.
- **TEM-02, P2 (C):** la guía sigue describiendo preparación mediante script; aunque existe transición en UI, falta una explicación común de preparación, revisión y activación.
- **ENT-03 / NOT-01 / PER-02 (C):** varias secciones incluyen temporadas pasadas en sus selectores normales. Corregir solo Temporadas no resolverá el problema.
- **TEM-03, P2 (P):** falta un preflight legible antes de ejecutar: qué se copia, qué queda pendiente, cuántos jugadores cambian categoría y qué no se traslada.
- Probar compatibilidad entre activar una temporada creada previamente y el flujo de transición; no afirmar que una operación admite reintentos sin ensayarla.

## Modelo de experiencia propuesto

Tres contextos reconocibles: Actual, Preparación del próximo curso e Histórico. No implica necesariamente un nuevo enum: primero definir comportamiento y mapearlo al esquema existente.

Inicio de Temporadas muestra curso actual y «Preparar siguiente temporada». Asistente:
1. Fechas y nombre.
2. Equipos y responsables a conservar.
3. Jugadores que continúan y jugadores por revisar.
4. Horarios/cargos que requieren decisión.
5. Resumen de bloqueos y cambios.
6. Activación explícita cuando esté preparado.

Histórico se abre en consulta. La corrección excepcional de datos pasados debe ser una acción separada y restringida, si se acuerda; no forma parte de crear entrenamientos.

## Datos que deben conservarse

Identidad de jugador, convocatorias, resultados, asistencia, relaciones económicas y hechos históricos. La categoría se deriva del año de esa temporada. No copiar indiscriminadamente permisos globales, horarios antiguos ni estados de cobro al curso nuevo.

## Aceptación

- En creación ordinaria solo aparece el curso actual.
- Preparar no cambia el curso activo hasta el paso acordado.
- Se conocen bloqueos antes de una operación irreversible.
- Reintento no crea duplicados de equipos.
- Archivo fallido no deja media transición.
- No hay pérdida de datos de Escuela ni de jugadores que cambian categoría.
- La guía describe exactamente los botones y efectos disponibles.
- Ensayo completo con fixtures de dos temporadas y consulta posterior del histórico.

## Decisiones

Confirmar si se programará el curso próximo antes de activarlo. Propuesta: permitirlo únicamente desde Preparación, con contexto explícito. Mantener el histórico disponible; la petición de Rubén elimina su presencia en la operación cotidiana, no su conservación.

## Datos observados del entorno

En el formulario inspeccionado se considera actual 2025/2026, y el horario parte de septiembre de 2025. Verificar preparación de 2026/2027 como tarea de datos separada del rediseño. No activar automáticamente según el calendario: comprobar equipos, plantillas, responsables, horarios y cargos antes. Este hallazgo puede explicar parte de la sensación de datos antiguos sin convertirla en una decisión de borrado.
