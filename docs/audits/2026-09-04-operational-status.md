# Estado operativo de Morvedre Core

Actualizado: 6 de septiembre de 2026. Referencia: [auditoría del 4 de septiembre](2026-09-04-project-audit.md). Este documento sustituye las afirmaciones anteriores de cierre al 100 %; el lanzamiento aún tiene verificaciones pendientes.

## Correcciones implementadas

- PWA: navegación autenticada por red, fallback sin conexión, limpieza de cachés antiguas y corrección del orden de hooks del instalador.
- Dependencias: Next y ESLint actualizados a 16.3.3; la última auditoría de producción no detectó vulnerabilidades conocidas.
- Accesos: la contraseña de una cuenta existente se cambia después de completar las escrituras del perfil y sus relaciones; las altas nuevas tienen compensación si falla la operación. Esto no equivale a una transacción distribuida entre Auth y Postgres.
- Entrenamientos: sustitución transaccional de horarios y consulta de asistencia acotada a las sesiones visibles.
- Tesorería: listado progresivo, controles táctiles ampliados y etiquetas visibles en formularios.
- Fechas de cierre: mes calculado en Europe/Madrid sin desplazar sus límites al día anterior; regresiones para cambio de año, verano y año bisiesto.
- Permisos: gestión de partidos por delegados y política única de edición de actas que conserva el bloqueo de estadísticas validadas.
- Diseño: componentes compartidos Card, CardActionRow y StatusBadge aplicados en las principales vistas; conservación de hijos directos y acento de categoría probada con regresiones.
- Accesibilidad: nombres de controles, objetivos táctiles de los casos encontrados, encabezados de detalle de partido y avisos de estado.
- Notificaciones: destinos push restringidos al mismo origen; tratamiento de fallos al desactivar y al enviar una prueba.
- Mantenibilidad: eliminación del modelo de Inicio sin consumidores y del alias AppPageHero; logger descrito como registro estructurado, sin atribuirle alertas externas inexistentes.
- Operación: preparación de temporada con simulación y activación explícita, importación genérica de Excel y cinco guías por rol.

## Copias: corrección adicional del 5 de septiembre

La versión anterior leía una única página y exportaba solo 30 tablas. El esquema remoto contiene 41 tablas públicas. Se ha sustituido por un manifiesto de esas 41 tablas y lectura paginada ordenada por clave primaria, con recuento exacto y detección de claves duplicadas y páginas incompletas.

El formato v1.2 exige manifiesto completo, recuentos por tabla y SHA-256. El verificador rechaza las copias antiguas como evidencia de cobertura actual; no las borra. La subida vuelve a descargar y validar el JSON antes de aplicar retención de 90 días. El bucket remoto está configurado como privado y el workflow no adjunta datos personales como artefacto de GitHub.

Es una exportación de datos de aplicación: no incluye Auth, archivos de Storage, esquemas privados ni configuración del proyecto. Las consultas paginadas no son una instantánea transaccional. Por tanto, sigue pendiente demostrar recuperación completa. Véase el [procedimiento de recuperación](../guides/recuperacion-datos.md).

## Evidencia y límites

Última suite completa tras las correcciones de sesión: 79 archivos, 675 pruebas correctas y 22 omitidas por sus condiciones externas. El build de producción y el ensayo real de logout con sesiones aisladas pasan. La exportación y restauración integral del respaldo siguen sin ejecutarse; no están cubiertas por estas pruebas.

| Comprobación           | Última evidencia disponible                                                                                                                        |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| TypeScript y ESLint    | Pasaron en la revisión del 4 de septiembre; repetir sobre cualquier cambio posterior                                                               |
| Vitest                 | 72 suites, 624 pruebas correctas, 22 omitidas en la revisión del 4 de septiembre                                                                   |
| Producción             | Build correcto después de los últimos ajustes táctiles del 4 de septiembre                                                                         |
| Recorrido de pantallas | 45 rutas en 390 × 844 y 1440 × 900: 90 combinaciones sin errores HTTP, consola ni desbordamiento horizontal                                        |
| Revisión táctil final  | 4 combinaciones focalizadas de tienda y tesorería, sin problemas detectados                                                                        |
| Exportador v1.2        | 7 pruebas locales con datos sintéticos correctas: más de 1.000 filas, límite de servidor reducido, claves compuestas, truncamiento y corrupción    |
| Supabase               | Cuatro migraciones posteriores a la auditoría aplicadas; bucket privado; sin políticas permisivas duplicadas en la última revisión                 |
| Avisos de Supabase     | Dos funciones SECURITY DEFINER con comprobación interna de permisos; protección de contraseñas filtradas desactivada; índices sin uso informativos |

