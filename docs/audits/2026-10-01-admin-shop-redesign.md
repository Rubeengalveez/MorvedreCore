# Tienda: rediseño y revisión para Sol

Fecha: 1 de octubre de 2026. Ámbito: administración de productos, gestión de pedidos, PDF y correos de Morvedre Core.

## Hallazgos y correcciones

| Problema                                                               | Corrección                                                                                                                                                                       |
| ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Catálogo y pedidos mezclados; gestión mediante cuatro estados técnicos | Dos áreas, Pedidos y Productos. Sol trabaja con Pendientes y Entregados; los estados anteriores siguen siendo compatibles.                                                       |
| Productos ocultos y edición restringidos a administradores             | Rutas, consultas y RLS reconocen el permiso `manage_shop`. La galería oculta también está protegida y disponible para Sol.                                                       |
| Formulario largo y poco guiado                                         | Tres pasos: Producto, Opciones y Revisar. Conserva los datos al retroceder, enfoca el título del paso y confirma salir con cambios.                                              |
| Acciones y controles poco reconocibles                                 | Contornos oscuros, superficies blancas, botones de 48–56 px, estados seleccionados con fondo azul y etiquetas explícitas.                                                        |
| Categoría asociada al equipo en vez de a la edad                       | Se deriva del nacimiento y temporada actual. Solo se muestra categoría deportiva en perfiles de jugadores.                                                                       |
| Entregas accidentales y notas sobrescritas al cambiar estado           | Confirmación, opción de devolver a pendientes y actualización condicionada al estado anterior; las notas se conservan.                                                           |
| No había exportación práctica de pedidos                               | PDF de todos los pendientes o de una selección. El servidor vuelve a comprobar estados e impide incluir entregados.                                                              |
| Fotos antiguas podían perderse si fallaba la nueva carga               | Validación antes de subir, sustitución transaccional de la galería y limpieza de nuevas imágenes si falla. El límite de Server Actions admite las ocho fotos de 5 MB permitidas. |
| Correo con información insuficiente                                    | Plantillas HTML y texto con nombre completo, categoría, contactos, familia, productos, tallas, personalización, notas y total. Escape de contenido y registro privado de envíos. |
| No había recordatorio mensual fiable                                   | Endpoint autenticado para el día 1 en Madrid, mismo PDF, exclusión de pedidos entregados, deduplicación y reintento. Preparado, todavía sin programación externa.                |

## Verificaciones realizadas

- 58 pruebas en siete archivos: dominio, búsqueda sin tildes, edad, transiciones, permisos, formulario, selección de PDF, rutas, concurrencia, aprobación familiar, correo y recordatorio.
- TypeScript sin errores; ESLint sin errores ni advertencias en el código revisado de tienda.
- Build de producción completado correctamente. Después se ajustaron el encabezado de continuación del PDF y el singular de «unidad»; el primero está cubierto por las pruebas y TypeScript.
- Prueba SQL real con transacción revertida: el gestor ve productos y galerías ocultos; un socio ordinario no. Los usuarios autenticados no pueden leer el registro privado de correos ni ejecutar directamente la sustitución de galería. Un intento inválido conserva las imágenes anteriores.
- Revisión del navegador en 393 × 852 y 412 × 915: pestañas, controles, formulario, retroceso, selección de pedidos y confirmación de entrega. Sin desbordamiento horizontal; controles principales de al menos 48 px.
- Axe, reglas WCAG 2 A/AA, 2.1 AA y 2.2 AA: sin infracciones detectadas en catálogo, lista de pedidos, selección para PDF y primer paso del formulario. No acredita por sí solo conformidad completa ni sustituye probar con Sol.
- La confirmación compartida no presenta infracciones automáticas. Axe requiere revisión manual del contraste de la descripción porque detecta solapamiento; se revisó visualmente la lámina y su texto sobre superficie blanca.
- PDF ficticio de una página y descarga real de 13 pedidos en cinco páginas: inspección visual de la primera página y comprobación de que el texto permanece dentro de las páginas. Prueba adicional de pedido largo con encabezados de continuación.
- Un correo de prueba con datos ficticios y PDF adjunto enviado a `galvillo9@gmail.com`: Resend respondió con éxito. Esto acredita aceptación por el proveedor; no se ha confirmado la recepción en la bandeja del usuario.

No se marcaron como entregados pedidos reales durante la revisión del navegador ni se crearon productos de prueba persistentes.

## Decisiones operativas

El usuario ha indicado que Core sigue en local. El destinatario temporal es `galvillo9@gmail.com` y el enlace de gestión apunta a localhost. El recordatorio mensual permanece desactivado hasta disponer del dominio público y configurar su secreto y programación. La activación está documentada en [Gestión de tienda](../guides/tienda-sol.md).

Se conserva la aprobación familiar de solicitudes de menores. Los estados internos antiguos no se migran de forma destructiva. La categoría por edad se deriva, no se almacena.

Copia local previa del código: `backups/shop-before-redesign-2026-10-01/`, excluida de Git. Los artefactos temporales de pruebas están en `tmp/acta-audit/shop-qa/`, también excluidos.

## Evidencia visual

- [Catálogo en móvil](evidence/admin-shop-redesign-2026-10-01/catalog-mobile.png)
- [Formulario en móvil](evidence/admin-shop-redesign-2026-10-01/product-form-mobile.png)
