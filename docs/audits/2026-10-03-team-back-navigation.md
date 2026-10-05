# Regreso desde las pestañas del equipo

## Fallo y causa

Al entrar en un equipo, cambiar de pestaña y usar atrás, se volvía a la pestaña anterior. Cada enlace de `TeamNavigation` añadía una entrada al historial, tanto en la ficha pública como en la gestión del equipo.

Reproducido en el navegador: Equipos → Juvenil → Partidos → Plantilla → atrás devolvía a Partidos, en lugar de Equipos. Tres pruebas reprodujeron el mismo problema para la lista pública, la ficha abierta desde admin y la lista de administración.

## Corrección

- Los cambios de pestaña reemplazan la entrada actual del historial. Entrar en un equipo sigue siendo una navegación nueva.
- Se conserva el origen de administración y su pestaña al abrir la ficha pública.
- Los enlaces de registrar tiempos e historial de tiempos conservan también ese contexto; antes lo perdían.
- No se han modificado datos, permisos ni acciones de guardado.

## Verificación

- 37 pruebas pasan en navegación, equipos, partidos e historial de tiempos.
- TypeScript y ESLint de los archivos modificados pasan.
- Verificación real en navegador del regreso directo a `/team` tras cambiar entre las cuatro pestañas.
- Comprobación de los enlaces de tiempos y del regreso a Datos de administración.

Las pruebas del navegador fueron de lectura; no se registraron tiempos ni se editaron equipos.