El recorrido automático utiliza una cuenta de administración de demo y no acredita todos los roles, tareas de escritura, teclado, contraste ni conformidad completa WCAG. Los tiempos locales no son mediciones de rendimiento de móviles reales. El chequeo global de formato mantiene archivos previos pendientes; se han formateado los archivos modificados en este trabajo.

Para repetir el recorrido: iniciar la aplicación de producción y ejecutar `pnpm audit:ui`. Requiere la cuenta de demo y credenciales de servidor en el entorno. `--focus` limita la revisión a tienda y tesorería; `--screenshots` guarda capturas locales. No publica capturas ni envía formularios.

## Pendientes para cerrar la auditoría

Última suite completa del 6 de septiembre: 83 archivos, 706 pruebas correctas, 22 omitidas y ningún fallo. Las omisiones no se cuentan como verificaciones superadas.

Seguimiento del 6 de septiembre: la descarga de Excel usa `manage_treasury`, igual que la sección, en lugar de exigir administrador total. Valida el UUID, no devuelve adjuntos si falla la lectura/generación y mantiene `private, no-store` en éxitos y errores. El botón muestra progreso y errores accesibles, permite reintentar, rechaza HTML de una sesión caducada y cancela la petición al salir. Once pruebas específicas cubren la ruta y el botón. El ensayo `tests/database/treasury-export-permission.sql` pasó en cloud con datos sintéticos y rollback: un gestor modular sin rol admin ve el cierre y las dos líneas con nombres; al revocar el permiso, el mismo usuario como familiar no ve el cierre y solo ve la línea de su hijo. No se descargaron datos reales ni se cambiaron políticas. TypeScript y ESLint de estos cambios pasan. Esto no desbloquea la migración deportiva pendiente ni acredita todavía el build o un recorrido de navegador de la nueva interfaz.

Actualización de permisos: `lib/domain/permissions.ts` centraliza capacidades, acceso a módulos y alcance por equipo. TopBar, panel, layouts y consultas deportivas comparten esta lógica; la deduplicación de lecturas es por renderizado, no una caché global de autorizaciones. Las acciones vuelven a consultar permisos y verifican ambos equipos al trasladar un recurso. Delegados no reciben formularios de creación o programación. Suite completa posterior: 81 archivos, 695 pruebas correctas y 22 omitidas; TypeScript y ESLint de los cambios pasan.

**Bloqueo de publicación de esta corrección:** `20260905194256_align_sports_capabilities.sql` NO está aplicada en cloud. La revisión automática rechazó modificar allí las políticas y triggers antes de validación segura; se ha solicitado autorización. Las tres cuentas con rol global heredado tienen asignaciones de entrenador por equipo. El ensayo SQL en cloud no pasó porque las funciones nuevas aún no existen; sus fixtures quedaron dentro de una transacción fallida, sin cambios persistentes. `tests/database/sports-capabilities.sql` exige probar RLS real, dorsales, resultados, bloqueo de programación del delegado, permisos modulares y RSVP. No confundir las pruebas unitarias verdes con esa verificación pendiente.

La alternativa local también está pendiente: Docker Desktop 4.46.0 falló al iniciar su servicio de inferencia (`dockerInference: The file cannot be accessed by the system`). No se ha restablecido Docker ni borrado su estado. Una consulta posterior confirmó cero perfiles temporales del ensayo SQL en cloud. No se ha reconstruido ni reiniciado el servidor de producción con estos últimos cambios; el build anterior no acredita esta corrección.

Seguimiento previo de permisos del 5 de septiembre: se corrigió el falso rechazo de varias filas de cargos técnicos de un perfil/equipo provocado por `maybeSingle`. Se añadieron comprobaciones de errores de Auth y consultas de permisos. Las 16 pruebas de esa pasada fueron correctas, pero se detectó la incoherencia de navegación, guards y SQL que motiva la unificación posterior descrita arriba.

