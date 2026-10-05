# Inicio de Administración · 2 de octubre de 2026

## Auditoría y cambios

La pantalla anterior daba prioridad al saludo y a cuatro contadores generales que no ayudaban a elegir una función. Los contornos eran demasiado claros, el título Administración no se mostraba como referencia principal y la separación decorativa no seguía los criterios actuales del proyecto.

Se sustituye por un título directo y accesos completos con icono, nombre, descripción breve y flecha. Se usan azul oscuro, fondo blanco y contorno oscuro, de acuerdo con tienda, equipos y acta. El menú separa Gestión diaria, Personas y Organización cuando hay más de un grupo autorizado. Con un solo ámbito no añade una cabecera visual redundante.

Se eliminan los cuatro contadores y sus consultas, incluida la lectura privilegiada con cliente administrativo. No se añade búsqueda ni filtros. El menú sigue siendo un componente de servidor y no envía accesos ocultos como controles desactivados.

## Permisos

La consulta de los perfiles actuales confirma que Sol Romero tiene `manage_shop`, Mónica Gil `manage_treasury`, y ninguna tiene un rol global `admin` ni una asignación deportiva que añada otros accesos. El filtrado existente ya era correcto y se conserva utilizando `canAccessAdminModule`.

El menú renderizado para Sol contiene únicamente Tienda y el de Mónica únicamente Tesorería. Las protecciones de las rutas se mantienen: escribir la URL de otro módulo no da acceso. El administrador general conserva los doce enlaces y el personal deportivo solo recibe los módulos correspondientes a su alcance.

No se cambian perfiles, roles, políticas SQL ni permisos. No se inicia sesión como Sol o Mónica; se comprueban sus permisos reales y se prueban esas configuraciones sobre el componente y el guard de rutas.

## Verificaciones

- 23 pruebas correctas en tres archivos: menú por permisos, combinación de permisos, ausencia de accesos para miembros sin permisos, alcance deportivo, administrador general y rechazo de URLs de módulos ajenos.
- TypeScript, ESLint del ámbito modificado y compilación de producción correctos.
- Navegador autenticado a 393 × 852 px: enlaces grandes, títulos en una línea, sin desbordamiento horizontal.
- Axe WCAG A/AA/2.2 AA sobre el contenido principal: cero infracciones y cero resultados incompletos.
- Pretext confirma que los doce títulos caben en una línea a 393 px. Los accesos tienen al menos 80 px de alto.
- Navegación con teclado: Tab mueve el foco de Partidos a Entrenamientos y muestra un contorno de 2 px.
- Enter abre la gestión de partidos y el enlace Volver al panel de administración devuelve al menú.

La comprobación automática no equivale a certificación WCAG ni a una sesión con lector de pantalla nativo.

## Evidencia

[Menú a tamaño móvil](evidence/admin-home-2026-10-02/menu-393.png)
