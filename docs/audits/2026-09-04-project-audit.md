# Auditoría integral de Morvedre Core

**Fecha:** 4 de septiembre de 2026  
**Base validada:** commit `864076f` (`feat(phase-9): complete polish, accessibility, offline and backup support`)  
**Alcance:** funcionamiento, seguridad, base de datos, rendimiento, accesibilidad, usabilidad, PWA, arquitectura, cohesión visual, documentación y preparación para lanzamiento.

> Después de terminar las comprobaciones aparecieron cambios sin confirmar relativos a permisos de delegados y partidos. Se han preservado sin modificarlos y no forman parte de los resultados de build, tests y navegación descritos aquí.

## Veredicto ejecutivo

Morvedre Core ya no es un prototipo. El núcleo funcional es amplio, coherente y demostrable: compila para producción, 599 pruebas unitarias pasan, los principales flujos autenticados funcionan para varios roles y la base de datos remota está sana, poblada y con RLS. La identidad visual también es reconocible y consistente en la mayoría de pantallas.

Todavía no la daría por terminada para operar una temporada real sin supervisión. Antes hay que cerrar un sprint corto de seguridad y fiabilidad. Los cuatro asuntos más urgentes son:

1. El service worker incluye la caché predeterminada de Serwist y puede almacenar HTML autenticado, respuestas RSC y peticiones GET de `/api/`. Esto contradice la política declarada de no guardar datos privados sin conexión.
2. `next@16.2.10` y varias dependencias transitivas tienen avisos de seguridad conocidos. La auditoría actual devuelve 10 avisos altos y 6 moderados, ninguno crítico.
3. La temporada marcada como actual es `2025/2026` y terminó el 31 de julio de 2026. Hoy no existe una temporada vigente para operar el curso nuevo.
4. El aviso de instalación PWA contiene un hook condicional que puede romper el componente justo cuando el navegador decide mostrarlo.

Con esos bloqueos resueltos, el proyecto entra en una fase de estabilización y lanzamiento, no de reconstrucción.

## Evidencias comprobadas

| Área | Resultado |
|---|---|
| Build de producción | Correcto con Next.js 16.2.10 |
| TypeScript estricto | Correcto |
| Pruebas unitarias | 599 correctas, 22 omitidas, 61 archivos |
| ESLint | Falla: 3 errores y 2 avisos en código nuevo de Fase 9 |
| E2E autenticado | 17 correctas, 1 omitida, 1 timeout de compilación en desarrollo; la misma prueba pasa aislada y en producción |
| Navegación de producción | 24/24 rutas principales con HTTP 200, sin errores de consola |
| Enlaces internos visibles | 125 destinos únicos; no se encontraron enlaces vacíos, `javascript:` ni rutas principales muertas |
| Roles probados | Administración, tesorería, tienda, entrenador, tutor familiar y jugador/hijo |
| Base de datos | `ACTIVE_HEALTHY`, PostgreSQL 17.6, 32 MB |
| Migraciones | 72 locales y 72 remotas, alineadas |
| RLS | 0 tablas públicas sin RLS |
| Integridad básica | 0 usuarios Auth sin perfil; 0 jugadores activos sin rol; 1 temporada marcada como actual |
| Datos | 210 perfiles, 24 equipos, 1.017 entrenamientos, 125 partidos, 12 productos, 503 líneas de tesorería |
| Actividad de la semana | 6 entrenamientos y 6 partidos entre el 31 de agosto y el 6 de septiembre |
| Cron | Archivado de noticias y recordatorios mensuales activos; ejecuciones observadas correctamente |

Los tiempos locales de `DOMContentLoaded` en producción para las páginas más pesadas estuvieron aproximadamente entre 1,16 y 1,47 segundos. Son aceptables en la máquina de desarrollo, pero no sustituyen una medición Web Vitals sobre dispositivos y red reales.

## Hallazgos prioritarios

### P0 — Resolver antes de uso real

#### 1. La PWA puede cachear información autenticada y privada

En [`app/sw.ts`](../../app/sw.ts), `runtimeCaching` añade `...defaultCache`. La configuración instalada de Serwist incluye estrategias para HTML, RSC, precargas RSC y GET de `/api/`, con retenciones de hasta 24 horas. Por tanto, la implementación no se limita a logo, iconos y recursos públicos.

