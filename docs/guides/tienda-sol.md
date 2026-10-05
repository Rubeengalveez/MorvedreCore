# Gestión de tienda

La tienda abre en **Productos**, a la izquierda de **Pedidos**. En ambos listados, la búsqueda está arriba y los estados debajo. **Filtros** permite elegir el tipo de producto y otras opciones; el botón oscuro indica que hay filtros aplicados. Los pedidos aprobados están pendientes hasta que Sol pulsa **Marcar entregado** y confirma. Pasan entonces al histórico. **Volver a pendientes** permite corregir una entrega marcada por error. Las solicitudes de menores siguen necesitando la aprobación de su familia.

Los productos están en **Publicados** u **Ocultos**. Ocultar conserva sus pedidos. Solo se pueden eliminar productos sin pedidos, con confirmación. El formulario tiene tres pasos y conserva los cambios al ir y volver entre ellos. Guardar pide confirmación. Los tipos son Camisetas, Pantalones, Sudaderas, Bañadores y Accesorios. Las tallas se configuran como Sin talla, Talla única o Elegir tallas, con posibilidad de añadir una talla personalizada. No hay máximo de unidades por pedido.

Puedes añadir fotos en varias veces, hasta ocho de 5 MB. Las nuevas se añaden a las existentes. Cada foto se puede eliminar y mover con las flechas o arrastrando el asa. La primera es la portada.

Tocar un pedido abre el historial de esa persona y su familia vinculada, con padres e hijos, fechas, estados y precios originales. **Volver a pedidos** recupera la búsqueda y los filtros anteriores.

## PDF y correo

**Descargar PDF pedidos** abre una lámina con dos opciones: todos los pendientes o elegir pedidos. Para elegir, toca cualquier parte de la tarjeta. Puedes marcar o desmarcar todos los resultados visibles y descargar la selección indicada en el botón. Los entregados nunca se incluyen, incluso si cambian de estado durante la selección. La categoría se calcula por año de nacimiento y año de inicio de la temporada actual, como en la gestión de jugadores; no usa el equipo en el que juega.

Los correos detallan persona, categoría, contacto, familia que aprueba, cantidades, tallas, personalización, notas y total. Los avisos de cada pedido no adjuntan el PDF de pendientes; este se reserva para el recordatorio mensual. La descarga manual genera el archivo sin enviar otro correo. `SHOP_MANAGER_EMAIL` determina el destinatario; sin esa variable se usan los correos de perfiles con permiso de tienda. Durante las pruebas el destinatario acordado es `galvillo9@gmail.com`.

## Recordatorio mensual preparado para el despliegue

Core está en local: todavía no se activa ningún envío programado externo. El endpoint `POST /api/shop/reminders/monthly` está preparado para el día 1, según Europe/Madrid. Adjunta el mismo PDF de pedidos pendientes. No manda un correo vacío si no hay pedidos. Un registro privado con RLS y una clave de idempotencia evita duplicar el envío; un fallo queda disponible para reintento.

Al desplegar:

1. Configurar dominio verificado y `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `SHOP_MANAGER_EMAIL` y `SHOP_MANAGEMENT_URL`.
2. Generar `SHOP_REMINDER_SECRET` de al menos 32 bytes, guardarlo en el servidor y en Supabase Vault. Nunca incluirlo en el cliente ni en Git.
3. En Supabase Cron, programar un POST el día 1 a las 08:00 UTC (`0 8 1 * *`), con `Authorization: Bearer <secreto>` y timeout de 60 segundos. La URL pública y el secreto se leen de Vault, siguiendo [la guía oficial](https://supabase.com/docs/guides/functions/schedule-functions).
4. Comprobar la respuesta y la entrega real. Si falla, reintentar ese mismo día con el mismo endpoint. El registro conserva la primera versión del mensaje para reintentar sin duplicados.

Un resultado exitoso de la API de correo acredita aceptación por el proveedor, no recepción en la bandeja de entrada. Revisar los eventos de entrega de Resend al activar el servicio.
