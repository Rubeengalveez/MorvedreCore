# 06 · Personal y permisos

[Documento general](00-panel-general.md).

## Trabajo que debe permitir

Asignar entrenador/delegado a equipos actuales y conceder capacidades de gestión a secretaría, tienda y tesorería. Poder responder «¿Qué puede hacer esta persona y en qué equipos?» sin interpretar tablas internas.

## Inventario actual

`staff/page.tsx` reúne personal, equipos, personas y permisos. `staff-client.tsx` muestra gestor de permisos globales para admin total y asignaciones técnicas. `staff-manager.tsx` y el detalle de Equipos tienen entradas relacionadas. El modelo central distingue administración total, capacidades modulares, entrenador por equipo y delegado.

## Hallazgos

- **PER-01, P2 (C):** descripción «permisos para pasar lista» no corresponde al gestor de nueve capacidades mostrado; `manage_attendance` está excluido del gestor.
- **PER-02, P2 (C):** selección de todos los equipos con temporada, incluyendo cursos antiguos, sin contexto operativo actual.
- **PER-03, P1 (C/H):** consultas ignoran errores. Es necesario contrastar asignaciones en `team_staff`, roles en `user_roles`, capacidades derivadas y políticas SQL. Un rol global de entrenador no equivale al alcance por equipo.
- **PER-04, P2 (C):** cada botón guarda inmediatamente un permiso. La interfaz debe aclarar el guardado inmediato y la persona afectada; actualmente el selector elige la primera persona por defecto.
- **PER-05, P2 (C):** asignación repetida desde Personal y Equipos, con candidatos y explicación que pueden divergir. Unificar el flujo, conservar ambas entradas contextuales.
- El informe operativo registra una migración deportiva pendiente. Es evidencia histórica, no confirmación de que siga pendiente hoy.

## Propuesta

Dos vistas: «Personal deportivo» y «Permisos de gestión». En Personal deportivo, filas por persona con equipos actuales y cargo; se entra en detalle para añadir/cambiar/retirar. En Permisos, buscar y seleccionar explícitamente persona, ver alcance efectivo y motivo: administrador, entrenador de equipo o capacidad específica.

El resumen debe explicar «Gestiona partidos de Cadete B y Juvenil» o «Gestiona tienda del club». No mostrar diez interruptores como única explicación del acceso.

Separar permisos editables de acceso heredado por rol. Para cambios múltiples, propuesta de revisión antes de guardar; para cambio individual, guardado inmediato inequívoco y mensaje de resultado. No inventar un editor libre de políticas.

## Aceptación

- Alta y retirada de entrenador coinciden en menú, página, acción y consulta real.
- Delegado opera el partido permitido, sin recibir programación general.
- Mónica solo recibe tesorería; Sol solo tienda.
- Cambiar perfil familiar no amplía permisos de cuenta.
- Error de lectura no se muestra como ausencia de asignaciones.
- Una retirada no borra personal del curso anterior.
- Persona objetivo visible durante todo el cambio; teclado y lector anuncian guardado/error.

## Dependencias

Matriz de permisos validada con cuentas de ensayo. Decidir delegación de Solicitudes a secretaría y evitar que gestionar personal permita concederse administración total.
