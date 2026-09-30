# Acta: revisión de los ajustes señalados

Esta revisión continúa la auditoría anterior con los problemas observados por el usuario en móvil. No incluye publicación.

- [x] 1. Ajustar la altura de los gorros inscritos del rival al contenido.
- [x] 2. Unificar el contorno oscuro de la ubicación del partido.
- [x] 3. Compartir el diseño de carga del acta con la convocatoria.
- [x] 4. Integrar el título de preparación en la tarjeta.
- [x] 5. Compactar las filas y llevar los cuartos jugados a sus extremos.
- [x] 6. Dar errores de selección que indiquen exactamente qué falta.
- [x] 7. Mantener cuarto, parcial y estado en una única línea.
- [x] 8. Mostrar solo los cuartos jugados y el descanso en la selección propia; mejorar el contraste del gorro.
- [x] 9. Compactar la selección rival con los cuartos en cuadrado a la derecha.
- [x] 10. Bloquear el cambio de portero durante el descanso.
- [x] 11. Ajustar las listas reducidas sin cambiar el scroll de las listas normales.
- [x] 12. Pulir el aviso anterior al cuarto 4 y poner participación en la cabecera.
- [x] 13. Separar las leyendas y distinguir descansar/jugar con color e icono junto al nombre.
- [x] 14. Dar más altura a la confirmación de rotación.
- [x] 15. Eliminar el aviso al pasar del cuarto 4 al 5.

## Verificación

- 69 pruebas unitarias de los componentes y reglas afectados, sin fallos.
- 13 flujos de navegador verificados con partidos ficticios: recuperación sin red, borradores, selección de ambos equipos, cuarto 4 y quinto, convocatoria, goles y asistencias, penaltis, sustitución por sanción, corrección histórica, relevo entre pestañas y PDF.
- Se comprueba la altura de las listas reducidas y se mantiene la altura original del selector normal con 14 jugadores. Los contornos y la ubicación se revisan además en el navegador integrado.
- Filas uniformes de 80 px en móvil, sin texto fuera de sus límites. Nombres en una línea; cuartos jugados en los extremos físicos de local y visitante.
- Objetivos táctiles de al menos 48 px, ausencia de desbordamiento horizontal, foco y Escape, movimiento reducido, tamaños de 320 y 393 px y texto al 200 %. Las capturas pasan axe con reglas WCAG A/AA.
- La carga de convocatoria se verifica durante una lectura local retardada: comparte el indicador del acta y el enlace conserva el origen.
- Compilación de producción y ESLint del código modificado correctos. No hay cambios de base de datos ni publicación.

## Hallazgos corregidos durante la revisión

- La mezcla de utilidades de envoltura provocaba que las estadísticas rivales saltaran de línea y rebasaran su fila. Se eliminan las clases incompatibles y se comprueban los límites verticales.
- La carga usa una animación continua: el capturador de pruebas esperaba a que terminara y mostraba la pantalla siguiente. Ahora espera solo animaciones finitas y comprueba la carga real.
- La leyenda del cuarto 4 se desplaza con los jugadores para que, con letra grande, no consuma todo el espacio disponible. Las acciones y los errores permanecen visibles.
- Un acta cerrada ofrecía corregir convocatoria desde la salida. Ahora ofrece seguir consultando, con texto adecuado y sin esa acción.

## Evidencias

Registros finales en `tmp/acta-audit/`:

- `followup-unit-complete.log`: 69 pruebas unitarias.
- `followup-browser-complete.log`: 13 flujos de navegador.
- `followup-browser-layout.log`: 4 comprobaciones adicionales tras adaptar la selección a texto ampliado.
- `followup-build-complete.log` y `followup-lint-complete.log`: compilación y lint; el último ajuste de disposición tiene además `followup-lint-layout.log`.

Capturas con datos ficticios:

- [Tabla compacta a 320 px](assets/2026-09-30-acta-followup/tabla-320.png).
- [Aviso antes del cuarto 4](assets/2026-09-30-acta-followup/aviso-cuarto-4.png).
- [Selección de jugadores](assets/2026-09-30-acta-followup/seleccion-cuarto-4.png).
- [Selección con texto al 200 %](assets/2026-09-30-acta-followup/seleccion-texto-ampliado.png).
- [Confirmación de rotación](assets/2026-09-30-acta-followup/confirmacion-rotacion.png).
- [Carga de convocatoria](assets/2026-09-30-acta-followup/carga-convocatoria.png).
- [Lista reducida sin espacio sobrante](assets/2026-09-30-acta-followup/lista-reducida.png).

Estas comprobaciones cubren los flujos descritos en Chromium y tamaños móviles simulados; no sustituyen las pruebas en dispositivos físicos del club.
