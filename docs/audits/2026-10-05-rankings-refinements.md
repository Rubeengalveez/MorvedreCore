# Ajustes de rankings · 5 de octubre de 2026

## Cambios solicitados

- Se retiran los números redundantes del podio y se añaden datos secundarios breves.
- Los puestos empatados tienen el mismo color, altura, tamaño de foto y formato. Se conserva el puesto real para lectores de pantalla. Se retira el texto visible sobre empates.
- Las estadísticas secundarias se mantienen en las tarjetas; se integran junto al nombre y categoría, sin una franja inferior. Se abre el resumen para leerlas completas.
- Abreviaturas: PJ, G/P, A/P, G, T y porcentaje MVP. La ayuda explica su significado. La cifra principal adapta su tamaño a la longitud; el puesto también contempla tres cifras.
- Paginación con Anterior/Siguiente de ancho amplio y 56 px de alto, página anunciada y regreso al inicio de la lista tras cambiar.
- Se utiliza «partidos» en los datos y promedios. La eficacia presenta goles y tiros, sin la etiqueta «goles de tiro».
- Goles, tiros, paradas y goles recibidos de la tanda se atribuyen por identidad del jugador o portero, con respaldo por gorro para documentos antiguos. Fuera y palo cuentan como tiro, pero no como parada. Se incluye la tanda en las contribuciones y MVP del ranking.
- MVP muestra partidos y porcentaje de partidos como MVP.
- Nuevas clasificaciones de partidos jugados y expulsiones.
- Rachas individuales: marcando, asistiendo, como MVP, dos goles o más, goles o asistencias, paradas, sin expulsiones, victorias y sin perder; asistencia técnica cuando hay permisos. Las tarjetas rojas cortan la racha sin sanciones. Equipos: victorias, sin perder, marcando y portería a cero.
- Leyendas ofrece las mismas métricas individuales que Ranking, con nombres simples, y combina las temporadas disponibles con la actual.
- Cada clasificación cuenta con explicación propia, criterios de muestra y datos de origen.

## Histórico compacto

`historical_player_stats` conserva una fila por jugador y temporada. `ranking_totals` agrega únicamente contadores deportivos, sin eventos, fotos ni nuevas copias de actas. Las medias y porcentajes se calculan sobre los numeradores y denominadores acumulados, sin promediar porcentajes anuales.

El cierre existente activa una captura de resumen en la misma transacción, con cálculo una vez por temporada insertada. Las funciones son privadas, `security invoker`, sin ejecución directa para `anon` o `authenticated`. Se mantienen RLS y la comprobación de administrador del cierre. La asistencia histórica deduplica entrenamientos conjuntos y respeta destinatarios, fechas de plantilla, cancelaciones y listas realmente registradas.

Las temporadas antiguas que solo guardaron goles, partidos, expulsiones, MVP y asistencia siguen aportando esos datos. No se inventan asistencias, tiros o paradas que nunca se registraron. Si se conserva el acta antigua, la migración permite recuperar su agregado; los dos archivos actuales no conservan actas completas. Los 181 registros históricos existentes se mantienen.

Migraciones aplicadas:

- `20261005100929_rankings_compact_history.sql`.
- `20261005102404_ranking_history_joint_attendance.sql`.

La lectura de listas actuales se agrupa en hasta cuatro consultas independientes simultáneas, conservando la paginación completa. Los datos de asistencia no se envían al explorador cuando falta el permiso técnico.

## Comprobaciones

- Dominio, consultas, explorador y estadísticas anteriores: suite de ocho archivos.
- Comparación independiente del resumen SQL frente al dominio TypeScript en 119 partidos actuales, 135 jugadores y 11 actas completas: coinciden todos los contadores comparados.
- Prueba transaccional de captura histórica con tres jugadores y rollback: resúmenes coherentes, máximo observado 159 bytes de JSON por jugador y temporada.
- Verificación de RLS, revocaciones y ausencia de pérdidas de registros históricos tras aplicar ambas migraciones.
- Navegador a 393 × 852: sin desbordamiento horizontal; filas de altura uniforme; dos primeros empatados con idéntico oro y 128 px de pedestal; botones de paginación de aproximadamente 169 × 56 px.
- Leyendas carga las nuevas métricas. Eficacia muestra 100 y valores decimales con escala de letra ajustada y datos secundarios que caben en su columna.
- axe-core: cero infracciones automáticas, veinte reglas superadas; el contraste de los degradados requiere revisión manual y mantiene los colores comprobados en la auditoría anterior.

El navegador de pruebas devuelve un error al capturar imágenes en esta sesión, tanto por la API de captura como por CDP. Se verificaron el árbol accesible, los controles y medidas DOM; no se utiliza una captura antigua como si fuera el resultado de hoy. No se ha publicado Core.

Resultado final: 124 pruebas de los ocho archivos revisados superadas, con la prueba de paginación comprobada tras simular en JSDOM su API de desplazamiento nativa. TypeScript y ESLint correctos. Medición de texto: 100, 1.234, 12.345 y 1.234.567 caben en una línea con su escala correspondiente; también cabe «124 PJ · 2,45 G/P». Los colores y alturas de dos primeros empatados se verificaron en datos reales.
