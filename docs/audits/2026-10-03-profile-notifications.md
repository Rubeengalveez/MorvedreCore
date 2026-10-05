# Perfil, actividad y notificaciones

Auditoría del 3 de octubre de 2026. Alcance: Core; no se modifica ni publica la demo.

## Peticiones realizadas

- [x] Retirar «Lo gestiona el club» manteniendo el nacimiento no editable por el usuario.
- [x] Dar espacio al nombre completo y una foto cuadrada de 112 px en el perfil.
- [x] Actualizar cuotas y pagos con contornos, importes alineados y jerarquía coherente.
- [x] Actualizar historial de asistencia, selector de mes, resumen y calendario accesible.
- [x] Actualizar tiempos de nado e historial, conservando permisos de anotación y corrección.
- [x] Reunir controles de cuenta en Perfil; mover calendario a actividad. La antigua ruta Ajustes redirige a Perfil.
- [x] Rediseñar buzón, detalle, filtros de lectura, paginación y confirmación de lectura masiva.
- [x] Añadir preferencias por temas y mantener todos los avisos en el buzón.
- [x] Revisar generación, destinatarios, seguridad y entrega Web Push.
- [ ] Verificar recepción nativa en Android e iPhone con Core publicado en HTTPS y el procesador periódico configurado.

## Fallos encontrados y correcciones

| Hallazgo                                                                             | Corrección                                                                                                    |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| Nombre abreviado por falta de anchura junto a la foto                                | Nombre en toda la anchura; foto cuadrada grande y funciones al lado                                           |
| Ajustes mezclaban calendario, buzón y contraseña                                     | Accesos directos de cuenta; calendario dentro de actividad deportiva                                          |
| Cuotas, asistencia y nado tenían diseños de etapas diferentes                        | Cabeceras azules, contornos oscuros, datos alineados y accesos de vuelta explícitos                           |
| Último cierre de tesorería podía parecer el mes de todos los pedidos mostrados       | Resumen sin atribuir todos los importes a ese mes; identificación del último cierre dentro de Cuotas          |
| Buzón limitado a los últimos 100 avisos                                              | Paginación de base de datos, 20 por página y total exacto                                                     |
| Preferencias almacenadas no controlaban el envío                                     | Temas validados y comprobación antes de cada entrega                                                          |
| Avisos de ausencia no llegaban al móvil y algunos eventos omitían familiares         | Generación central en base de datos y cola para cada dispositivo                                              |
| Un envío agrupado podía sustituir el contenido real por un mensaje genérico          | Carga propia por notificación y dispositivo                                                                   |
| Fallos de envío podían perderse                                                      | Cola persistente, reclamación exclusiva, recuperación de bloqueos y reintentos limitados                      |
| La prueba podía declarar éxito aunque el envío fallara                               | Comprobación del resultado real y selección del dispositivo actual                                            |
| Un registro tardío del servicio podía dejar los ajustes desactivados                 | Espera acotada al primer servicio activo en producción; revisión al volver de ajustes del móvil               |
| La llamada real del trabajador encontraba permiso insuficiente en el esquema privado | Permiso de uso del esquema solo para el rol de servidor; verificación mediante Data API y fixture con ese rol |
| Endpoints arbitrarios o enlaces externos en avisos                                   | Proveedores de push permitidos, claves validadas y destinos internos permitidos                               |
| Abrir enlaces de avisos perdía el origen                                             | Vuelta explícita al aviso en las secciones relacionadas                                                       |
| Lista adyacente y cifras de asistencia con color demasiado claro                     | Espaciado con gap; verde y rojo oscuros, contornos e iconos accesibles                                        |

## Verificación

- Build de producción Next.js completo, con compilación del servicio Serwist y TypeScript: correcto.
- 212 pruebas en 20 archivos: dominio, cifrado y firma de Web Push, worker, UI, perfil, nado, navegación y regresiones de pedidos; todas correctas.
- ESLint de las vistas y módulos modificados: correcto en la comprobación enfocada.
- SQL transaccional: nuevos partidos, convocatorias, horario, resultado, recordatorio idempotente, cancelación y reactivación de entrenamiento, ausencia y corrección, autorización/confirmación/entrega de pedido, familiares, preferencias, cola, reclamación exclusiva y límite de reintentos. Correcto, con reclamación bajo `service_role`.
- Tras ROLLBACK: cero perfiles QA y cero trabajos de entrega conservados. No se enviaron notificaciones reales de prueba a miembros del club.
- Navegador móvil 393 × 852: perfil, cuotas, asistencia, nado, buzón, detalle y preferencias. Axe sobre el contenido principal o el diálogo: cero infracciones detectadas en las siete vistas. No equivale a una certificación completa WCAG.
- Nombre completo y foto 112 × 112 comprobados; título del buzón medido en una línea con Pretext. Controles de preferencias de 56 px o más, fondo bloqueado y acción Listo visible al pie.
- Comprobación adicional del buzón a 412 × 915: anchura de contenido 397 px, sin desbordamiento horizontal, título y Ajustes en una fila. Se restaura el tamaño del navegador al finalizar.
- Recorrido buzón → aviso leído → partido → Volver al aviso comprobado sin modificar avisos sin leer.

## Seguridad y límites

Las lecturas y mutaciones del buzón usan la cuenta propia activa y RLS. Los avisos deportivos de un hijo se generan también para sus familiares, sin dar acceso al buzón privado del hijo. La cola es exclusiva de servidor. Las funciones de reclamación y recordatorios no son ejecutables por `anon` ni `authenticated`. No se guardan respuestas autenticadas en la caché del servicio.

Las preferencias silencian el móvil; los avisos se conservan dentro de Core. El estilo nativo de las notificaciones depende de Android/iOS: la app controla contenido, iconos y destino, no la plantilla del sistema operativo.

Core sigue en local. Falta configurar la ruta periódica al desplegar y ejecutar la prueba en móviles físicos con HTTPS. La inspección adicional del servicio compilado en otra dirección local se detuvo al rechazar el navegador el acceso CDP; no se intenta una alternativa para eludir esa restricción. Las claves VAPID locales existentes forman un par válido; el secreto de entrega periódica aún no está configurado. Guía: `docs/guides/notificaciones.md`.

Este trabajo ajusta la presentación de tesorería y no acredita una conciliación contable integral de los cierres históricos. Conserva los cálculos y registros existentes.

## Estado guardado y evidencias

Estado anterior de archivos afectados: `tmp/profile-notifications-before-2026-10-03/`.

Migraciones aplicadas: `20261003181506_notifications_mobile_delivery.sql`, `20261003182042_notification_delivery_followups.sql` y `20261003190000_notification_worker_schema_usage.sql`.

Capturas en `docs/audits/evidence/2026-10-03-notifications/`: perfil, cuotas, asistencia, nado, buzón y preferencias. No se realizan commits ni publicación de Core.
