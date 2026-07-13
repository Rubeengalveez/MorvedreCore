# Resumen de Fase 5 — Tienda

> Estado: completada, compilando, validada. Pendiente aplicar la migracion 0028_shop.sql en el SQL Editor de Supabase.

## Logros

### Base de datos (1 migracion nueva)

- 0028_shop.sql: shop_products + shop_orders + shop_order_items + shop_order_status enum + bucket shop-images
- RLS: lectura publica para productos disponibles, escritura solo admin, pedidos visibles para solicitante/su parent/admin
- El bucket shop-images se crea desde la API (createBucket) con 5 MB max, JPG/PNG/WebP

### Funciones de dominio (lib/domain/shop.ts)

- parseProduct: valida y normaliza un producto (titulo 3-80, descripcion 1-2000, categoria 1-40, precio 0.01-1000, stock 0-1000, max_per_order 1-20)
- parseCartItem: valida un item del carrito
- summarizeCart: calcula lineas + total + item_count, valida que todos los productos existen y estan disponibles
- formatCents: formatea a "25.99 EUR"
- isValidShopOrderStatus: type guard
- SHOP_KANBAN_COLUMNS: array con las 5 columnas del Kanban
- SHOP_ORDER_STATUS_LABELS: labels en espanol
- 19 tests unitarios

### Server actions (server/actions/admin/shop.ts)

- createShopProduct, updateShopProduct, deleteShopProduct (admin, con upload de imagen a Storage)
- updateShopOrderStatus (admin, mueve el pedido en el Kanban)
- createShopOrder (player, valida productos y notifica a los parents)
- decideShopOrder (parent, approve o reject)
- requireSessionProfile helper anadido a \_helpers.ts

### Server queries (server/queries/shop.ts)

- getShopProducts, getShopProduct, getShopCategories
- getShopOrder (con items + info de profiles)
- getShopOrdersForPlayer, getPendingShopOrdersForParent, getShopOrdersForKanban

### Vistas UI (10 paginas nuevas)

- /shop (catalogo): grid 2 cols, filtro por categoria, precio destacado
- /shop/[id] (detalle): imagen, descripcion, tallas, cantidad, anadir al carrito
- /shop/cart: lista + total + solicitar a padre/madre
- /shop/orders: mis pedidos
- /shop/orders/[id]: detalle
- /shop/parents/pending: aprobar/rechazar
- /admin/shop (Kanban): 5 columnas con flujo (pendiente padre -> aprobado -> pedido -> recibido -> entregado)
- /admin/shop/products/new: editor
- /admin/shop/products/[id]/edit: editor

### Componentes UI nuevos

- cart-button, cart-client, admin-kanban-card, shop-editor-form
- hook use-shop-cart con localStorage

## Validacion

```
lint:        0 errores, 3 warnings pre-existentes
typecheck:   0 errores
tests:       438 passed, 22 skipped (460 totales)
build:       33 rutas, 0 errores
```

## Tests nuevos (Fase 5)

19 tests en tests/unit/shop.test.ts: parseProduct (5), parseCartItem (4), summarizeCart (4), formatCents (2), isValidShopOrderStatus (1), validaciones varias.

## Como probar

1. Aplicar migracion 0028_shop.sql en el SQL Editor de Supabase:
   - Pega el contenido de docs/apply-phase5-shop.sql
   - Pulsa Run
   - Crea las 3 tablas, el enum, las policies de RLS y las policies del bucket shop-images

2. Login con una cuenta admin de pruebas configurada fuera del repositorio.

3. Como admin:
   - /admin/shop -> Kanban de pedidos (vacio al inicio)
   - "+ Producto" -> /admin/shop/products/new -> crear un producto

4. Como player (cambia a otro perfil):
   - /shop -> catalogo con el producto
   - Click en un producto -> selecciona talla y cantidad
   - "Anadir al carrito" -> ver el badge
   - "Ver carrito" -> /shop/cart -> "Solicitar a mi padre/madre"
   - Va a /shop/orders/[id] con status "Esperando padre"

5. Como parent:
   - /shop/parents/pending -> aprobar o rechazar
   - Si aprueba, el pedido pasa a "Aprobado por padre" en el Kanban

6. Volver a admin:
   - En /admin/shop, el pedido aparece en "Aprobado por padre"
   - Click "Pedir" -> "Pedido al proveedor"
   - Click "Recibido" -> "Recibido"
   - Click "Entregado" -> "Entregado"
   - O click X para cancelar

## Decisiones de diseno

- Carrito en localStorage (no en Supabase): simple, persistente, sin tablas extra
- MVP del flujo (parent-only): el padre aprueba o rechaza; el admin gestiona el flujo post-aprobacion
- Estados del Kanban alineados con la operativa: pending_parent, pending_admin, ordered, received, delivered
- Imagen via Storage bucket shop-images: publico para SELECT, restringido a admin para INSERT/UPDATE/DELETE
- Rango de precio 0.01-1000: cubre desde productos baratos hasta caros
- Stock opcional: si es null, no se controla inventario
- Categorias dinamicas: el admin las crea al anadir producto; el selector se genera automaticamente