Seguimiento de cierre de sesión: se cancela la suscripción del navegador y se cierran sus notificaciones visibles. El servidor deshabilita únicamente el endpoint de la cuenta autenticada; si ni el navegador ni el servidor confirman la retirada, muestra un error y permite reintentar. La sesión se cierra con alcance local y se comprueba el error de Auth. Once pruebas unitarias pasan. El ensayo `pnpm audit:logout` pasó contra producción con dos sesiones temporales de demo: redirección al login, ruta privada inaccesible, renovación rechazada para la sesión cerrada y permitida para la otra, sin errores de página. Las sesiones de prueba se cerraron al terminar. Queda pendiente verificar la entrega y retirada de push nativo en teléfonos físicos.

Seguimiento de notificaciones: el estado del navegador se contrasta con la suscripción habilitada de la cuenta propietaria, usando el cliente autenticado y RLS. Se muestra un estado de comprobación, se renueva una suscripción inactiva al pulsar Activar y se intenta cancelar la recién creada si falla su guardado. Quince pruebas específicas comprueban cuenta propietaria frente a perfil familiar, suscripción ausente/desactivada, fallos de lectura, renovación y compensación. ESLint, TypeScript y build de producción pasan. Esto no acredita aún la entrega en un teléfono real.

Seguimiento del 5 de septiembre: las seis lecturas que alimentan un cierre se paginan con recuento exacto y la plantilla se limita a la temporada seleccionada. El detalle y la exportación leen todas las líneas; un error intermedio interrumpe la operación en lugar de devolver un archivo parcial. Los pedidos se asignan al mes en Europe/Madrid, con límite final exclusivo y pruebas de los días de cambio horario. Hay 30 pruebas focalizadas correctas y las relaciones PostgREST se han verificado en cloud mediante consultas de una fila, sin generar cierres ni exportar datos. ESLint, TypeScript, formato de los archivos modificados y build pasan. El recorrido de producción focalizado vuelve a pasar sus 4 combinaciones sin problemas.

Hallazgo adicional del 5 de septiembre corregido: `buildTreasuryPeriodClosure` ahora comprueba todas las lecturas antes de generar y guarda mediante `atomic_save_treasury_closure`. El reemplazo es transaccional, bloquea las filas implicadas y rechaza regenerar cierres enviados, archivados o con cobros. El botón de pago muestra los errores y el servidor detecta líneas desaparecidas. La migración está aplicada y `tests/database/treasury-closure.sql` pasó en Postgres con fixtures revertidos: creación, rollback de inserción fallida, regeneración de borrador, protección de cobros, cierre enviado y permisos exclusivos de servidor.

1. Ejecutar una nueva exportación autorizada, verificar la copia remota y ensayar recuperación en un entorno aislado, incluyendo Auth y archivos. No hay evidencia de un ciclo completo de restauración.
2. Confirmar un workflow real de respaldo exitoso, sus secretos y la supervisión de fallos. Tener el YAML en el repositorio no acredita que el job se ejecute.
3. Verificar entrega, apertura y desactivación de push en dispositivos físicos, y entrega del cierre por correo.
4. Completar las cinco sesiones de usabilidad por rol y comprobar teclado, zoom y lectores de pantalla en los flujos críticos. Las guías ayudan, pero no sustituyen estas pruebas.
5. Revisar datos y permisos reales con el club y activar la temporada cuando corresponda.
6. Mantener la protección de contraseñas filtradas como limitación del plan gratuito; no se ha contratado un plan de pago.
7. Revisar el resto del alcance de la auditoría original contra evidencias específicas antes de declarar el cierre. No se considera automáticamente resuelto por un build o una suite verde.

La exportación real y la retención remota siguen pendientes de autorización: la revisión automática de permisos rechazó esa ejecución porque copia datos personales y puede eliminar respaldos antiguos. Las pruebas sintéticas no acceden a datos del club.

Verificación adicional del 5 de septiembre: suite completa de 74 archivos, 641 pruebas correctas y 22 omitidas; más 7 pruebas del exportador y el ensayo SQL transaccional. ESLint y build de producción con TypeScript pasan después del guardado atómico. El recorrido final focalizado de tienda y tesorería termina con 4 combinaciones y 0 problemas. Las guías de administración, familias, entrenadores y tesorería se han ajustado a rutas, etiquetas y guardado observados en el código. Los nombres de las cinco migraciones recientes coinciden ahora con las versiones registradas en cloud, sin volver a ejecutar su SQL.

## 7 de septiembre: acta en directo

Implementación e integración del acta completa con registro sencillo disponible antes de abrirla. El rediseño mantiene marcador, tablas por gorro y botones visibles; terminar cuarto tiene confirmación explícita. La guía está en `docs/guides/acta-en-directo.md`.

