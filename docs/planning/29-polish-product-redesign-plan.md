# Pulido de producto y rediseño operativo

Fecha: 2026-07-14

## Objetivo

Cerrar los problemas detectados durante la revisión manual y dejar las áreas de uso diario más claras, fiables y consistentes en móvil, sin alterar permisos ni flujos de negocio ya validados.

## Problemas confirmados

- Perfil intenta inferir una categoría de cantera para perfiles adultos y puede lanzar una excepción.
- El perfil mezcla identidad, calendario, disponibilidad, rankings y ajustes sin una jerarquía útil.
- El carrito solo carga productos publicados; una referencia local a un producto retirado queda invisible y no se puede eliminar.
- Las tarjetas de tienda fuerzan precio y personalización en una misma fila estrecha y desbordan a 320 px.
- La tienda conserva conceptos de stock que no corresponden a un catálogo bajo demanda.
- Equipos antepone equipos propios y añade un índice horizontal que no aporta navegación real.
- Equipos no distingue visualmente pertenencia como jugador y asignación como entrenador titular.
- El podio usa posiciones compartidas en empates para identificar sus tres tarjetas y puede omitir puestos visuales.
- Las filas de ranking no exponen el contexto mínimo para interpretar cada métrica.
- Los controles de rachas pierden parámetros y no explican qué mide cada tipo.
- Rivalidades muestra simultáneamente bloques alternativos que deberían seleccionarse.
- La hoja de calendario necesita más espacio inferior y bloqueo modal verificable.
- Las pantallas pública y administrativa de partido tienen demasiadas piezas planas, guardados poco claros y un acta basada en campos numéricos pequeños.
- La convocatoria sugerida no pondera continuidad, rendimiento, edad, asistencia y disciplina.
- La navegación inferior mantiene un indicador naranja redundante.
- La aplicación solo tiene un esqueleto raíz genérico y carece de una transición de entrada coherente entre áreas.

## Secuencia de implementación

1. Corregir fallos bloqueantes de Perfil, carrito y edición de partido.
2. Reinventar Perfil alrededor de identidad, roles, resumen útil y accesos de cuenta.
3. Reordenar Tienda, corregir tarjetas, eliminar stock y añadir galería ampliable con gesto y controles visibles.
4. Ordenar Equipos por categoría y distinguir jugador de entrenador titular.
5. Rediseñar Rankings, rachas, podio, filas de métricas y rivalidades.
6. Mejorar hoja de Calendario y vistas pública y administrativa de Partido.
7. Rehacer convocatoria, acta y algoritmo de sugerencia con criterios trazables.
8. Unificar cabeceras compactas, esqueletos, estados de carga y movimiento accesible.
9. Validar TypeScript, lint, tests, build, navegación móvil, accesibilidad y esquema Supabase.

## Criterios de aceptación

- Ninguna ruta solicitada produce error con el perfil administrador real.
- Todas las líneas del carrito son visibles y eliminables, aunque el producto se haya retirado.
- La tienda no comunica cantidades ni disponibilidad de stock.
- Las tarjetas no desbordan a 320 px y las imágenes pueden ampliarse y recorrerse.
- Equipos aparece siempre de Escuela a Absoluto y usa marcas diferentes para jugador y entrenador titular.
- Rankings muestra tres personas en el podio si existen al menos tres, incluso con empate.
- Cada métrica incluye su denominador o promedio sin saturar la tarjeta.
- Las rachas cambian sin perder filtros y explican su significado.
- El fondo del calendario no es interactivo al abrir la hoja y la última tarjeta queda separada de la navegación segura.
- El acta y la convocatoria se pueden completar con controles grandes, estados de guardado claros y sin campos microscópicos.
- La sugerencia de convocatoria prioriza, por orden: convocatoria anterior, goles, edad, asistencia y menos expulsiones.
- La navegación inferior no muestra el punto naranja.
- Las animaciones respetan `prefers-reduced-motion` y se limitan a opacidad y transformaciones.
- Tests, typecheck y build de producción terminan correctamente.
