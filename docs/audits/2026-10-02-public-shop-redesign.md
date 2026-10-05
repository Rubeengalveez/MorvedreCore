# Tienda pública · auditoría y rediseño

Fecha: 2 de octubre de 2026. Alcance: Core, catálogo, ficha de producto, galería, carrito, confirmación, pedidos propios y familiares, aprobación familiar y entrada del pedido en el cierre mensual. La demo no se modifica.

## Auditoría inicial y correcciones

| Hallazgo                                                                    | Corrección                                                                                                                                                |
| --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Catálogo con poca jerarquía para imagen, nombre e importe                   | Tarjetas delimitadas, fotos completas, títulos legibles y precio destacado en euros                                                                       |
| Estilos distintos entre administración y tienda pública                     | Controles, superficies, nombres y decisiones compartidos en `components/shop`; administración conserva su aspecto mediante reexportaciones                |
| Carrito y pedidos difíciles de localizar                                    | Navegación Productos / Carrito / Mis pedidos en todas las vistas, con unidades reales y selección visible                                                 |
| Añadir y enviar podían confundirse                                          | Añadir conserva el producto localmente; revisar abre la confirmación azul con total y contacto; solo confirmar envía; comprobante persistente en pantalla |
| El carrito normalizaba cantidades a una unidad                              | Restauración de cantidades, variantes independientes y controles de unidades con totales coherentes                                                       |
| Cabecera y artículos se guardaban por separado                              | RPC transaccional: validación, bloqueo de precios, cabecera, artículos y contacto; un fallo revierte todo                                                 |
| Un reintento podía duplicar el pedido                                       | Clave de envío persistida por perfil y contenido, índice único y bloqueo transaccional; repetición devuelve el mismo comprobante                          |
| Precios podían cambiar entre revisión y envío                               | Total esperado contrastado en base de datos; si cambia, se pide actualizar y revisar, sin guardar un importe diferente                                    |
| Historial omitía pedidos por aprobar y rechazados, y cortaba a 50 registros | Todos los estados, paginación, búsqueda y separación Activos / Historial                                                                                  |
| Un producto oculto o renombrado perdía contexto histórico                   | Precio, título y foto conservados en los artículos; ocultar no impide consultar el pedido                                                                 |
| Un pedido de septiembre aprobado en octubre podía quedar fuera del cierre   | Fecha de aprobación para el cierre; fecha de solicitud como compatibilidad para pedidos antiguos sin aprobación registrada                                |
| El teléfono editable no se respetaba si ya existía otro guardado            | Se usa el contacto elegido para ese pedido; un teléfono de perfil existente permanece intacto                                                             |
| Un aviso posterior podía presentar una aprobación guardada como fallida     | El resultado de la aprobación permanece correcto aunque falle la notificación posterior                                                                   |
| Fallos de lectura parecían productos inexistentes o historiales vacíos      | Pantalla de recuperación y errores de carga diferenciados de ausencia real                                                                                |

## Diseño y accesibilidad

- Fondo y componentes de la identidad actual; blanco, cabeceras azul profundo y contornos oscuros.
- Búsqueda inmediata por palabras, sin distinguir mayúsculas ni tildes; filtro nativo por tipo de producto y botón activo visible.
- Fotos sin recorte, ampliación, miniaturas y controles de galería con etiquetas. Descripción accesible del modal.
- Opciones secundarias de carrito plegadas; total y acción principal con prioridad. No hay pago dentro de la aplicación.
- Decisiones con la lámina azul del acta, carga bloqueada, cancelación clara, foco contenido y retorno al control que abrió la confirmación.
- Controles principales de 48–64 px, texto habitual de 16 px y etiquetas secundarias de 14 px. Nombres abreviados en una línea y nombre completo disponible para lector de pantalla.
- Búsqueda/filtro conservados al volver de un producto; historial/búsqueda conservados al volver de un pedido.
- Estados descritos con texto e iconos, además de color. Pendiente familiar y confirmación para menores siguen separados del envío a Sol.
- Carga, error y contenido no disponible adaptados al estilo de tienda.

