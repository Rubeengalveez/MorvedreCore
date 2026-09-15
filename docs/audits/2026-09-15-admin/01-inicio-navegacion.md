# 01 · Inicio y navegación

[Documento general](00-panel-general.md). Evidencia C; observación V en el registro de verificación.

## Qué debe resolver

La persona entra para atender algo: aprobar un alta, preparar la semana, cerrar un pedido o revisar un cobro. Debe reconocer su temporada, alcance y siguiente acción sin recorrer once módulos.

## Actual y hallazgos

- `app/(app)/admin/page.tsx` define once tarjetas al mismo nivel. Incluye Importar aparte de Jugadores y omite Solicitudes de acceso (NAV-01).
- Los contadores de temporadas, equipos y partidos abarcan el histórico. Jugadores cuenta identidades en plantillas abiertas, sin acotar temporada; las consultas no distinguen error de cero (NAV-02).
- `app/(app)/admin/layout.tsx` comprueba acceso, pero no incorpora navegación propia. `components/admin/admin-page.tsx` aporta cabecera y ancho, sin enlaces de sección (NAV-03).
- No hay cola de pendientes en este inicio. No se debe inventar un número si falla su consulta.
- Saludo obtenido del perfil activo y permisos obtenidos de la cuenta pueden necesitar explicación cuando se está viendo a un familiar.

## Inventario y decisión

| Función | Estado | Plan |
| --- | --- | --- |
| Abrir módulos permitidos | Existe | Conservar y agrupar |
| Resumen estadístico | Existe, poco útil para operar | Sustituir por pendientes accionables; histórico en su área |
| Solicitudes | Ruta existente sin entrada | Añadir acceso y contador con estado de error |
| Acciones frecuentes | No existe bloque específico | Proponer 3–4 según rol |
| Volver/cambiar sección | Inconsistente | Navegación compartida y contexto conservado |
| Buscar cualquier objeto globalmente | No encontrado | No crear buscador universal sin necesidad; búsquedas dentro de cada sección |

## Diseño propuesto

Cabecera «Administración · Temporada actual». Debajo, pendientes ordenados por urgencia real y responsabilidad: solicitudes por revisar, partidos próximos sin convocatoria, pedidos recibidos sin entregar, cierre por revisar. Cada fila explica qué falta y conduce al objeto concreto. Los contadores solo se muestran si se han cargado correctamente.

En móvil, lista de trabajo y selector de área de 48 px; en escritorio, navegación lateral y lista central. Evitar grandes tarjetas decorativas para cada número. Mostrar explícitamente «Sin tareas pendientes» y «No hemos podido cargar tus pendientes» como estados diferentes.

## Flujos y aceptación

1. Sol entra y llega a Catálogo o Pedidos en dos pasos como máximo; no necesita pasar por la tienda pública.
2. Rubén abre una solicitud desde Inicio, vuelve y conserva posición.
3. Un entrenador identifica sus equipos actuales, sin totales de temporadas antiguas.
4. Un fallo de red muestra reintento y no un club vacío.
5. Teclado permite saltar al contenido, cambiar sección y reconocer el enlace actual; foco no tapado por cabeceras.
6. Enlaces directos respetan los mismos permisos que el menú.

## Dependencias y preguntas

Depende del mapa central de capacidades y de consultas de pendientes verificables. Decidir si se recuerda la última sección o se abre siempre Inicio; propuesta: Inicio con accesos recientes, sin ocultar el resumen de trabajo.
