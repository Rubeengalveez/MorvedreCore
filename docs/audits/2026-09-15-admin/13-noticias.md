# 13 · Noticias y avisos

[Documento general](00-panel-general.md).

## Propósito

Publicar un aviso para el club o un equipo, comprobar cómo se verá, corregirlo y retirarlo cuando deje de ser útil.

## Actual

Listado administrativo, creación, edición, fijar/desfijar y eliminación confirmada. Editor con título, Markdown, vista previa, destinatarios, imagen y caducidad. Son capacidades reales que deben conservarse; no tratar todo el módulo como pendiente.

## Hallazgos

- **NOT-01, P2 (C):** `getNewsTeamsForAdmin` lee todos los equipos y devuelve solo id/label. Equipos homónimos de varios cursos son indistinguibles en selector y pueden dirigir un aviso al grupo equivocado.
- **NOT-02, P2 (C):** `getNewsForAdmin` limita a 200 noticias sin paginación visible. No hay búsqueda ni separación de caducadas en el listado revisado.
- **NOT-03, P2 (C):** la fila dice «equipo» sin identificar qué equipo; limita claridad del destinatario.
- **NOT-04, P2 (C/H):** caducidad inicial usa `toISOString().slice(0,16)` para un input local. Verificar desplazamiento horario al editar y guardar en Europe/Madrid.
- **NOT-05, P2 (P):** no se encontró guardado de borrador. Es útil para interrupciones, pero necesita validar necesidad y no se declara incumplimiento del alcance anterior.
- El editor permite ver la imagen actual y cargar otra; revisar si retirar una imagen existente requiere una acción adicional.

## Diseño propuesto

Listado con búsqueda y estados «Publicadas», «Caducadas» y, si se aprueba, «Borradores». Fila: título, destinatarios concretos, fecha, caducidad y fijada. Filtros conservados al regresar de edición.

Editor: contenido primero, destinatarios explícitos de temporada actual, vista previa y acción «Publicar noticia»/«Guardar cambios». Opciones de fijación y caducidad secundarias. Explicar la diferencia entre caducar, desfijar y eliminar.

«Ver resultado» debe reproducir la lectura de destino y permitir volver conservando texto. Previsualizar no publica. Al editar, indicar si se enviará un nuevo aviso a destinatarios; contrastar con el comportamiento real antes de escribir esa promesa.

## Ciclo completo esperado

Crear → previsualizar → publicar → localizar → editar → caducar/retirar. No se incorpora campaña, newsletter, segmentación compleja ni mensajería nueva como parte automática de este trabajo.

## Accesibilidad

Botones con nombre claro y destinatario seleccionado perceptible. Etiquetas y ayuda asociadas, anuncio de publicación/error, texto largo sin cortes en editor, foco coherente al alternar vista previa. Controles de imagen utilizables con teclado.

## Aceptación

- Elegir Cadete B del curso actual sin ambigüedad.
- Caducidad se conserva al abrir/guardar sin cambios de hora.
- Publicación fallida conserva texto y permite reintentar.
- Editar noticia no duplica publicación ni envío por accidente.
- Noticia caducada sigue localizable para gestión.
- Lista permite acceder a noticias más allá del límite inicial.
- Fijar/desfijar y retirar tienen feedback y consecuencias legibles.

Dependencias: temporada, capacidad manage_news, política de avisos y consulta de destinatarios. No se ha publicado ninguna noticia para la auditoría.
