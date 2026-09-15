# 07 · Equipos y plantillas

[Documento general](00-panel-general.md).

## Objetivo

Mantener los siete equipos competitivos y Escuela del curso actual: jugadores, gorros, responsables y datos prácticos. Equipo, categoría y temporada son conceptos distintos; Cadete A y Cadete B comparten categoría.

## Actual

Listado por temporada, alta de equipo, detalle con Personal, Plantilla y Datos, asignación/retirada de jugadores y personal, edición de datos. Acciones en `server/actions/admin/teams.ts`. Candidatos proceden de perfiles activos; la regla de categoría se valida al asignar.

## Hallazgos

- **EQU-01, P2 (C):** Personal aparece antes que Plantilla en detalle; no responde a la tarea más habitual de consultar jugadores.
- **EQU-02, P2 (C):** `gender` y `team_type` se presentan directamente como valores internos. El color aparece como hexadecimal.
- **DAT-01, P1 (C):** categoría de fila usa año del reloj; `rosterPlayer` usa año de temporada. La misma persona puede parecer válida visualmente y ser rechazada.
- **EQU-03, P2 (C):** `roster-manager.tsx` permite añadir/retirar, pero no ofrece edición directa del gorro en la lista. Retirar y volver a añadir no es un buen flujo de corrección.
- **EQU-04, P2 (C):** candidatos amplios, máximo 50 resultados tras búsqueda; la explicación «La categoría la valida el servidor» traslada detalles técnicos al usuario.
- **EQU-05, P1 (C):** el listado comprueba temporadas/equipos pero descarta errores de personal y plantilla; puede mostrar cero jugadores o entrenador ausente.
- No se encontró eliminación de equipo en acciones expuestas. No se debe añadir borrado físico como solución genérica.

## Plan

Listado actual por orden deportivo, cantidad de jugadores y responsable. Histórico separado. Detalle: Plantilla primero, Personal después, Datos en sección secundaria; enlaces a entrenamientos y partidos del mismo equipo con contexto conservado.

Añadir jugadores con búsqueda y explicación de elegibilidad antes de guardar. Mostrar identidad completa y equipos actuales; permitir pertenencia múltiple conforme a reglas. Escuela tiene trato propio y no debe ofrecer programación competitiva por defecto.

Acciones: crear, editar, añadir/retirar jugador, editar gorro, asignar/cambiar/retirar cargo; archivar o cerrar participación cuando proceda. Borrado solo si se demuestra que no tiene relaciones y se acuerda necesidad. El historial no se reescribe al preparar un curso.

## Aceptación

- Cadete A/B se distinguen en todos los selectores.
- Categoría visual y regla de asignación coinciden, también en enero.
- Cambio de gorro conserva identidad e historial.
- Excepción de chicas en Cadete masculino y regla asimétrica del club no se sustituyen por una restricción nueva.
- Al fallar plantilla, no aparece «0 jugadores».
- Nombres largos y listas completas legibles en 320 px.
- Buscar, seleccionar y retirar funcionan con teclado y confirmación coherente.

Depende de temporada, permisos y ficha de jugador. Revisar la guía: su descripción abreviada de la regla de categoría omite el alcance asimétrico documentado.
