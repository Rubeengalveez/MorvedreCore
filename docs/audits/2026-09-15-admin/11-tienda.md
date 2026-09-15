# 11 · Tienda: catálogo y pedidos

[Documento general](00-panel-general.md).

## Qué queremos

Sol debe poder mantener el catálogo vigente y completar un pedido. Gestionar catálogo y atender pedidos son dos trabajos distintos dentro de la misma sección.

## Funciones existentes y huecos

| Tarea | Código local | Acceso actual |
| --- | --- | --- |
| Crear producto | createShopProduct + formulario | Botón «Producto» |
| Editar producto | updateShopProduct + /products/[id]/edit | Sin enlace de entrada encontrado en UI |
| Eliminar producto | deleteShopProduct + modo edición | Depende de alcanzar edición |
| Ocultar producto | available en editor | Depende de alcanzar edición |
| Imágenes, tallas, personalización | Editor | Gestión parcial de imágenes existentes |
| Avanzar pedido | updateShopOrderStatus | Tablero |
| Cancelar pedido | Existe | X inmediata |
| Pedidos cancelados/rechazados/pendientes de familia | Estados existentes | No incluidos en tablero admin |
| Exportar Excel | Endpoint y enlace | Visible; sin manejo de error como descarga de tesorería |

## Hallazgos

- **TIE-01, P1 (C/R):** `shop/page.tsx` no carga ni lista productos. El usuario no puede encontrar desde allí qué editar o retirar. No hace falta reimplementar el CRUD.
- **TIE-02, P1 (C):** `admin-kanban-card.tsx` cancela sin confirmación. El estado cancelado no tiene transición de vuelta y desaparece de las columnas consultadas.
- **TIE-03, P2 (C):** tablero incluye entregados, pero excluye pendientes de familia, rechazados y cancelados; sin búsqueda/paginación en pantalla. En móvil todas las columnas se apilan, por lo que entregas requieren desplazamiento.
- **TIE-04, P2 (C):** galería existente se muestra como elementos estáticos; no se ofrece eliminar/reordenar cada imagen. Las nuevas portadas salvo la seleccionada carecen de nombre en sus botones.
- **TIE-05, P1 (C):** error de carga de pedidos retorna lista vacía en `getShopOrdersForKanban`.
- **TIE-06, P2 (C):** `deleteShopProduct` hace borrado físico; la FK de artículos de pedido referencia producto sin cascada. Productos usados pueden no borrarse; falta explicación de «Retirar del catálogo».
- Denominaciones «Pendiente de Sol», «Firma padre», «Encargado» y «Pedido al proveedor» no son uniformes. No hay confirmación de qué productos o campos considera obsoletos Rubén.

## Propuesta de navegación

**Pedidos · Catálogo.** Catálogo: búsqueda, visibles/ocultos, categoría; fila con foto, nombre, precio, variantes y estado. Acciones «Editar producto», «Ocultar del catálogo», «Volver a publicar». «Eliminar» solo para producto sin uso, explicando límites. Abrir producto público como acción secundaria de vista previa.

Editor por bloques: Datos, Precio y opciones, Imágenes, Visibilidad. Subir, retirar, ordenar y elegir portada con botones y alternativa de teclado; conservar imágenes al editar otro dato.

Pedidos: lista por estado con contadores, búsqueda por referencia/persona y detalle. «Por encargar», «Por recibir», «Por entregar» primero; «Historial» para entregados/cancelados/rechazados y pendientes de autorización identificados. Tablero opcional en escritorio, no única forma de operar.

Detalle muestra todas las líneas, talla, personalización, contacto permitido y estado. Avanzar con acción explícita y confirmación cuando sea difícil revertir; cancelación con motivo. No implantar devoluciones o inventario de almacén sin requisito validado.

## Aceptación

- Desde Tienda, localizar y editar cualquier producto, incluido oculto.
- Retirar producto con pedidos conserva importes y referencia histórica.
- Error de carga no aparece como «Sin pedidos».
- Cancelar tiene explicación y queda consultable.
- Modificar fotos no borra otras por accidente; portada accesible.
- Excel corresponde al filtro/alcance declarado.
- Un pedido se completa en móvil sin atravesar todos los entregados.
- Ensayos sintéticos de cambio simultáneo, reintento y producto referenciado.

## Preguntas necesarias

Validar catálogo vigente con Sol/Rubén y si se necesitan correcciones de pedidos ya entregados. La auditoría no elimina productos ni estados por antigüedad aparente.
