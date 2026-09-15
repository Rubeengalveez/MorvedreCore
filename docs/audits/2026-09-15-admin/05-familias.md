# 05 · Familias

[Documento general](00-panel-general.md).

## Propósito

Saber quién está vinculado a cada jugador y mantener esa relación sin confundir tutela, acceso y persona pagadora. Una familia puede tener varios hijos y varios tutores.

## Actual

`families/page.tsx` carga vínculos y perfiles activos; separa candidatos mediante reglas de edad. `families-manager.tsx` permite buscar, crear vínculo indicando relación y retirar con ConfirmActionSheet. La lista agrupa por tutor. Acciones: `linkParentChild` y `unlinkParentChild`.

## Hallazgos

- **FAM-01, P2 (C):** no aparece edición contextual de una relación existente; el usuario debe descubrir si volver a vincular actualiza o debe retirar primero.
- **FAM-02, P1 (C):** errores de carga descartados; vínculos ausentes pueden parecer inexistentes.
- **FAM-03, P2 (C):** los candidatos dependen de edad y perfil activo. No se explica por qué alguien no aparece ni cómo resolver nacimiento ausente.
- **FAM-04, P2 (C):** búsquedas por tutor/jugador usan placeholder sin etiqueta explícita. En el formulario hay búsquedas y selectores cuyo nombre debe verificarse individualmente.
- Los cargos económicos se configuran en Tesorería. No debe deducirse que todo tutor vinculado es pagador ni permitir acceso económico por proximidad visual.

## Qué conservar, añadir y simplificar

Conservar búsqueda y confirmación al retirar. Añadir detalle por jugador que muestre todos sus tutores y detalle por tutor con todos sus hijos, reutilizando la misma relación. Ofrecer «Editar relación» y «Retirar vínculo» con consecuencias claras. Enlazar a la ficha de persona y al estado de acceso según permiso.

Mostrar vacíos distintos: «No tiene tutor vinculado», «Sin coincidencias» y «No pudimos cargar los vínculos». En selección, explicar si faltan datos o si la persona no cumple el criterio; no enseñar únicamente una lista vacía.

La retirada debe avisar del efecto sobre el acceso familiar, y preservar registros de pedidos y cargos ya generados. El caso de llegada a mayoría de edad requiere regla de producto explícita, no borrar automáticamente relaciones durante una edición.

## Flujo de referencia

Buscar jugador → ver tutores → «Vincular tutor» → buscar persona o ir al alta adecuada → elegir relación → resumen → guardar → relación visible. Si existe, abrir edición en lugar de crear duplicado.

## Aceptación

- Dos tutores y dos hermanos se representan sin duplicar personas.
- Cambiar relación no exige una desvinculación provisional.
- Al retirar, se comprueba el alcance de permisos de la siguiente lectura.
- No se atribuye acceso de cuenta a una ficha sin Auth.
- Un error mantiene el formulario y ofrece reintento.
- Teclado alcanza buscador, resultados y confirmación; foco vuelve a una posición útil tras retirar.
- Validar menor, adulto, nacimiento ausente e inactivo en datos sintéticos.

## Decisiones

Acordar tratamiento de vínculos de jugadores adultos y distinción entre tutor, contacto y pagador. Respetar las reglas actuales hasta resolverlo; no crear una nueva categoría de datos por esta auditoría.
