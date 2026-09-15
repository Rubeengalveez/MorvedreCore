# 12 · Tesorería

[Documento general](00-panel-general.md).

## Objetivo

Mónica debe conocer qué se cobra, a quién y por qué, corregir la configuración y cerrar un mes con Excel y envío. Se registran cobros realizados fuera de la app; no se introduce pasarela de pago.

## Actual

La página reúne estadísticas, pagadores/cuotas por jugador, alta de concepto, asignación, generación de cierre, listas de conceptos/cierres y últimas líneas. El detalle calcula total/pagado/pendiente, descarga Excel, envía correo y cambia estado pagado. Existen acciones de upsert de conceptos, asignaciones, ajustes de perfil y generación transaccional de cierre.

## Hallazgos

- **TES-01, P1 (C):** `ConceptForm` siempre envía `active: true` y no recibe concepto existente; el listado no tiene editar/desactivar. `AssignmentForm` tiene alta, sin gestión visible equivalente de asignaciones. Hay capacidad de servidor que no se traduce en mantenimiento comprensible.
- **TES-02, P2 (C):** configuración estructural y tarea mensual compiten en la misma página. Contadores de conceptos/asignados no priorizan trabajo pendiente.
- **TES-03, P2 (C):** se presentan `periodicity` y `closure.status` directamente; aparecen «monthly», «draft» u otros valores del esquema. Texto sin tildes y «Último» sin indicar periodo.
- **TES-04, P1 (C):** errores de ConceptForm, AssignmentForm y ClosureForm son párrafos sin anuncio de estado; botones bloqueados sin feedback consistente.
- **TES-05, P2 (C):** campo «Enviar a» dentro de generación puede hacer pensar que generar envía; el envío real está separado.
- La revisión anterior acredita mejoras de integridad/exportación, pero registra correo real pendiente. No convertir esa evidencia histórica en verificación actual.

## Nueva estructura

**Resumen · Cuotas y cargos · Cierres.**

Resumen: periodo actual, pendientes de revisión y acceso a personas con configuración incompleta. Cuotas y cargos: lista editable de conceptos con vigencia y estado; asignaciones por persona con editar/finalizar; pagador y excepciones en ficha.

Cierres: elegir periodo → revisar datos y advertencias → generar borrador → revisar líneas y totales → descargar o enviar → registrar cobros. Mostrar claramente si un cierre es borrador, enviado o archivado y qué puede modificarse en cada estado.

El borrador debe mostrar origen de cada cargo: cuota, tienda, ajuste o desplazamiento según el modelo real. No borrar líneas enviadas como forma de corregirlas; acordar ajuste compensatorio y trazabilidad. No duplicar cobros al regenerar.

## Acciones y copias propuestas

«Crear concepto», «Editar concepto», «Desactivar para futuros cargos», «Asignar cargo», «Finalizar asignación», «Revisar cierre de septiembre», «Generar borrador», «Descargar Excel», «Enviar cierre por correo», «Marcar como cobrado».

Explicar el efecto de cambiar una tarifa y fecha de vigencia. Que la persona no tenga concepto asignado puede ser normal; no inventar deuda.

## Aceptación

- Mantener concepto y asignación desde la app, sin repetir código técnico para editar.
- Cierre de mes conserva origen de líneas y total exacto en UI/Excel.
- Producto/pedido antiguo no altera el importe histórico.
- Regeneración prohibida cuando corresponda y explicada.
- Error de correo no figura como enviado; reintento no duplica comunicaciones sin control.
- Mónica descarga con su capacidad, familiar no puede consultar cierre del club.
- Filtros por cobro/persona facilitan listas largas; nombre e importe completos en móvil.
- Ensayos de fallo parcial, cambio de mes/zona horaria y modificación simultánea.

## Dependencias y límites

Tienda, familias/pagadores, asistencia si alimenta cuotas y periodo de temporada. Validar con Mónica la política de ajustes y cobros parciales antes de añadir funciones. En esta auditoría no se generan cierres, descargan datos económicos reales ni envían correos.
