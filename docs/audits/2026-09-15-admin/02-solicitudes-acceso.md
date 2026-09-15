# 02 · Solicitudes de acceso y cuentas

[Documento general](00-panel-general.md).

## Propósito y usuario

Resolver una solicitud asociando a la persona correcta, evitando duplicar fichas y dejando claro cómo podrá entrar. Actualmente la ruta requiere administrador total; dar esta tarea a secretaría necesita una decisión explícita de permisos.

## Funciones actuales

La ruta `/admin/access-requests` carga solicitudes. El componente presenta datos declarados, candidato/hijos y aprobación individual o múltiple; muestra credenciales temporales devueltas por el servidor. El rechazo llama a una acción que elimina la solicitud. Las acciones están en `server/actions/auth.ts`.

## Hallazgos

- **NAV-01, P1:** falta entrada desde Inicio. La guía de administración sí dice que se puede llegar por ese menú.
- **ACC-01, P1:** `access-requests-manager.tsx` solo procesa `result.success`. No presenta `result.error` ni recupera de manera local una excepción de las acciones. El operador puede pulsar y no saber qué ha pasado.
- **ACC-02, P1:** el lote marca todas las seleccionadas como aprobadas si recibe éxito. El servidor puede acumular errores, aprobar algunas y devolver éxito sin la relación completa de fallidas. Revisar contrato y respuesta por solicitud.
- **ACC-03, P2:** rechazar elimina el registro; no queda un estado rechazado consultable en ese flujo. La acción visible por icono no explica esta consecuencia.
- **ACC-04, P2:** hay copia de `initialRequests` en estado local; verificar conciliación tras refresco, trabajo de otra persona y resultados parciales.
- La gestión de altas no debe confundirse con crear una ficha de jugador: esa ficha puede no tener cuenta.

## Plan de sección

Lista por estados: Pendientes, Resueltas; búsqueda por persona/email. Fila con fecha, tipo de solicitud, coincidencia encontrada y advertencia de datos incompletos. Abrir detalle antes de resolver: persona, vínculos, cuenta existente y resultado previsto.

Acciones visibles: «Aprobar acceso», «Rechazar solicitud», «Volver a pendientes». El rechazo debe explicar y conservar el motivo según política acordada. La aprobación de una cuenta existente debe explicar cualquier efecto sobre su acceso antes de ejecutar.

La aprobación masiva solo debe incluir casos completos y mostrar resultado por fila: aprobada, fallida, pendiente. Reintentar únicamente las fallidas. No convertir «al menos una aprobada» en «todo correcto».

## Accesibilidad y claridad

Acciones de texto, nombres asociados a cada solicitud, contador de selección anunciado y errores con foco/alerta. Credenciales temporales solo en el contexto privado necesario; no guardarlas en capturas del informe ni en registros de diagnóstico. La confirmación debe presentar la consecuencia real.

## Criterios de aceptación

- Llegar desde Inicio sin conocer la URL.
- Distinguir persona nueva de ficha existente sin cuenta.
- Ensayo sintético de aprobación fallida, duplicada y simultánea.
- Lote de tres con un fallo muestra exactamente dos éxitos y un error recuperable.
- El rechazo conserva el historial si se adopta ese requisito.
- Roles no autorizados no pueden aprobar por enlace directo.
- Revisar resultado y siguiente paso con teclado, móvil y lector de pantalla.

## Decisión pendiente

Delegación a Eva y política de conservación de solicitudes rechazadas. No enviar mensajes de acceso ni cambiar cuentas reales durante la auditoría.