## Integridad y permisos

La Server Action valida con Zod y obtiene la identidad de la sesión. `submit_shop_checkout` solo permite ejecución a `service_role`; no acepta identidad elegida por el cliente. La función comprueba perfil activo, tutor vinculado cuando corresponde, producto disponible, moneda, talla, personalización, cantidad e importe. Se mantienen RLS y las protecciones de escritura existentes.

Los importes se calculan con enteros en céntimos. Cabecera y líneas se guardan juntas. La clave única de confirmación evita repetir pedidos y sus avisos al reintentar. La aprobación familiar verifica vínculo, edad y estado pendiente, con actualización condicionada para no sobrescribir otra decisión.

El carrito permanece local por perfil; no confirma sin conexión y se conserva si falla el envío o el almacenamiento. No se añade caché autenticada al service worker. La aplicación no cobra ni añade un máximo comercial de unidades.

Migraciones aplicadas: `20261002010513_shop_public_checkout.sql` y `20261002014423_shop_checkout_contact.sql`.

## Verificación

- 144 pruebas correctas en 21 archivos de tienda, aprobación familiar y tesorería: interfaz, cantidades, validación, teléfono, confirmación explícita, reintentos, doble pulsación, errores de almacenamiento, productos ocultos, historial, paginación, permisos, aprobación y cambio de mes. También se comprueba que sin conexión o sin poder guardar la clave de reintento no se envía ni se borra el carrito.
- Prueba SQL real `supabase/tests/shop-public-checkout.sql`: totales y artículos, tallas/nombre, cambio de precio, idempotencia, histórico, contacto por pedido, producto oculto, menor con tutor y permisos RPC. Ejecutada dentro de transacción y terminada con `ROLLBACK`; no conserva pedidos ni productos de prueba ni envía correos.
- TypeScript y ESLint del alcance correctos. Build de producción comprobado.
- Exploración móvil real mediante navegador: añadir con talla/nombre obligatorios, aumentar/reducir unidades, revisar sin enviar, cerrar con Escape, ampliar/cambiar fotos, buscar sin tildes, filtrar, consultar estados y volver.
- Axe WCAG A/AA en catálogo, producto, carrito, confirmación, galería, listado y detalle. Sin infracciones detectadas en las vistas comprobadas. Las comprobaciones automáticas de contraste sobre fotos o elementos superpuestos pueden quedar indeterminadas; se revisan además las superficies y los colores sólidos.
- Contraste manual del azul profundo de texto sobre azul claro informativo: 14,75:1, usando los colores calculados por el navegador (`rgb(6,32,72)` sobre `rgb(239,246,255)`). La advertencia indeterminada de Axe en la confirmación corresponde al solapamiento de superficies, no a una infracción de contraste detectada.
- Comprobación principal a 393 × 852 px, además de 412 × 915 y anchura de respaldo de 320 px. Pretext confirma que las tres etiquetas de navegación caben en una línea.

La ejecución global encontró también un test previo de acta que espera botones de jugadores no disponibles y una integración Challenger bloqueada por `fetch failed` al crear su usuario remoto. No se cambia acta ni se afirma que toda la suite global esté verde. Los dos tests antiguos de aprobación familiar se actualizaron a la confirmación explícita y pasan.

No se han enviado pedidos reales, correos nuevos ni generado cobros durante la prueba de interfaz. No se ha ensayado NVDA/VoiceOver ni instalación en un teléfono físico; la comprobación de navegador no sustituye esas pruebas o la validación presencial de Sol.

## Evidencias y retorno

Capturas en `docs/audits/evidence/shop-public-2026-10-02/`. Respaldo previo del código afectado en `tmp/shop-public-before-2026-10-02/source.zip` y parche del estado anterior en `working-tree.patch`, excluidos de Git. Los cambios previos de otras secciones se conservan.

Las columnas añadidas son compatibles con el código anterior. Para volver al frontend anterior se puede recuperar el respaldo; no se deben borrar pedidos ni eliminar sus columnas para deshacer el diseño.
