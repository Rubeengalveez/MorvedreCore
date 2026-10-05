# Equipos: ajustes de uso y diseño · 2 de octubre de 2026

Complemento de la auditoría inicial `2026-10-02-teams-redesign.md`. Cambios aplicados en Core local.

## Solicitudes completadas

- [x] Eliminadas las distinciones visibles de género y el selector en edición de equipo. Se conserva el campo técnico existente para compatibilidad con los datos y las acciones actuales.
- [x] Directorio público sin búsqueda ni filtros, con Todos y Mis equipos. La administración conserva sus controles de gestión.
- [x] Tarjetas compactas: relación junto al título, entrenador en una línea con abreviación progresiva y contador pequeño.
- [x] Regreso desde la ficha del partido al equipo, pestaña, lista y cantidad de encuentros que se habían desplegado. Solo se aceptan rutas internas del equipo correspondiente al partido.
- [x] Cabecera del equipo compacta, con entrenador y delegado sin bloques grandes de contadores.
- [x] Gorro fuera de la fotografía del jugador, junto a sus datos.
- [x] Ficha con medias de goles y asistencias, tiros registrados, eficacia y datos de portería cuando corresponden.
- [x] Plantilla con cabecera azul coherente con las demás secciones.
- [x] Indicador de navegación centrado dentro del botón, sin alterar sus dimensiones y con anuncio accesible.
- [x] Tarjetas compartidas de partidos en Resumen y Partidos: fecha, horario o resultado, equipos, marcador, competición y ubicación.
- [x] Listas Por jugar y Resultados plegables. Cinco encuentros inicialmente, ampliación de cinco en cinco y opción de compactar.

## Estadísticas y permisos

Las medias usan actas finalizadas de esta temporada y equipo en las que está inscrito el jugador. No se presentan como minutos efectivos jugados. La eficacia divide goles registrados en acciones entre esos goles más tiros fallados registrados; no incorpora goles importados sin información de tiro ni la tanda de penaltis. Se suman intentos antes de calcular el porcentaje, evitando promediar porcentajes de partidos. Sin intentos o actas suficientes se muestra una raya en las medias o eficacia.

La ficha del partido es consultable por los miembros autorizados. Anotar el acta sigue requiriendo la condición de delegado del equipo. La gestión se mantiene restringida a los permisos administrativos o del entrenador correspondiente. No se modifican RLS, esquema, roles ni datos deportivos.

## Verificación

- 146 pruebas correctas en 14 archivos: dominio deportivo, acciones de equipos, formularios, listas de partidos, retorno, estadísticas de acta, rankings, perfiles y tiempos de nado.
- Repetición dirigida de las 10 pruebas de listas y retorno: correcta, incluyendo restauración de la cantidad desplegada y rechazo de destinos externos o de otro equipo.
- ESLint del ámbito de equipos, navegación y estadísticas: sin errores ni advertencias. TypeScript y compilación de producción: correctos.
- Navegador autenticado: directorio, Resumen, Plantilla, Partidos, perfil, regreso de perfil y regreso desde un resultado al equipo con Resultados abierto. No se escriben datos del club durante estas comprobaciones.
- Comprobación visual principal a 393 × 852 px. Validación adicional del perfil a 320 × 760 px: nombre abreviado en una línea y sin desbordamiento horizontal.
- Pretext: etiquetas de navegación en una línea a 393 px, con controles de 56 px; etiquetas de estadísticas en una línea a 393 px y adaptación a dos líneas en las celdas estrechas de 320 px.
- Axe WCAG A/AA/2.2 AA, acotado al contenido principal: cero infracciones en directorio, Partidos, Plantilla y perfil. En el perfil hay resultados de contraste que requieren inspección manual por los fondos decorativos y cifras de un carácter; se revisan visualmente los textos blancos y amarillos sobre azul oscuro. No constituye una certificación WCAG ni una prueba con lector de pantalla nativo.

La consulta existente conserva su máximo de 1000 encuentros por equipo; el desplegado progresivo evita mostrarlos todos de entrada, pero no añade paginación del servidor.

## Evidencias

- [Directorio compacto](evidence/teams-polish-2026-10-02/directory-393.png)
- [Plantilla y cabecera](evidence/teams-polish-2026-10-02/roster-393.png)
- [Resultados](evidence/teams-polish-2026-10-02/matches-393.png)
- [Perfil y estadísticas](evidence/teams-polish-2026-10-02/player-393.png)
