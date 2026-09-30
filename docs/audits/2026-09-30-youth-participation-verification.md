# Verificación de participación juvenil en el acta

Fecha: 30 de septiembre de 2026.

## Estado y alcance

Implementación terminada en `codex/youth-participation`, con migración aplicada y aplicación compilada disponible localmente en `http://localhost:4184`. No se ha publicado la aplicación ni modificado la demo.

Commit de implementación y pruebas: `3a36444` (`feat(acta): track youth participation with offline lineup recovery`).

El punto de retorno anterior es el commit `d30f7fb85f6db70f5b17ff32e68b114a27b710b7`, subido a la rama [codex/backup-before-youth-rotation-2026-09-30](https://github.com/Rubeengalveez/MorvedreCore/tree/codex/backup-before-youth-rotation-2026-09-30). Este respaldo contiene código, no una exportación de la base de datos ni los documentos privados de IndexedDB.

Se implementa la planificación aprobada en `docs/planning/39-youth-participation-plan.md`, incluyendo los avisos adicionales pedidos por Rubén. Escuela usa el formato Benjamín aprobado. Las categorías superiores conservan su flujo habitual.

## Resultado de comprobaciones

| Comprobación | Resultado |
| --- | --- |
| `npx vitest run --maxWorkers=6` | 104 archivos aprobados; 935 pruebas aprobadas, 22 omitidas por condiciones de entorno; sin fallos |
| `npx playwright test --config playwright.acta.config.ts` | Dos recorridos aprobados sobre servidor de producción compilado |
| `npm run build` | Compilación y comprobación TypeScript correctas |
| `npx tsc --noEmit` | Correcto |
| ESLint dirigido a los archivos de código, configuración y pruebas modificados | Correcto |
| `git diff --check` | Correcto |
| Pruebas SQL de participación y guardado, más suite previa de actas | Correctas mediante transacciones con `ROLLBACK` |
| Revisión visual a 320 y 393 px | Selección legible, pie fijo visible y contenido desplazable |

Las 22 pruebas omitidas pertenecen a integraciones condicionadas por configuración de entorno. El total de Vitest no implica que todas las integraciones externas del proyecto se hayan ejecutado.

## Matriz funcional

| Escenario | Evidencia |
| --- | --- |
| Un portero y cinco/seis jugadores según categoría; ambos equipos | Dominio, componentes y recorrido de navegador |
| Portero siempre en gorro 1 o 13 y excepción de portero único solo en Alevín/Infantil | Dominio, validación y SQL |
| Avisos al acabar el tercero y seleccionar el cuarto, para ambos equipos | Componentes y recorrido de navegador |
| Cuarta participación ordinaria seleccionable con confirmación e incidencia | Dominio y recorrido de navegador |
| Jugador elegido para una acción sin estar alineado | Aviso y corrección comprobados en navegador; sin crear una jugada ficticia |
| Asistentes y lanzadores de penalti limitados a participantes efectivos | Dominio y componentes, incluidos rivales |
| Marcas discretas retiradas desde el quinto y consulta histórica conservada | Componentes y dominio |
| Sustitución infantil, corrección/anulación y descanso del quinto | Pruebas de dominio y portería |
| Cambio de gorro y reemplazo de identidad mantienen participación y estadísticas | Pruebas de dominio y sincronización |
| Inscritos rivales no consecutivos; protección de gorros con participación o jugadas | Dominio y validador |
| Cuatro expulsiones en Benjamín/Escuela y tres en las demás categorías | Dominio, cliente, Server Action y RPC SQL real |
| Compatibilidad con documentos anteriores y actas cerradas | Suite de regresión, entrada y sincronización |
| Exportación de participación con distinción entre descanso y datos desconocidos | Prueba del PDF |

## Sin conexión y concurrencia

El navegador de pruebas utiliza un contexto aislado con un partido ficticio almacenado en IndexedDB. Se desactiva la red mediante `context.setOffline(true)`, además de comprobar el estado offline de la interfaz. El service worker permite recargar el acta ya preparada.

El recorrido verifica recuperación de una selección incompleta tras recarga, comienzo con ambos equipos, aviso de jugador no seleccionado, corrección sin inventar goles, anotación de un gol con la red desactivada, persistencia tras otra recarga y comienzo/recuperación del segundo cuarto sin red.

Las pruebas de sincronización cubren una respuesta antigua mientras hay cambios locales posteriores, reintento de la misma mutación tras una respuesta incierta, corrección de convocatoria guardada sin conexión, pérdida de respuesta del relevo y fallo de escritura local. La app no anuncia un guardado que IndexedDB ha rechazado. Los borradores no confirmados no se envían como alineaciones del partido y se descartan cuando una revisión o relevo los vuelve obsoletos.

Estas evidencias proceden de navegador y pruebas automatizadas; no se afirma una prueba física realizada en una piscina ni en todos los modelos de móvil.

## Base de datos

Aplicada en el proyecto `hzplkjtfejqfulhhnlya` la migración `20260930002921_youth_participation.sql`, conservando el guardado anterior, autorización, revisión, dispositivo, reintentos y protecciones de convocatoria. La categoría se comprueba contra el equipo real y no se confía en una categoría enviada por el cliente.

Se ejecutaron `tests/database/youth-participation.sql`, `tests/database/youth-participation-save.sql` y `tests/database/live-match-sheets.sql`. Las pruebas usan transacciones revertidas: no quedan perfiles, equipos ni partidos de prueba en la base de datos.

La comprobación incluye un guardado RPC real con cuatro expulsiones en Benjamín, persistencia de participación, reintento idempotente, relevo que conserva el documento y rechazo de una categoría manipulada. También se comprueban permisos del validador, referencias inexistentes y alineaciones duplicadas. No se crean tablas nuevas ni se amplía el acceso RLS.

Los asesores de seguridad no señalaron nuevas incidencias en estas funciones/tablas del acta. Permanecen avisos anteriores en funciones ajenas a este cambio, configuración de contraseñas y tablas privadas retiradas; esta verificación no sustituye el cierre operativo general del proyecto.

## Entrega

La aplicación compilada permanece abierta en el navegador integrado. El partido que ya tenía abierto el usuario es Absoluto: conserva su aspecto y no muestra la selección juvenil. Los escenarios juveniles se verificaron con datos ficticios en un navegador aislado, sin cambiar la categoría de ese partido real.

La guía de uso está en `docs/guides/acta-en-directo.md`. El cambio queda preparado para revisar localmente y publicar en un paso posterior.