Esto es especialmente sensible porque la aplicación trata datos de menores y puede usarse en móviles compartidos. También contradice el texto de [`app/offline/page.tsx`](../../app/offline/page.tsx), que afirma que no se guardan datos privados ni convocatorias sin conexión, y la decisión documentada de usar únicamente una página de fallback.

**Acción:** sustituir `defaultCache` por una lista explícita de recursos públicos y estáticos; excluir HTML autenticado, RSC y API; versionar las cachés y eliminar las anteriores durante activación; verificar cerrar sesión, cambiar de perfil familiar y volver a abrir sin conexión en Android, iOS y escritorio.

#### 2. Dependencias con avisos de seguridad actuales

`pnpm audit --prod` devuelve 10 avisos altos y 6 moderados. El principal grupo afecta a `next@16.2.10`; también aparecen dependencias transitivas como `sharp`, `postcss`, `nanoid` y `browserslist`. La [publicación oficial de seguridad de Next.js](https://nextjs.org/blog) recomienda actualizar a `16.3.3` (Active LTS) o `15.5.24` (Maintenance LTS).

No todos los avisos tienen por qué ser explotables en esta aplicación, pero Next participa en autenticación, Server Actions, middleware y renderizado. Es una actualización prioritaria.

**Acción:** actualizar Next y `eslint-config-next` a una versión estable corregida y soportada, actualizar las transitivas cuando corresponda, y repetir build, typecheck, lint, unitarias, E2E, login por roles y pruebas PWA. No usar correcciones automáticas con cambios mayores sin revisar.

#### 3. No hay una temporada vigente

La única temporada actual es `2025/2026`, con fecha final `2026-07-31`. La base mantiene consistencia formal, pero el estado de negocio está caducado a fecha de esta auditoría.

**Acción:** decidir y preparar el cambio a `2026/2027`, revisar requisitos de archivo, crear los equipos y datos reales necesarios y hacer una copia restaurable antes de ejecutar la transición. No conviene automatizar esta decisión sin validación del club.

#### 4. El aviso de instalación puede romperse por orden de hooks

En [`components/pwa/pwa-install-prompt.tsx`](../../components/pwa/pwa-install-prompt.tsx), `useState` para el modal de iOS se ejecuta después de retornos condicionales. En el primer render puede no ejecutarse y en otro render sí, infringiendo las reglas de hooks y provocando “Rendered more hooks than during the previous render”.

**Acción:** declarar todos los hooks antes de cualquier retorno y añadir pruebas para Android/Chromium, iOS, aplicación ya instalada, aviso descartado y aparición tardía de `beforeinstallprompt`.

### P1 — Robustez y operación

#### 5. ESLint no pasa en el commit auditado

Errores encontrados:

- [`app/offline/page.tsx`](../../app/offline/page.tsx): actualización síncrona de estado dentro de un efecto.
- [`components/pwa/pwa-install-prompt.tsx`](../../components/pwa/pwa-install-prompt.tsx): hook condicional.
- [`components/ui/connectivity-banner.tsx`](../../components/ui/connectivity-banner.tsx): actualización síncrona de estado dentro de un efecto.
- Dos imports sin usar en la prueba de conectividad.

El build y TypeScript pasan, por lo que esto demuestra que el pipeline actual permite integrar código que no cumple el control de calidad completo.

**Acción:** corregir los cinco casos y exigir `lint + typecheck + test:run + build` en CI antes de integrar.

#### 6. Aprobación de accesos con compensación incompleta

[`server/actions/auth.ts`](../../server/actions/auth.ts) concentra login, recuperación, solicitudes y aprobación en un archivo grande. En la aprobación se puede cambiar la contraseña de un usuario Auth ya existente antes de terminar los cambios de perfil, rol, familia y estado de solicitud. Si un paso posterior falla, el usuario existente no recupera su contraseña anterior y las escrituras de base de datos no se revierten completamente.

**Acción:** modelar la activación como una operación idempotente, con estados explícitos, compensación completa y adaptadores de Auth/correo comprobables. Añadir pruebas de fallo tras cada efecto externo.

#### 7. Sustitución de horarios no atómica

En [`server/actions/admin/training.ts`](../../server/actions/admin/training.ts), la creación de un horario puede borrar sesiones anteriores y fallar al insertar las nuevas. La limpieza elimina los bloques nuevos, pero no restaura las sesiones antiguas ya borradas.

**Acción:** trasladar la operación a una función transaccional de Postgres o RPC con validación previa y rollback real. Probar fallos de inserción, duplicados y protección de sesiones con asistencia.

#### 8. La página de entrenamientos carga toda la asistencia

La carga administrativa consulta las 13.708 filas de `training_attendance` y filtra después en memoria, aunque la pantalla solo necesita las sesiones visibles de las próximas semanas.

**Acción:** obtener primero los IDs visibles y limitar la consulta con `.in("session_id", visibleSessionIds)`. Medir tiempo, filas transferidas y memoria antes y después.

#### 9. Tesorería no escala bien para una persona poco tecnológica

La vista móvil completa de tesorería alcanzó aproximadamente 39.760 píxeles de alto porque representa una tarjeta editable completa por jugador. Aunque existe búsqueda, la carga inicial es abrumadora, el DOM es muy grande y es fácil perder el contexto.

**Acción:** mostrar filas/resúmenes compactos, filtros y paginación; abrir la edición en hoja o diálogo; fijar totales y acciones principales; guardar y confirmar por bloques. Esta es la mejora de usabilidad con mayor impacto visible.

#### 10. La monitorización de errores no es una integración real

[`lib/monitoring/error-logger.ts`](../../lib/monitoring/error-logger.ts) registra JSON en consola y solo llama a `window.Sentry` si algún elemento externo lo ha creado. No existe SDK ni inicialización de Sentry en las dependencias revisadas.

**Acción:** integrar una solución real de captura y alertas, o corregir la documentación para llamarlo únicamente logging estructurado. Definir responsables y alertas para errores de login, acciones administrativas, correos, push y backups.

#### 11. La copia existe, pero falta demostrar recuperación y protección

[`scripts/backup-db.mjs`](../../scripts/backup-db.mjs) exporta 30 tablas completas, incluidas tablas con PII, a JSON sin cifrar; el workflow conserva ese JSON como artefacto de GitHub durante 30 días y trata de subirlo a Supabase Storage. Los errores de una tabla o de Storage solo generan un aviso y el proceso puede terminar correctamente.

No se pudo verificar desde este entorno el último workflow exitoso, la existencia y privacidad del bucket, los secretos de GitHub ni una restauración real.

**Acción:** fallar el job si una tabla o la subida obligatoria falla; cifrar antes de subir o usar un destino con cifrado y acceso mínimo; comprobar retención y auditoría de accesos; registrar checksum; crear y ensayar un procedimiento de restauración. Una copia no probada no es todavía un sistema de recuperación.

### P2 — Accesibilidad, calidad y mantenibilidad

#### 12. Controles sin nombre accesible o con objetivo pequeño

Casos confirmados:

- Checkbox de selección en solicitudes de acceso sin etiqueta asociada y de 20×20 px en [`access-requests-manager.tsx`](../../app/(app)/admin/access-requests/_components/access-requests-manager.tsx).
- Buscador de staff sin `label` ni `aria-label` en [`staff-client.tsx`](../../app/(app)/admin/staff/_components/staff-client.tsx).
- URL de sincronización de calendario sin nombre accesible y con 36 px de alto en [`calendar-sync-card.tsx`](../../components/profile/calendar-sync-card.tsx).
- Botón de pagado de 36 px en [`treasury-forms.tsx`](../../app/(app)/admin/treasury/_components/treasury-forms.tsx).
- Selector de vista del calendario de 40 px en [`calendar-view.tsx`](../../components/calendar/calendar-view.tsx).

**Acción:** nombre accesible explícito, estado anunciado y objetivo táctil mínimo de 48×48 px según la convención del proyecto. Probar teclado, lector de pantalla y zoom al 200 %.

#### 13. Mensaje offline engañoso

El banner indica “Modo solo lectura”, pero no existe una garantía coherente de que todas las pantallas tengan datos de solo lectura disponibles. Con la política segura propuesta, algunas vistas simplemente no estarán disponibles.

**Acción:** usar un texto preciso, por ejemplo “Sin conexión. Algunas funciones no están disponibles”, y reservar “solo lectura” para pantallas realmente diseñadas y probadas para ello.

#### 14. Registro de UUID vacío en producción

Los logs de Postgres de las últimas 24 horas contienen varios errores `invalid input syntax for type uuid: ""`. No se pudo asociar con certeza a una acción concreta.

**Acción:** validar con Zod todos los IDs escalares antes de consultar, evitar convertir selección vacía en string y añadir contexto estructurado a las acciones para localizar el origen. Crear una alerta por repetición.

#### 15. Índice ausente en una clave foránea

El asesor de rendimiento señala que `training_attendance_audit.changed_by` no tiene un índice que cubra su clave foránea.

**Acción:** medir la consulta y añadir el índice si se usa para auditoría, borrado o joins. Los índices marcados como “no usados” no deben eliminarse automáticamente: las estadísticas de una base de demo pueden no representar la carga real.

#### 16. Código de Inicio duplicado y muerto

[`server/queries/dashboard.ts`](../../server/queries/dashboard.ts) conserva `getDashboardData()`, una implementación grande sin consumidores, mientras [`app/(app)/dashboard/page.tsx`](../../app/(app)/dashboard/page.tsx) compone por otra ruta audiencia, familia, agenda, rachas, rankings y noticias.

**Acción:** confirmar con cobertura, eliminar el camino muerto y ofrecer a la pantalla un único modelo de lectura listo para representar.

#### 17. Permisos administrativos dispersos

La decisión efectiva de acceso se interpreta en helpers, layouts, portada de administración, barra superior, perfil y módulos de partidos/entrenamientos. Un cambio reciente de alcance de entrenador/delegado toca numerosos archivos, una señal de baja localidad.

**Acción:** crear un módulo profundo de capacidades y alcance administrativo consumido por guardas, navegación y consultas. Debe seguir existiendo validación en servidor y RLS; la unificación no debe convertir el ocultado visual en autorización.

#### 18. Cohesión visual buena, pero con recetas repetidas

Los tokens, tipografías y elementos de identidad del club forman una base sólida. Aun así:

- `border-ink-200 bg-paper-card` aparece en 59 archivos.
- `rounded-2xl border` aparece en 58 archivos.
- `shadow-elev-1` aparece en 58 archivos.
- Hay 69 botones HTML nativos repartidos por 40 archivos además del componente común.
- `AppPageHero` es un alias superficial de `PageHeader` y no oculta complejidad.
- Varias cabeceras repiten manualmente la misma familia de gradientes.
- `transition-all` aparece en el banner de conectividad.

**Acción:** no crear una tarjeta universal. Consolidar pocos patrones semánticos estables: marco de página, panel de sección, fila accionable y estados interactivos. Convertir gradientes de marca en tokens nombrados y mantener como excepciones los componentes con identidad propia —marcador, dorsal, perfil y balón—.

#### 19. La tienda es la pantalla menos “premium”

La rejilla y navegación son correctas, pero la mayoría de productos usan el mismo pictograma genérico mientras solo algunos tienen fotografía real. En una página larga, esa mezcla parece contenido provisional.

**Acción:** completar imágenes con relación de aspecto, fondo y tratamiento coherentes; definir estados sin foto, agotado y próximamente; revisar orden y filtros. Esto mejora percepción sin cambiar el flujo.

#### 20. Documentación contradictoria

El roadmap actual marca Fase 9 como completa, pero documentos anteriores mantienen casillas pendientes de funciones ya construidas. También sigue apareciendo “importación desde Cluber”, aunque la decisión de producto afirma que el club nunca usó Cluber.

**Acción:** crear una única página de estado operativo con fecha, versión y evidencia; marcar documentos históricos como tales; retirar el requisito de Cluber o convertirlo en importación genérica desde Excel; evitar que resúmenes antiguos se interpreten como estado actual.

## Seguridad de Supabase

La base remota está activa, migrada y bien protegida en su estructura principal. Todas las tablas públicas tienen RLS y las migraciones locales/remotas coinciden.

El asesor de Supabase mantiene dos advertencias conocidas:

- `archive_season` es una función `SECURITY DEFINER` ejecutable por usuarios autenticados. La implementación comprobada valida administración internamente, fija `search_path` y controla privilegios. Debe conservar pruebas de regresión y revisar permisos en cada cambio.
- La protección contra contraseñas filtradas está deshabilitada por limitación/configuración del plan. Mientras no esté disponible, exigir longitud razonable, evitar credenciales compartidas y forzar cambio inicial.

La exportación de seguridad detectó una supuesta contraseña en una prueba de redacción. Es un valor falso intencional usado para verificar que el logger oculta secretos; no se encontró una credencial real en el código de aplicación revisado.

También conviene preparar la [nueva política de exposición de Data API de Supabase](https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically), que se aplicará a proyectos existentes el 30 de octubre de 2026. Las migraciones actuales ya usan `GRANT` y RLS explícitos; debe quedar como control obligatorio de revisión para toda tabla nueva.

## Usabilidad para cualquier nivel tecnológico

### Lo que ya funciona bien

- Navegación inferior estable y reconocible.
- Lenguaje directo en castellano.
- Jerarquía visual clara y fuerte identidad del club.
- Enlaces de salto al contenido, foco visible y soporte global de movimiento reducido.
- No se encontraron `div` o `span` usados como botones ni enlaces internos vacíos.
- El zoom no está bloqueado.
- Los distintos roles acceden a contenido diferente sin romper los flujos principales.

### Lo que falta validar con personas reales

Las pruebas automáticas no responden si Eva, Mónica, Sol, un entrenador o una familia pueden completar una tarea sin ayuda. Antes del lanzamiento conviene hacer cinco sesiones cortas, observando sin explicar:

1. Familia: entrar, cambiar de hijo, ver convocatoria y responder disponibilidad.
2. Entrenador: pasar asistencia y preparar una convocatoria.
3. Tesorería: buscar una persona, marcar pagos y obtener un cierre.
4. Tienda: localizar un pedido y cambiar su estado.
5. Administración: aprobar acceso y corregir un dato de jugador.

Registrar tiempo, dudas, retrocesos, errores y palabras que no entienden. El objetivo inicial debería ser completar cada tarea crítica sin asistencia y poder deshacer o corregir errores sin miedo.

## Qué falta realmente para terminar

La funcionalidad principal está construida. Lo pendiente real se divide en tres capas:

### Sprint 0 — Seguridad y estabilización

- Restringir y limpiar cachés del service worker.
- Corregir el hook de instalación y los errores de lint.
- Actualizar dependencias vulnerables y repetir toda la validación.
- Preparar la temporada `2026/2027` sin ejecutarla hasta aprobar los datos.
- Corregir/triangular los UUID vacíos.
- Verificar backup, cifrado, permisos y restauración.

### Sprint 1 — Robustez, rendimiento y accesibilidad

- Hacer atómicos aprobación de accesos y sustitución de horarios.
- Acotar la consulta de asistencia.
- Rediseñar tesorería con revelado progresivo.
- Corregir nombres accesibles y objetivos táctiles.
- Unificar capacidades administrativas y limpiar el modelo de Inicio.
- Implantar monitorización de errores real.

### Sprint 2 — Lanzamiento del club

- Importar/validar perfiles y datos reales mediante Excel.
- Asignar roles y permisos reales con principio de mínimo privilegio.
- Probar correo y push en dispositivos reales.
- Ejecutar sesiones de usabilidad por rol.
- Crear guías de una página para familias, entrenadores, tesorería, tienda y administración.
- Ensayar la apertura de temporada, cierre, copia y restauración.
- Completar imágenes y microacabados de tienda.

## Orden recomendado

1. Cerrar Sprint 0 y bloquear integraciones si el pipeline no está verde.
2. Resolver atomicidad y la pantalla de tesorería.
3. Hacer las cinco pruebas de usabilidad con miembros del club.
4. Preparar y revisar los datos `2026/2027`.
5. Realizar un ensayo general con correo, push, permisos y recuperación.

## Límites de esta auditoría

- No se enviaron correos ni notificaciones push reales para evitar efectos externos.
- No se ejecutó una prueba de penetración destructiva.
- No se comprobó el histórico de GitHub Actions ni los secretos/bucket de backup desde este entorno.
- Los tiempos son locales, no datos de usuarios reales ni Core Web Vitals de producción.
- La validación automática corresponde al commit indicado; los cambios sin confirmar posteriores requieren su propio ciclo completo.

## Skills instaladas en el proyecto

Se instaló `find-skills` desde `vercel-labs/skills` y, tras buscar herramientas específicas, quedaron disponibles localmente:

- `improve-codebase-architecture`
- `diagnosing-bugs`
- `webapp-testing`
- `code-review`
- `codebase-design`

La combinación se utilizó para estructurar esta auditoría junto con las skills ya presentes de seguridad, Supabase/Postgres, dependencias, accesibilidad web, rendimiento React/Next y diseño UI/UX. Las skills están en `.agents/skills` y el registro en `skills-lock.json`; la carpeta `.agents` está ignorada por Git en la configuración actual.
