# Sustitución tras expulsión definitiva en categorías inferiores

## Causa y corrección

`matchRules().compulsoryReplacement` estaba activado solo para Infantil. La detección de cambios pendientes omitía por ello los jugadores de campo de Benjamín y Alevín, aunque sí detectaba sus porteros. El modal y la confirmación seguían implementados: el fallo era la condición que impedía abrirlos.

Se activa la sustitución en todas las categorías con participación controlada. `outstandingReplacement` mantiene sus condiciones: partido en juego, cuartos 1–4, jugador alineado, roja o límite real de expulsiones y existencia de sustitutos elegibles. Se conservan cuatro expulsiones en Benjamín y tres en Alevín/Infantil; desde el quinto no se exige esta elección. Sin sustitutos disponibles se continúa con uno menos.

La misma condición incorrecta estaba en Core y en la demo. Se corrige en ambos, sin copiar otras reglas, pantallas ni datos de la demo a Core. Se conserva un respaldo del archivo anterior en cada proyecto.

## Verificación

- Prueba de regresión compartida: 63 casos; antes de corregir fallaban los 32 correspondientes a jugadores de campo de Benjamín y Alevín en ambas versiones. Después pasan todos.
- Cobertura: roja/acumulación, ambos equipos, cada cuarto 1–4, cambio completo, no adelantarse al límite, no sustituir suplentes, no exigir al acabar un cuarto, cuartos 5/6, categorías superiores y ausencia de candidatos.
- Demo: 230 pruebas en 13 archivos y TypeScript correctos; compilación y generación de recursos sin conexión correctas.
- Core: 115 pruebas relacionadas en cuatro archivos y TypeScript correctos.
- Navegador local aislado en 4195: Alevín, cuarto 4, roja al gorro 2. Se abre «Elige un sustituto», se confirma el gorro 7, el cambio queda persistido y el modal desaparece. No se alteran los partidos existentes del usuario.
- Evidencia: `evidence/youth-sanction-replacement-2026-10-01.png`.

La versión generada de la demo es `morvedre-acta-demo-fd8c495993b2`. La publicación se realiza sobre el Worker existente `morvedre`, conservando su URL.

Publicación completada: Worker `morvedre`, versión Cloudflare `33d82ff5-c50a-4a25-86d2-d52afca44148`. Se comprobó por HTTP que el manifiesto público devuelve `morvedre-acta-demo-fd8c495993b2` y que el SHA-256 del bundle actualizado coincide con el archivo local probado.