Evidencias de esta revisión:

- Suite completa: 85 archivos, 736 pruebas correctas y 22 omitidas. Siete pruebas del exportador de respaldo correctas. La tabla `live_match_sheets` forma parte del manifiesto de 42 tablas.
- Pruebas de dominio y sincronización: penalti como expulsión, límites, porteros, correcciones, persistencia fallida, reintento idempotente y jugada nueva mientras se confirma un envío anterior.
- Build de producción, comprobación TypeScript y ESLint de los cambios correctos.
- Ensayo SQL con fixtures sintéticos y rollback: autorización, RLS, escritura exclusiva por servidor, revisiones, reintentos, protección de estadísticas y resultado, cierre y rechazo de cambios posteriores. Las dos migraciones del acta están aplicadas; esto no aplica ni sustituye la migración deportiva pendiente documentada arriba.
- `scripts/test-live-acta.mjs` recorre seis tamaños: 320×568, 360×640, 390×844, 430×932, 768×1024 y 844×390. Comprueba controles de al menos 48 px, anotación, tiempos, tarjetas, corrección, seis cuartos, resultado y PDF. Usa únicamente fixtures sintéticos que elimina al terminar.
- Ensayo sobre build de producción con service worker: recarga completa sin conexión, conservación de una jugada y sincronización posterior sin duplicación. Se corrige la limpieza de caché que borraba el precache propio al activar el worker.
- PDF de tres páginas generado y renderizado para revisión visual. El botón prepara el archivo antes de abrir el menú nativo del móvil y evita compartir una versión anterior.

Las capturas y resultados locales están en `tmp/acta-audit/`. La validación en navegador emulado no sustituye una sesión con delegados y teléfonos físicos en la piscina. No se ha desplegado la web ni se declaran cerrados los pendientes operativos anteriores.

## 8 de septiembre: entrada del delegado y gorros únicos

Se reproduce el bloqueo de una convocatoria existente con gorros repetidos. Ahora muestra su lista para corregirlos, mantiene la vuelta al mismo partido y separa carga, error y preparación. El registro sencillo tiene ruta propia fuera de administración. La entrada al acta en directo solo se muestra a delegados del equipo y esa restricción se comprueba también en Server Actions y RLS, incluso para actas cerradas.

Las migraciones `20260908120517_live_match_delegate_entry.sql` y `20260908121825_prevent_duplicate_match_caps.sql` están aplicadas tras ensayos con fixtures y rollback. Las pruebas SQL verifican restricciones de rol, protección de totales cuando RLS oculta el acta, preparación de gorros, rechazo de duplicados al insertar/editar/reactivar y cambio atómico de números. Los duplicados históricos no se modificaron.

El recorrido de navegador comprueba entrada oculta sin delegación, ambos modos accesibles al delegado, salida al partido y reparación de una convocatoria duplicada; continúa con todo el partido, offline y PDF. Capturas: `tmp/acta-audit/entrada-320.png` y `tmp/acta-audit/revisar-gorros-320.png`. La primera suite completa de esta revisión pasó 742 pruebas con 22 omitidas; las dos regresiones adicionales de selector y clave compuesta de convocatoria también pasan. Se repite la verificación final tras añadir la prevención de nuevos duplicados. No se ha desplegado la web.

Verificación final de gorros: el recorrido de producción local pasa con dos escrituras simultáneas al mismo número: una se guarda y la otra recibe `23514`; no aparecen duplicados. Continúa con entrada por rol, registro sencillo, seis tamaños, texto ampliado, partido completo, recarga offline y PDF. El build final pasa con TypeScript. La captura de carga está en `tmp/acta-audit/carga-acta.png`. Un primer intento de suite y build en paralelo agotó memoria; se cerraron servidores propios de ensayo y se limitaron los workers para repetirlo.

El asesor de seguridad no señala las funciones nuevas del acta. Conserva avisos de funciones existentes (`archive_season`, `atomic_replace_training_schedule`) ejecutables por usuarios autenticados y de protección de contraseñas filtradas desactivada; no se han modificado esos módulos. Referencias: [funciones SECURITY DEFINER](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable) y [protección de contraseñas](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

Resultado de la repetición final: 88 archivos, 744 pruebas correctas y 22 omitidas; ningún fallo. ESLint de los cambios finales pasa.
