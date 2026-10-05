# Equipos: temporada actual y gorros por defecto

## Cambios

- Crear equipo elimina el selector de temporada. El servidor consulta la temporada actual y la política de inserción impide crear equipos para temporadas anteriores desde la sesión de un usuario. Sin temporada actual se ofrece ir a Temporadas.
- Plantilla añade Editar gorros por defecto. Comparte el selector de gorros del acta y permite Sin gorro, limpiar los números y confirmar intercambios. No guarda al cancelar y bloquea el guardado simultáneo.
- La convocatoria por defecto es la fuente de los números mostrados cuando existe. Los integrantes de la plantilla que no estén incluidos aparecen sin gorro; asignarles uno los incorpora a la lista por defecto si hay plaza. Los refuerzos ya guardados se mantienen y se pueden editar en la misma lámina.
- Si todavía no existe una lista por defecto, el primer guardado la inicializa con hasta 14 jugadores, priorizando los gorros asignados. La pertenencia al equipo y sus refuerzos no se modifican.
- Guardar números actualiza plantilla y convocatoria por defecto en una transacción. Guardar Este y los próximos desde un partido sincroniza los números de los integrantes propios mediante un trigger privado. No cambia los gorros de los refuerzos en su equipo de origen.
- Sin gorro conserva a los integrantes de la lista por defecto. La edición de convocatorias incluye esos integrantes pendientes de numerar. Los partidos anteriores conservan sus convocatorias.
- Las ediciones desactualizadas se rechazan. La función requiere manage_teams, usa SECURITY INVOKER y respeta RLS. El trigger privado solo sincroniza squad_number; no es invocable por clientes.

## Verificación

- Pruebas de creación: el servidor ignora una temporada anterior enviada por el cliente y no crea equipos si no hay temporada actual.
- Pruebas de interfaz: intercambio confirmado, guardado único, limpieza confirmada, cancelar sin escrituras y ausencia del selector de temporada.
- Pruebas SQL con rol authenticated y fixtures descartados mediante rollback: intercambio, gorros pendientes, nuevos partidos, conservación del historial, sincronización desde editar convocatoria, incorporación a la lista por defecto, rechazo de duplicados, ediciones obsoletas, temporadas anteriores y falta de permisos.
- TypeScript y ESLint sin errores. Pruebas existentes de convocatoria incluidas en la regresión.
- Revisión local a 393 × 852 px sin modificar los jugadores reales durante las pruebas de interfaz. Evidencias en evidence/team-default-caps-2026-10-02.
- Los asesores de seguridad no señalan las nuevas funciones o políticas. Persisten avisos previos de funciones de temporadas/entrenamientos, tablas cerradas sin políticas y protección de contraseñas filtradas.

## Alcance

Solo Core. No se modifica ni publica la demo. Los gorros por defecto son preparatorios; los mínimos de categoría y el portero se validan al guardar la convocatoria de un partido.
