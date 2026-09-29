# Partidos y convocatorias: simplificación de uso

Fecha: 28 de septiembre de 2026. Punto de retorno Git: `codex/before-match-callup-redesign-2026-09-28` (`9764b43`).

## Problemas observados

- «Editar convocatoria» abre una pantalla con pestañas de convocatoria, acta, detalles y logística. La tarea que anuncia el enlace queda mezclada con otras.
- Añadir jugadores exige abrir otra lámina, elegir, volver a confirmar y regresar. El estado de la selección y el guardado no son suficientemente evidentes.
- No existe una convocatoria habitual por equipo. Cada partido repite una selección casi idéntica.
- La propuesta actual prioriza jugadores de la plantilla y la convocatoria anterior, pero no permite aplicar explícitamente una de esas fuentes como selección completa.
- «Editar partido» no tiene una entrada clara desde la ficha del encuentro. El formulario largo presenta información secundaria al mismo nivel que los campos usados cada semana.
- Logística de coches tiene ruta, acciones, consultas, componentes, modelos y controles de formulario pese a no utilizarse.

## Decisiones de producto y datos

1. La pantalla `/admin/matches/[id]` queda dedicada a la convocatoria. El resumen del partido continúa arriba; la lista y el editor muestran con claridad quién viene, su gorro y qué falta guardar.
2. Los datos de programación se editan en `/admin/matches/[id]/editar`, accesible desde la ficha pública del partido y la lista de administración. El acta se abre exclusivamente desde la ficha del partido.
3. Cada equipo tiene como máximo una plantilla habitual de 0–14 jugadores, con gorros únicos del 1 al 14. Se guarda en una tabla propia, referenciada por equipo y jugador. Al crear un partido se copia dentro de la misma transacción mediante un disparador; una plantilla vacía no convoca a nadie.
4. El editor permite cargar la plantilla habitual, la última convocatoria del equipo o una propuesta automática. Cargar una fuente solo cambia el borrador; se pulsa «Guardar convocatoria» para aplicarla. Si ya hay cambios, se pide confirmación antes de sustituirlos.
5. Al guardar una convocatoria, el usuario puede marcar «Usarla en próximos partidos de este equipo». Esto actualiza la plantilla habitual en la misma transacción. El cambio de plantilla no altera partidos anteriores.
6. Las convocatorias iniciadas o con acta existente no se sustituyen desde este editor para evitar inconsistencias en jugadas y estadísticas. La edición de gorros antes de iniciar el acta sigue disponible en el flujo del delegado.
7. Se retira la interfaz y el código de logística. Una migración archiva los registros existentes en el esquema privado y elimina los objetos públicos específicos de coches y los campos de configuración. Los registros de partidos y convocatorias se conservan.
8. La confirmación de asistencia a partidos deja de formar parte de la convocatoria. Las familias consultan la lista y comunican ausencias al entrenador; los estados históricos de la base se conservan para no alterar registros anteriores. La ficha, el calendario y el editor ya no muestran respuestas pendientes.
9. En móvil, el encabezado de la ficha separa el título y el número de convocados del acceso a edición. El editor enseña primero la selección actual, pliega la lista de candidatos, ofrece fuentes rápidas y mantiene visible el guardado sobre la navegación inferior.

## Ajuste de producto del 29 de septiembre de 2026

La validación con el club elimina las fuentes «anterior» y «automática» del editor. Solo queda una convocatoria por defecto por equipo, que se copia al crear un partido. Al guardar cambios, el delegado elige expresamente entre «solo este partido» y «también como predeterminada». El editor no cambia partidos ya creados. Quitar gorros conserva los jugadores y requiere volver a asignar números antes de guardar. La selección y el guardado se presentan como pasos separados para reducir errores durante el partido.

## Orden de trabajo

1. Etiquetar el estado Git y añadir esta planificación y la decisión al registro.
2. Crear migración para plantilla habitual, políticas RLS y operación atómica de convocatoria; actualizar tipos.
3. Sustituir la edición fragmentada por una lista editable con fuentes rápidas, gorros y guardado explícito. Mantener búsqueda, límite 14, conflictos de disponibilidad y mensajes de error legibles.
4. Separar la edición del partido, simplificar creación y edición, y conectar el acceso desde la ficha y la administración.
5. Retirar logística de navegación, formularios, consultas, acciones, scripts de semilla y código de dominio; preparar la limpieza de esquema.
6. Al final, comprobar TypeScript, lint, build y pruebas focalizadas de selección, guardado y rutas. Revisar accesibilidad móvil: objetivos táctiles, nombres, contraste, errores, foco y zonas seguras.

## Límites de la migración

Las migraciones históricas permanecen para poder reconstruir bases antiguas; una nueva migración retira los objetos en el esquema actual. La publicación o aplicación a la base remota exige verificar antes que la copia de seguridad está disponible y que la migración no afectará a otros objetos.
