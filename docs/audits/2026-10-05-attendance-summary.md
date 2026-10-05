# Resumen de asistencia · 5 de octubre de 2026

## Petición y resultado

El resumen de Pasar lista permite buscar jugadores, consultar tarjetas individuales y abrir el calendario mensual de cada persona. La búsqueda ignora mayúsculas y tildes y también admite la categoría. Las tarjetas muestran asistencias, faltas, porcentaje y registros pendientes de revisión, con foto y color del equipo.

El calendario mantiene la forma habitual de mes: verde para asistencia confirmada, rojo para ausencia y ámbar para entrenamiento sin revisar. Los días con resultados distintos entre varias sesiones son violetas. Al tocar un día se consulta hora, categoría, estado y motivo registrado dentro de la misma lámina, sin abrir un segundo modal. Se mantienen el regreso y los periodos semana/mes. Incluso desde un resumen semanal se consulta el mes completo; las semanas que cruzan dos meses permiten cambiar entre ambos.

## Criterio de datos

- Un entrenamiento transcurrido sin registro individual cuenta como asistencia provisional. Sigue identificado como sin revisar y no se escribe una presencia automática en `training_attendance`.
- Una ausencia explícita cuenta como falta. Una presencia explícita se muestra como revisada.
- Una lista solo figura completamente revisada cuando todos sus participantes elegibles tienen registro explícito.
- No cuentan sesiones futuras, canceladas, ajenas a la convocatoria específica o fuera de las fechas de pertenencia al equipo. Las fechas se interpretan en Europe/Madrid.
- Un entrenamiento conjunto cuenta una sola vez por jugador en los totales globales. Si existen registros de sus copias, prevalece el registro explícito más reciente y se comparte su resultado entre categorías.
- Un fallo de lectura no se convierte en una lista provisional de asistencia completa. Las consultas paginan para no perder registros por el límite de respuesta.

La regla se comparte con historial personal, resumen familiar, calendario, rankings y acumulados históricos. La migración `20261005105939_provisional_unreviewed_attendance.sql` se ha aplicado: actualiza la función privada de acumulados y recalcula los archivos cuyo calendario de origen todavía existe. No crea registros de asistencia ni modifica permisos. Se comprobó RLS activo y ausencia de permiso directo para ejecutar la función privada desde una cuenta autenticada.

## Comprobaciones

- 67 pruebas relacionadas superadas en 10 archivos: dominio, consultas, interfaz, calendario, familia y rankings.
- Las dos pruebas de la interfaz se repitieron correctamente tras los últimos ajustes del buscador y altura.
- TypeScript y ESLint sin errores en la comprobación de los cambios.
- Navegador local autenticado a 393 × 852: búsqueda `lucia torres`, apertura del calendario y consulta de un entrenamiento sin revisar. Un solo diálogo y sin desbordamiento horizontal. El mes sin detalle ocupa su altura necesaria; el detalle probado también cabe sin scroll interno.
- Se verificó una tarjeta con 100 %: cifra en una línea y tarjeta de 96 px de altura.
- Axe con reglas WCAG 2 A/AA, 2.1 AA y 2.2 AA: cero infracciones automáticas en el resumen filtrado y el calendario abierto.
- Medición de textos con prepare/layout para el mes, la leyenda, el nombre y la cifra; la cifra conserva una línea y ajusta el ancho de su columna.

Las comprobaciones automáticas no sustituyen una revisión con lector de pantalla ni la prueba en un teléfono físico. No se ejecutó un build completo: se verificaron tipos, pruebas, compilación y respuesta de la ruta en el servidor local.

## Evidencias y recuperación

- `evidence/attendance-summary-2026-10-05/player-card-mobile.png`
- `evidence/attendance-summary-2026-10-05/month-calendar-mobile.png`
- `evidence/attendance-summary-2026-10-05/pending-day-mobile.png`
- Copia previa: `C:/Users/galvi/Documents/Morvedre Core snapshots/attendance-summary-before-2026-10-05`.

El servidor local queda disponible en el puerto 4184.
