# Auditoría integral de seguridad, calidad y base de datos

Fecha de cierre: 2026-07-13

## Alcance

Revisión de autenticación y autorización, RLS y permisos SQL, Server Actions y rutas API, PWA y caché offline, datos personales, importaciones y subidas, dependencias, estructura React/Next.js, accesibilidad estática, pruebas, build de producción, esquema PostgreSQL y coherencia de los datos cloud.

El nivel de protección se ha ajustado al uso real: una PWA interna para 150-250 personas de un club, con datos de menores, contactos, tesorería y operativa deportiva, pero sin pagos dentro de la aplicación ni requisitos de infraestructura empresarial.

## Correcciones de aplicación

- Renovación segura de sesión Supabase SSR en el proxy.
- Cabeceras HTTP defensivas y política CSP base.
- Eliminación de la caché offline de páginas autenticadas.
- Permisos de columna para impedir que teléfono, email, notas, token de calendario y estados internos salgan por la Data API.
- Revocación de mutaciones directas sensibles y autorización reforzada en perfiles, tienda, rachas y administración.
- Solicitudes de acceso limitadas a jugador o padre/madre, rate limiting fail-closed, búsqueda anti-enumeración y credenciales únicas de un solo uso.
- Validación de UUID, rangos y escape de texto en el calendario ICS.
- Validación de tamaño, MIME y firma binaria en imágenes; límites de tamaño y filas en importaciones.
- Escape HTML en correos con contenido introducido por usuarios.
- Dependencias actualizadas y auditadas, sin vulnerabilidades conocidas en el árbol instalado.
- Eliminación de credenciales reutilizables del código, pruebas, scripts y documentación.
- Helpers de autorización consolidados y protegidos como código exclusivo de servidor.
- Corrección de estadísticas: un `no_show` no cuenta como partido jugado y las sesiones futuras no reducen asistencia ni rachas.
- Paginación completa de las lecturas usadas al recalcular rankings y eliminación del patrón que recargaba toda la temporada una vez por jugador.
- Tipos de Supabase regenerados desde el esquema cloud real; las tablas que figuraban erróneamente como vistas y los módulos que faltaban vuelven a estar tipados.

## Correcciones de base de datos

Se aplicaron y verificaron estas migraciones en el proyecto cloud:

- `20260712171403_audit_security_hardening.sql`
- `20260713150822_database_quality_hardening.sql`
- `20260713151438_season_data_consistency.sql`
- `20260713151840_function_privilege_hardening.sql`

Resultado:

- RLS activo en todas las tablas públicas.
- `app_settings` eliminado por estar vacío, obsoleto y ligado a la antigua contraseña compartida.
- Clave primaria añadida a `user_roles` y claves foráneas operativas indexadas.
- Políticas duplicadas o muertas eliminadas y políticas de escritura separadas por operación.
- Corregida la visibilidad de noticias de equipo, que comparaba por error el UUID de Auth con el UUID del perfil.
- Funciones de triggers de rivales y plazas de coche endurecidas para que sus actualizaciones derivadas funcionen bajo RLS sin quedar expuestas como RPC.
- Temporada actual reparada y protegida para que nunca pueda estar marcada simultáneamente como archivada.
- Temporada futura vacía eliminada.
- Usuario Auth huérfano sin perfil ni solicitud eliminado; el resto de usuarios Auth quedan vinculados.
- Contraseña histórica del administrador rotada. El acceso mediante Google permanece vinculado.
- La transición real de temporada se ejecutó dentro de una transacción completa y se revirtió; produjo correctamente históricos, equipos y plantillas sin dejar cambios.

## Datos demo consistentes

Los datos sintéticos anteriores se borraron con autorización expresa y se sustituyeron por un conjunto determinista y validado:

- 209 perfiles, 210 roles y 123 jugadores en plantilla.
- 8 equipos actuales, incluida Escuela con 3 niños.
- 1.008 sesiones y 13.783 registros de asistencia, con sesiones futuras y canceladas.
- 119 partidos: 105 jugados y 14 futuros; 1.547 convocatorias y 1.288 actas individuales.
- 369 snapshots de ranking y 500 rachas.
- 15 noticias y 11.949 notificaciones variadas.
- 12 productos, 4 imágenes de galería y 18 pedidos repartidos por todos los estados.
- 190 asignaciones de tesorería, 4 cierres y 503 líneas con pagos completos y pendientes.
- 14 ofertas de coche y 37 reservas, incluidas cancelaciones.
- 181 históricos de jugador y 56 enfrentamientos de dos temporadas anteriores.
- 104 vínculos familiares, 92 bloqueos de disponibilidad y 4 solicitudes de acceso en distintos estados.

El comando `node scripts/seed/index.mjs all` reconstruye todo desde cero. Finaliza con `validate.mjs`, que falla si falta cobertura mínima o detecta incoherencias de marcadores, plazas, tesorería, temporadas, roles o acceso admin.

## Verificación cloud

Las consultas de integridad devolvieron cero fallos en:

- usuarios Auth sin perfil o solicitud;
- jugadores en plantilla sin rol;
- actas para jugadores ausentes o sin convocatoria;
- suma de goles distinta al marcador;
- temporadas inconsistentes;
- partidos o históricos asociados a equipos de otra temporada;
- totales de cierres de tesorería;
- plazas de viaje desincronizadas;
- reservas activas en coches cancelados;
- índices inválidos;
- tablas públicas sin RLS.

Los asesores de Supabase quedaron sin errores. Rendimiento solo informa de índices todavía no utilizados, algo esperado inmediatamente después de recrear los datos. Seguridad conserva dos avisos aceptados:

- `archive_season` es `SECURITY DEFINER`, pero exige `is_admin()`, tiene `search_path` fijo, validaciones internas y una prueba transaccional completa.
- La protección de contraseñas filtradas no está habilitada en el plan actual de Auth.

## Verificación de código

- Prettier, ESLint y TypeScript strict: correctos.
- Vitest local y cloud: 30 archivos, 510 tests correctos y 2 omisiones intencionales.
- Playwright público: 10 tests correctos y 2 condicionados a credenciales.
- Playwright autenticado con cuenta admin temporal eliminada al terminar: 6 tests correctos, incluidos dashboard y calendario con datos.
- Build de producción con Next.js 16.2.10: correcto.
- Auditoría de dependencias: 0 vulnerabilidades conocidas.
- Escaneo de tokens, JWT y credenciales literales en aplicación, servidor, librerías, scripts, tests y documentación: 0 hallazgos.
- Validador del conjunto demo y consultas SQL independientes de integridad: correctos después de todas las pruebas.

## Riesgo residual aceptado

- No se añade WAF, SIEM ni gestión empresarial de secretos porque no es proporcional para este club.
- El rate limiting usa PostgreSQL y límites conservadores, adecuados para el volumen previsto.
- Los miembros autenticados pueden ver identidad pública y datos deportivos necesarios; contacto, tokens y notas permanecen privados.
- Las suscripciones push reales y el envío final mediante Resend necesitan pruebas manuales cloud con dispositivos y destinatarios reales; no se fabrican endpoints push falsos.
