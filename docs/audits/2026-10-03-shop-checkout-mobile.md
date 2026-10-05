# Pedido desde el móvil: confirmación y modal

## Error comunicado

Al abrir Core desde `http://192.168.68.51:4184`, confirmar un pedido mostraba «No pudimos preparar el envío. Revisa el almacenamiento del móvil y vuelve a intentarlo». El modal añadía Actualizar carrito y empezaba a desplazarse.

## Causa y corrección

`useShopCart.checkoutKey` llamaba directamente a `crypto.randomUUID()`. Esa función solo está disponible en contextos seguros; el acceso HTTP mediante una IP de la red local no lo es. La excepción se capturaba como si fuese un fallo de almacenamiento y el pedido ni siquiera llegaba a la Server Action. Referencia: [randomUUID en MDN](https://developer.mozilla.org/en-US/docs/Web/API/Crypto/randomUUID).

Se reutiliza `generateUuid`, ya existente en la aplicación, que genera UUID v4 mediante `crypto.getRandomValues` cuando no está disponible `randomUUID`. [getRandomValues puede funcionar fuera de un contexto seguro](https://developer.mozilla.org/en-US/docs/Web/API/Crypto/getRandomValues). No se usa Math.random ni se modifica la validación del servidor. La clave sigue guardándose por perfil y contenido, conservándose al recargar o reintentar para evitar pedidos duplicados. Si el almacenamiento realmente falla, se sigue impidiendo enviar un pedido sin conservar esa protección.

Actualizar carrito aparecía para cualquier error. Se retira de la confirmación y se refrescan los datos automáticamente cuando falla una petición al servidor, manteniendo carrito, teléfono y error. Los mensajes de cambio de precio o producto retirado guían hacia revisar el total o quitar el producto. La acción principal queda desactivada si el resumen deja de ser válido.

La lámina usa altura natural con un límite mayor dentro de la pantalla y mantiene las dos acciones visibles. El error conserva contorno rojo oscuro y texto legible. No se oculta contenido para eliminar el scroll: si el teclado o una pantalla pequeña reduce de verdad el espacio, se conserva el desplazamiento necesario para acceder a la información.

## Verificación

- Dos reproducciones inicialmente fallidas en la interfaz real con acción de servidor simulada: navegador sin `randomUUID` no llegaba a enviar y un error añadía Actualizar carrito. Ambas pasan tras la corrección.
- 57 pruebas de carrito, interfaz de tienda, confirmación en servidor y cálculo de pedidos. Incluyen UUID alternativo válido, persistencia tras recarga, reintentos con la misma clave, doble pulsación, almacenamiento bloqueado, sin conexión, cambio de precio y conservación del carrito.
- TypeScript y ESLint del alcance sin errores.
- Prueba visual con el mismo producto de la captura, a 393 × 852 px. Se fuerza un fallo de almacenamiento antes del envío: modal de 659 px, región con 288 px visibles y 288 px de contenido; sin desplazamiento interno ni botón adicional. Captura: `docs/audits/evidence/shop-checkout-2026-10-03/error-393.png`.
- Se restaura el almacenamiento del navegador, se retira el artículo temporal y se deja el carrito como estaba. No se crea ningún pedido real ni se envían correos en esta comprobación.

No se modifica la base de datos ni la demo. La corrección está disponible en el servidor local de Core.
