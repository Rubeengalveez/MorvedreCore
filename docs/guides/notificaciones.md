# Notificaciones de Morvedre Core

Actualizado el 3 de octubre de 2026.

## Uso

El buzón corresponde a la cuenta que ha iniciado sesión. Cambiar al perfil de un hijo no permite leer el buzón privado de otra cuenta. Los avisos deportivos relevantes se envían al jugador y a sus familiares vinculados.

En Notificaciones puedes ver Sin leer o Todas, abrir el aviso completo y seguir su enlace. Abrirlo lo marca como leído. La acción de marcar todos requiere confirmación. El listado tiene páginas de 20 avisos; conserva el histórico completo.

Ajustes permite activar o desactivar cada tema para el móvil. Los avisos permanecen en el buzón aunque se silencie su entrega al móvil. La activación del dispositivo, la prueba y la desactivación están disponibles también en Mi perfil. Las preferencias se guardan en la cuenta; la suscripción pertenece al dispositivo.

## Eventos

| Tema                      | Avisos                                                                                                        |
| ------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Convocatorias             | Jugadores convocados y familiares vinculados                                                                  |
| Partidos y horarios       | Nuevo partido, cambios, cancelación y recordatorio previo                                                     |
| Cambios en entrenamientos | Cancelación, reactivación, horario, duración o ubicación                                                      |
| Ausencias y correcciones  | Ausencia registrada y corrección a presente; jugador y familiares                                             |
| Resultados                | Resultado de un partido finalizado                                                                            |
| Pedidos                   | Autorización familiar, pedido confirmado, entrega, rechazo o cancelación; nuevo pedido para gestión de tienda |
| Noticias                  | Publicación destacada del club                                                                                |
| Cuotas y pagos            | Avisos de tesorería                                                                                           |
| Solicitudes de acceso     | Solo administradores generales                                                                                |

Los mensajes nuevos usan fechas concretas en Europe/Madrid. Los textos históricos existentes se conservan con su fecha original. Los pedidos antiguos etiquetados como noticia se presentan y filtran como pedidos cuando enlazan a un pedido.

## Entrega al móvil

Cada inserción en `notifications` genera una entrega por suscripción activa en `notification_push_deliveries`. No se reenvían avisos históricos al introducir esta cola.

El servidor reclama trabajos con bloqueo `SKIP LOCKED`. Cada dispositivo recibe el contenido de su aviso, con enlace al detalle. Se vuelven a comprobar el perfil activo, la suscripción y las preferencias antes del envío. Una suscripción expirada se desactiva; los fallos temporales se reintentan hasta cinco veces con espera creciente. La cola caduca avisos de más de 24 horas y recordatorios de más de una hora. La etiqueta nativa identifica el aviso para evitar sustituir avisos diferentes.

El envío usa Web Push con cifrado AES128GCM y firma VAPID. Los endpoints admitidos se limitan a proveedores conocidos; no se permiten destinos arbitrarios, redirecciones ni claves mal formadas. Las APIs de suscripción y prueba requieren la cuenta activa y comprueban el origen. La prueba envía solo al dispositivo que pulsa el botón y no declara éxito si el proveedor rechaza la entrega.

El sistema operativo dibuja la notificación nativa. Core proporciona el título, resumen, escudo, icono monocromo y destino seguro. Al tocarla, se abre el aviso correspondiente y se reutiliza una ventana de Core cuando existe. Los enlaces de vuelta desde partido, asistencia, cuotas, noticia y pedido regresan al aviso; calendario y secciones administrativas admiten el mismo origen.

## Preparación del despliegue

1. Publicar Core en HTTPS. En un móvil conectado a `http://192.168...` no se pueden activar Web Push ni el servicio de la PWA. En desarrollo el servicio se desactiva deliberadamente.
2. Configurar `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` y `VAPID_SUBJECT`, con el mismo par de claves en cliente y servidor.
3. Configurar un secreto aleatorio exclusivamente de servidor en `NOTIFICATION_DISPATCH_SECRET`.
4. Programar cada minuto un POST a `/api/notifications/dispatch` con `Authorization: Bearer <secreto>`. Esta ruta crea recordatorios dentro de las próximas 24 horas y procesa la cola. Sin esta programación, los cambios de la app activan el envío inmediato, pero los trabajos generados fuera de una petición y los reintentos necesitan una visita posterior para procesarse.
5. En iPhone/iPad, instalar Core en la pantalla de inicio con iOS/iPadOS 16.4 o posterior y activar los avisos desde la app instalada. En Android, instalar la PWA y conceder el permiso solicitado al pulsar Activar avisos.
6. Probar en dispositivos físicos: aviso con la app cerrada, toque que abre el detalle, preferencias por tema, desactivación, cierre de sesión y suscripción expirada. La configuración del sistema operativo, silencio y ahorro de batería pueden afectar la presentación; no se considera validada por un build.

La ruta periódica devuelve 503 mientras no hay secreto configurado y 401 si la autorización no coincide. La tabla de entregas tiene RLS y acceso exclusivo del servidor; no tiene políticas para usuarios autenticados. Las funciones de reclamación y recordatorios solo se pueden ejecutar como `service_role`.

## Evidencias

Referencias oficiales: [Push API de MDN](https://developer.mozilla.org/en-US/docs/Web/API/Push_API) y [Web Push en iOS/iPadOS 16.4, WebKit](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/).

Auditoría y comprobaciones: `docs/audits/2026-10-03-profile-notifications.md`. Fixture SQL transaccional: `tests/integration/notification-delivery.sql` (termina con ROLLBACK). No envía mensajes ni conserva los perfiles de prueba.
