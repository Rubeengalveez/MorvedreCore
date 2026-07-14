# Resumen del pulido de producto y rediseño operativo

Fecha: 2026-07-14

## Resultado

La iteración transversal de Perfil, Tienda, Equipos, Rankings, Calendario y gestión de partidos queda implementada y validada en móvil con la cuenta administradora real.

## Cambios entregados

- Perfil se reconstruye alrededor de identidad, roles, equipos, funciones y accesos útiles. El calendario deja de ocupar la pantalla y la sincronización queda como utilidad secundaria.
- La categoría Absoluto acepta jugadores adultos sin límite máximo artificial, evitando la excepción que bloqueaba el perfil de Rubén y cualquier vista que derive su categoría.
- Todas las rutas del área autenticada comparten un esqueleto animado y una entrada breve basada en opacidad y desplazamiento. La reducción de movimiento desactiva ambas.
- Tienda prioriza carrito, búsqueda y pedidos; presenta precios y personalización sin desbordes, funciona bajo pedido y elimina el concepto de stock del dominio, administración, tipos y base cloud.
- El carrito muestra referencias retiradas o no publicadas con una acción visible para quitarlas.
- La galería de producto permite ampliar, avanzar, retroceder y deslizar cuando hay varias imágenes.
- Equipos se ordena de Escuela a Absoluto y distingue `Juegas aquí` de `Entrenador titular`, sin anteponer equipos propios ni conservar el selector horizontal redundante.
- Rankings incorpora denominadores y medias por métrica, tres personas deterministas en el podio aunque empaten y un tratamiento sutil para top 3 y top 10.
- Rachas dispone de acceso destacado, cuatro tipos explicados y comparación entre valor actual y mejor marca.
- Leyendas separa mejores cruces y bestias negras mediante un selector real.
- La hoja diaria del calendario bloquea el fondo y reserva espacio inferior seguro.
- La convocatoria pública es más compacta. La gestión del entrenador separa preparación, acta, detalles y logística con jerarquía y controles táctiles claros.
- La convocatoria sugerida ordena primero por continuidad respecto al partido anterior y después por goles, edad, asistencia y menos expulsiones.
- El acta usa marcadores grandes y controles de suma y resta. Guardar persiste el conjunto completo y validar guarda antes de cerrar.
- La edición de partido usa un estado de envío real; el guardado con logística activa se reprodujo y confirmó sin el corte de conexión original.
- Se eliminan el punto naranja de la navegación inferior y las cabeceras azules invasivas de sección.

## Validación

- TypeScript estricto: correcto.
- ESLint: correcto.
- Pruebas: 516 superadas y 22 omitidas por diseño.
- Build de producción Next.js: correcto.
- Auditoría de dependencias de producción: sin vulnerabilidades conocidas.
- Migraciones local/cloud: sincronizadas hasta `20260714101500_remove_shop_stock.sql`.
- Navegación autenticada móvil: Perfil, Tienda, carrito, galería, Equipos, Rankings, Rachas, Leyendas, Calendario, partido público, convocatoria, acta y edición de detalles comprobados.
- Guardado de logística del partido facilitado: confirmado con el mensaje `Cambios guardados` y sin errores de consola.

`supabase db lint` conserva un diagnóstico estático conocido sobre `pg_temp.phase8_team_map` dentro de `archive_season`: la tabla temporal se crea antes de usarla en la misma función y se elimina al confirmar la transacción. No representa una relación ausente en ejecución ni afecta a esta iteración.
