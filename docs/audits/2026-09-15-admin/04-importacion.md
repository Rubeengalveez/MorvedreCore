# 04 · Importación de jugadores

[Documento general](00-panel-general.md).

## Qué queremos

Importar un Excel con confianza y acabar sabiendo qué fichas, equipos y vínculos se crearon o requieren intervención. Es una tarea de Jugadores, no un módulo principal independiente.

## Lo existente

`/admin/players/import` usa `import-players-panel.tsx` y acciones `previewImport`/`commitImport`. Tiene selección de archivo, fases de previsualización, confirmación y resultado, y mensajes de error. Se explican ocho columnas y un máximo de 5 MB. Esto es una base útil que conviene conservar.

## Fricciones y comprobaciones

- **IMP-01, P2 (C):** la preparación depende de leer una frase larga de nombres técnicos de columnas. No se encontró descarga de plantilla en el panel.
- **IMP-02, P2 (C):** la previsualización y la confirmación envían el archivo por separado. Debe verificarse que la confirmación informa de cambios en el estado del club desde la previsualización; no asumir que una vista previa constituye una reserva transaccional.
- **IMP-03, P2 (C/P):** el usuario necesita distinguir alta, coincidencia, conflicto y omisión por fila, y recuperar únicamente errores. Revisar el resultado existente contra esos estados sin sustituir todo el importador.
- **IMP-04, P2 (C):** el flujo no pide de forma visible una temporada de destino. Asegurar que las coincidencias por nombre de equipo se acotan a la actual; los nombres se repiten entre cursos.
- El control admite .xls y .xlsx, mientras el texto dice .xlsx: alinear mensaje con el soporte probado.

## Diseño propuesto

Cuatro pasos cortos: «Descarga la plantilla», «Selecciona archivo», «Revisa los cambios», «Resultado». Temporada y equipos de destino visibles en el resumen. Plantilla con ejemplos ficticios y explicación aparte de columnas obligatorias y opcionales.

Previsualización con resumen de cantidades y tabla: fila del archivo, persona, acción propuesta, equipo, tutor y problema. En móvil cada conflicto se abre en detalle; no forzar una tabla de ocho columnas. Mostrar advertencias antes de confirmar, no solo tras aplicar.

Mantener la carga original para corregir el archivo, pero no registrar datos personales en documentos de auditoría. El resultado debe enlazar a las fichas creadas y permitir descargar errores si se aprueba esa mejora.

## Acciones mínimas

Seleccionar/cambiar archivo; revisar coincidencias; confirmar; cancelar antes de aplicar; ver resultado; reintentar fallidas con prevención de duplicados. «Deshacer toda la importación» no es requisito automático: podría destruir modificaciones posteriores.

## Aceptación y ensayos

- Archivo válido, inválido, demasiado grande y con columnas ausentes.
- Duplicados internos, persona ya existente, tutor compartido por hermanos y equipos homónimos de dos cursos.
- Doble pulsación o reintento no duplica altas.
- Fallo intermedio deja resultado exacto y recuperable.
- El total de filas coincide con creadas, omitidas y fallidas.
- Tabla/selección navegables con teclado; transición de fase y errores anunciados.

No se ha importado ningún archivo del club para esta auditoría. La idempotencia y escritura integral quedan pendientes de ensayo sintético.
