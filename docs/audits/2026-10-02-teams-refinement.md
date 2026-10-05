# Equipos: refinamiento y acceso del personal

Complemento de las auditorías de equipos del 2 de octubre. Cambios en Core; la demo no se modifica.

## Peticiones completadas

- [x] Nombres de ambos equipos y vs centrados verticalmente en los encuentros pendientes, incluso con nombres que ocupan dos líneas.
- [x] Cabecera compacta sin repetir Juvenil, Cadete u otra categoría en un distintivo adicional.
- [x] Refuerzos con el color de su categoría de edad; no adoptan el color del equipo superior.
- [x] Título y explicación de refuerzos dentro de una superficie azul clara con contorno oscuro.
- [x] Administración sin búsqueda ni filtros de equipos.
- [x] Retirado el distintivo de temporada bajo Gestionar equipos. El directorio muestra la temporada actual.
- [x] Ver equipo situado arriba, junto al regreso al directorio, en lugar del enlace inferior repetido.
- [x] Selección de jugador y gorro reorganizada: categoría visible, gorros ocupados desactivados y Sin asignar explícito.
- [x] Categoría derivada del nacimiento y temporada del equipo, visible en candidatos y jugador elegido.
- [x] Notas internas retiradas de edición y consulta. Se conservan los datos anteriores sin borrarlos.
- [x] Control de color visible directamente en la edición.
- [x] Regreso desde la ficha pública al equipo y pestaña administrativa de origen, conservado entre pestañas y consultas de jugadores o partidos.
- [x] Categorías de plantilla administrativa con nombre y distintivo de color, sin depender únicamente del color.
- [x] Personal nuevo limitado a Entrenador y Delegado. Acceso deportivo común limitado al equipo; asistencia solo para entrenador.
- [x] Datos de equipo delimitados por contornos oscuros.

## Permisos y persistencia

La migración `20261002150000_team_official_shared_access.sql` está aplicada. Se armonizan la autorización de servidor, los filtros de alcance, las políticas de partidos, entrenamientos y tiempos de nado, y las comprobaciones de autorización de las RPC del acta. La lógica de sanciones, participación y contenido del acta no se sustituye. La asistencia conserva su comprobación específica de entrenador.

El trigger de personal crea el rol del equipo dentro de la misma transacción. Retirarlo elimina el rol correspondiente cuando no queda otra asignación equivalente en ese equipo. No elimina roles de otros equipos. Las asignaciones históricas de ayudantes siguen siendo consultables y retirables; el formulario nuevo ofrece solo las dos funciones solicitadas.

Antes de cambiar permisos se guardaron las definiciones y políticas consultadas en `tmp/team-refinement-2026-10-02/database-before.json`. Es una captura de ese ámbito, no un respaldo integral de Supabase.

## Verificación

- 95 pruebas correctas en 12 archivos: formularios de equipos, categorías, alcance de permisos, acceso al acta, acciones, listas de encuentros, navegación, perfiles y tiempos de nado.
- TypeScript y compilación de producción correctos. ESLint del ámbito modificado sin errores ni advertencias.
- Prueba SQL `tests/database/team-official-access.sql` ejecutada correctamente con rollback: asignación y cambio de función, revocación, conservación de otros equipos, gestión de partido y entrenamiento, rechazo de acceso ajeno y rechazo de autoasignación de entrenador por un delegado. El delegado no obtiene permiso para pasar lista.
- Las llamadas de prueba al acta llegan a la validación de contenido después de superar autorización. No se sobrescribe un acta real ni se simula una sincronización completa con documento válido.
- Navegador autenticado a 393 × 852 px: edición, gorros, categorías, ficha pública y regreso a Datos. Todas las altas y ediciones de prueba se cancelan.
- Los centros verticales de ambos nombres y vs coinciden a 590 px en la tarjeta pendiente observada.
- Axe WCAG A/AA/2.2 AA: cero infracciones detectadas en Resumen, Plantilla, Datos, selector de gorros y selector de personal. El selector de gorros tiene resultados de contraste incompletos para cifras que requieren inspección manual; se comprueban los gorros habilitados y deshabilitados. No constituye una certificación WCAG.
- Validación de texto con Pretext: Plantilla, Personal y Datos caben en una línea a 393 px. Las tres pestañas tienen 56 px de alto.

## Evidencias

- [Cabecera compacta y nombres centrados](evidence/teams-refinement-2026-10-02/resumen.png)
- [Refuerzos con categoría de origen](evidence/teams-refinement-2026-10-02/refuerzos.png)
- [Selección de jugador y gorro](evidence/teams-refinement-2026-10-02/gorros.png)
- [Datos con contornos oscuros](evidence/teams-refinement-2026-10-02/datos.png)
