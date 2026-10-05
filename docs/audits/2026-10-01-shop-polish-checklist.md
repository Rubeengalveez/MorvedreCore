# Ajustes de tienda solicitados por Rubén

## Lista de comprobación

- [x] Productos por defecto y a la izquierda; Pedidos a la derecha.
- [x] Botón único de PDF fuera de los filtros, con lámina azul y elección de todos o algunos.
- [x] Búsqueda arriba, estados debajo; contadores sin solapamiento ni salto de línea.
- [x] Filtros coherentes en pedidos y productos; búsqueda sin tildes y espacios resistentes.
- [x] Nombre abreviado progresivamente, categoría a la derecha en la misma línea.
- [x] Precio histórico por línea en pedidos múltiples; centrado vertical en artículos sin opciones.
- [x] Historial familiar con padres, hijos, fechas, estados, recuentos y precios originales; regreso al listado conservado.
- [x] Láminas azules en entrega, salida, guardar, ocultar/publicar, eliminar y PDF.
- [x] Botones de producto diferenciados; productos ocultos recuperables en administración y ausentes de la tienda pública.
- [x] Volver con estilo azul de la app; cinco tipos de producto.
- [x] Fotos acumulables hasta ocho, eliminación, orden por arrastre y controles accesibles; primera foto de portada.
- [x] Sin talla, talla única o tallas seleccionables explícitos; conservar talla personalizada.
- [x] Nombre personalizable fijo, consejo breve al comprador, retirar configuración de etiqueta.
- [x] Eliminar máximo por pedido del código activo, formularios, validaciones y esquema.
- [x] Selección de PDF pulsando tarjetas, marcar/desmarcar encontrados y selección visible.
- [x] Correo con «Categoría» y «Correo»; notificaciones de pedido sin PDF adjunto.
- [x] PDF maquetado con tarjetas, tabla de artículos, contactos y totales legibles.
- [x] Verificar pruebas, permisos, fotos, historial, PDF y móvil.

## Resultado de la revisión

- 71 pruebas de tienda superadas en nueve archivos: dominio, carrito, acciones, galería, interfaz, PDF, correos y recordatorio.
- TypeScript, ESLint y compilación de producción (`npm run build`) sin errores. Después de la compilación se corrigieron también las tildes de los mensajes de validación de tienda y se repitieron TypeScript, ESLint y 18 pruebas afectadas, todas superadas.
- Comprobación móvil en 393 × 852 y 412 × 915 px. La búsqueda, los filtros, la selección completa de tarjetas, la galería y el historial se probaron en el navegador local.
- Los contadores se midieron también con cinco cifras: mantienen una sola línea sin solaparse a 393 px. Se usó medición de fuente y Pretext para comprobar las etiquetas.
- Axe no detectó infracciones automáticas en catálogo, pedidos, selección de PDF, historial ni láminas comprobadas. Esto complementa la revisión manual de contraste, orden, foco y controles; no acredita por sí solo conformidad integral con WCAG.
- Galería: añadir archivos conserva los anteriores; se probaron flechas, arrastre y eliminación. Las acciones tienen al menos 48 px.
- Historial familiar: agrupación por vínculos, estados, precios originales y vuelta al listado con búsqueda/filtros y posición conservados.
- PDF descargado con 13 pedidos y 24 unidades: siete páginas, 13 cabeceras y 13 totales, sin texto fuera de los márgenes. Primera y última página inspeccionadas visualmente. La muestra ficticia de dos pedidos cabe en una página. Los pedidos extensos continúan con su referencia.
- Pruebas SQL reales dentro de una transacción revertida: productos y galerías ocultos disponibles para gestión y ausentes para miembros ordinarios; galería fallida conserva las fotos anteriores; galería vacía elimina la portada; ejecución de la función restringida al servidor.

## Decisiones y límites

Los cambios afectan a Core. La demo no se modifica. Se conservan los importes históricos de los pedidos, independientemente de precios posteriores del catálogo. No se envían correos adicionales durante estas comprobaciones ni se crean pedidos reales.

La migración `20261001192215_shop_polish_gallery_and_on_demand.sql` elimina el máximo por pedido, normaliza los cinco tipos y permite vaciar o reordenar la galería de forma atómica. Las migraciones antiguas conservan su definición histórica; el código activo ya no usa el campo retirado.

El recordatorio mensual está preparado, pero sigue pendiente de dominio público y programación al desplegar Core. Los avisos individuales de pedido no adjuntan el PDF. La descarga manual no envía un correo automáticamente.

El asesor de Supabase no señala problemas nuevos de la galería. El aviso informativo de RLS sin política en `shop_email_deliveries` es deliberado: es un registro interno accesible únicamente por el servidor. Permanecen avisos anteriores ajenos a tienda sobre funciones de temporadas/entrenamientos y protección de contraseñas filtradas; no se modifican en esta revisión. Referencias: [RLS sin política](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy), [funciones con permisos elevados](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable), [contraseñas filtradas](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

## Evidencias

- `evidence/admin-shop-polish-2026-10-01/catalog-mobile.png`
- `evidence/admin-shop-polish-2026-10-01/pdf-modal-mobile.png`

- `evidence/admin-shop-polish-2026-10-01/pdf-sample.png` (datos ficticios)

## Incidencia posterior: carga de Añadir producto

La pestaña de Rubén permanecía en «Preparando la tienda» sin el campo de nombre. La comprobación de `getByLabel('Nombre del producto').waitFor(...)` falló en esa pestaña. El servidor había completado las peticiones con HTTP 200 y el navegador no mostraba errores de JavaScript. Una recarga completa recuperó el formulario; la siguiente navegación desde el listado también funcionó. Esto apunta a un estado de navegación del cliente desactualizado tras los reinicios del servidor local, pero no identifica de forma concluyente el mecanismo interno de Next.

Se retiró además la consulta obsoleta `getShopCategories` de añadir y editar, junto con la propiedad no utilizada del formulario. Los cinco tipos se definen en el catálogo de dominio y no necesitan esta consulta para abrir el editor. Se conservan la autenticación y los permisos de gestión.

Verificación del flujo real después del ajuste: volver a Productos → Añadir producto → campo Nombre visible, tres veces consecutivas, sin recarga manual y sin guardar datos. La prueba de interfaz cubre los pasos del editor; el bloqueo original de navegación se verificó en el navegador, ya que una prueba aislada del formulario no reproduce la caché de rutas de Next.
