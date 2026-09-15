# 15 · Verificación y aceptación

[Documento general](00-panel-general.md).

## Alcance de esta revisión

Se revisó el árbol local basado en HEAD 29a0ff3, incluyendo modificaciones anteriores del usuario. No se modificaron fuentes de la aplicación. Se consultaron planificación, guía administrativa y estado operativo; los resultados anteriores no se cuentan como pruebas actuales.

Se inició un recorrido con el script existente y se acotó después a administración para evitar dedicar la prueba a pantallas públicas. El registro definitivo del recorrido local y las capturas se incorporan abajo. La sesión usa la cuenta de administración de demo existente; no demuestra permisos ni fallos de la cuenta de Rubén.

## Qué acredita cada método

| Método | Acredita | No acredita |
| --- | --- | --- |
| Lectura de código | Rutas, controles, condiciones, tratamiento de errores y riesgos de contratos | Estado remoto, entrega de correo, éxito de escrituras |
| Consulta de migraciones | Restricciones y cascadas declaradas en repositorio | Que estén aplicadas hoy en cloud |
| Recorrido de lectura | Renderizado y controles presentes para demo/tamaño observado | Flujo completo de alta/edición/borrado |
| Capturas | Apariencia del estado capturado | Teclado, lector de pantalla, todas las combinaciones |
| Métricas DOM propias | Nombres heurísticos, tamaños, overflow global | Auditoría axe ni conformidad WCAG completa |
| Propuesta de tareas | Criterios concretos para implementación | Funcionalidad implementada o validada por el club |

## Escenarios de aceptación del rediseño

| ID | Persona de prueba | Tarea | Resultado exigido |
| --- | --- | --- | --- |
| U01 | Admin/secretaría autorizada | Resolver alta con ficha existente | Sin duplicado; acceso y vínculo claros |
| U02 | Admin | Alta/edición de jugador de Escuela | Aparece actualizado y conserva indicadores |
| U03 | Admin | Importar 10 filas, 2 erróneas | Resultado exacto y reintento sin duplicados |
| U04 | Gestor familias | Vincular dos tutores y retirar uno | Relación y acceso resultantes correctos |
| U05 | Admin | Asignar entrenador y retirar permiso | Menú, acciones y datos coinciden |
| U06 | Entrenador | Configurar semana y cambiar una sesión | Equipo actual, excepción aislada, pasado conservado |
| U07 | Entrenador | Pasar lista hoy después de empezar | Sesión accesible y guardado inequívoco |
| U08 | Admin/entrenador | Crear y reprogramar partido | Botón accesible, fecha/equipo correctos |
| U09 | Delegado | Convocatoria, acta y viaje | Alcance correcto, vuelta al partido, sin programación indebida |
| U10 | Sol | Editar y retirar producto con pedidos | Catálogo actualizado, historia preservada |
| U11 | Sol | Completar/cancelar pedido | Estado claro, cancelado consultable |
| U12 | Mónica | Ajustar cargo y generar cierre sintético | Totales/origen exactos, descarga correcta |
| U13 | Comunicación | Publicar/editar/caducar aviso de equipo | Destinatario y hora correctos |
| U14 | Admin | Preparar y activar nuevo curso | Operación atómica, histórico íntegro |
| U15 | Todos los roles | Acceder a módulo ajeno por URL | Denegación consistente y comprensible |

Ensayar primero con fixtures sintéticos aislados; sin datos reales en evidencias compartidas. Los envíos requieren destino de prueba controlado. Realizar tareas destructivas sobre fixtures, no sobre el club.

## Sesiones de usabilidad propuestas

Cinco sesiones de 25–40 minutos: Rubén, entrenador adicional, delegado, Sol y Mónica; añadir secretaría para Personas si Rubén no la representa. Propuesta de aceptación: tareas esenciales completadas sin indicaciones, cero errores de destinatario/equipo/temporada y comprensión de efectos antes de confirmar. Registrar tiempo, dudas, retrocesos, errores y recuperación; no fijar velocidad arbitraria como requisito.

Probar teléfono real con teclado virtual y conexión lenta, teclado de escritorio, texto ampliado y lector de pantalla. Contrastar lo que la persona cree que guardó con lo persistido.

## Pendientes que no se deben dar por cerrados

Reproducción exacta de fallos en versión publicada/cuenta de Rubén; escrituras completas por rol; SQL vigente remoto; pruebas de correo/push; lector de pantalla; recuperación integral; revisión de catálogo vigente y sesiones con el club. El build y las pruebas unitarias antiguas no sustituyen estos controles.

## Evidencia de navegador y consultas · 15 de septiembre

Entorno: aplicación local en desarrollo en localhost:3000, cuenta de demo de administración. Viewports del recorrido: 320×740 y 1440×900. Se intentaron 20 rutas administrativas en cada tamaño: **40 combinaciones**. El script devuelve incidencias en **21**: hubo 19 navegaciones sin status HTTP registrado, 8 con destino final distinto al solicitado, además de errores de conexión/recarga. Estos conjuntos se solapan; no sumarlos como fallos independientes. No se consideran 40 rutas validadas ni se atribuyen los timeouts a fallos de producto: el servidor de desarrollo registra recargas completas y la prueba con networkidle es inestable en ese contexto.

Sí se inspeccionaron capturas concretas de Inicio, Jugadores, Partidos, Entrenamientos, Tienda, edición de producto y Tesorería. Las capturas con pantalla reconocible pero respuesta HTTP ausente acreditan únicamente la apariencia capturada, no la navegación correcta. No se reutilizan capturas de otra ruta para dar por validado un destino.

Hallazgos confirmados:

- Jugadores muestra «Plantilla vacía»; consulta exacta devuelve 42501. IDs permitidos: 210 perfiles. Las columnas teléfono, correo y notas devuelven 403 por separado; el resto de columnas del listado responden 200. Los resultados se registran sin valores personales.
- «Nuevo jugador» recortado en 320 px, pese a overflow global cero.
- «Nuevo partido» presente para demo en 320 px; sigue pendiente reproducción con cuenta/versión de Rubén.
- Tienda: 6.886 px de contenido vertical en móvil; catálogo no aparece. Edición directa muestra Guardar/Eliminar.
- Tesorería: 11.273 px en móvil y 6.078 px en escritorio; configuración de jugadores antes del cierre.
- Entrenamientos muestra bloques antiguos junto a los actuales del equipo seleccionado; necesita contexto de vigencia y separación del histórico.

Artefactos privados locales: `tmp/admin-audit-2026-09-15/results.json`, capturas `mobile-*.png`/`desktop-*.png` y scripts de comprobación. No publicar ni versionar las capturas sin revisar datos personales. La cuenta demo puede consultar otros registros del entorno conectado; no se presupone que todos sus datos sean sintéticos.

### Consultas reproducibles

`node tmp/admin-audit-2026-09-15/check-players.mjs`: compara consulta exacta y recuento de IDs. `check-player-fields.mjs`: devuelve solo nombre de columna, status, código de error y cantidad de filas, sin sus valores. No modifica perfiles ni privilegios. Las sesiones de estos dos scripts se cierran con alcance local.

### Límites de ejecución

El lanzador pnpm intentó comprobar dependencias y abortó por ausencia de TTY; no se forzó reinstalación. El ejecutable Next requirió lectura fuera del aislamiento y detectó otro servidor local ya activo; se utilizó ese servidor. No se ejecuta build ni suite de código por cambios exclusivamente documentales. No se modifica el proceso de servidor existente.

### Formularios: repetición estabilizada

Tras esperar la carga y bloquear service workers en el contexto de prueba, los tres formularios —Nuevo jugador, Nuevo partido y Crear horario— se abren y cierran con Escape en **320, 390 y 1440 px: 9 de 9 combinaciones**, todas con respuesta 200. No se envía ninguno. La primera prueba sin esa espera agotó el tiempo buscando el diálogo; se conserva como limitación del procedimiento, no como fallo confirmado del producto.

El retorno inmediato del foco al disparador se confirmó en 7 de 9 combinaciones. Las dos comprobaciones de escritorio de Partidos y Entrenamientos dieron false; necesitan repetición con espera del retorno de foco antes de clasificarlas como defecto. No se considera comprobado el recorrido completo por teclado ni por lector.

Los selectores de Partidos y Entrenamientos contienen 2025/2026, 2024/2025 y 2023/2024. El entorno conectado identifica **2025/2026 como actual** en la fecha de esta revisión. Es un pendiente de preparación/activación de datos, no una autorización para activar 2026/2027. El formulario de horario parte de 01/09/2025: reducir opciones históricas debe acompañarse de verificar la temporada activa.

Capturas de formularios: `dialog-320-*.png`, `dialog-390-*.png`, `dialog-1440-*.png`; resultados: `flows-retry.json` y `flows-final.json`. En escritorio, la lámina de jugador ocupa todo el ancho (1440 px), estirando campos y alejando lectura/acción; se propone formulario limitado en ancho. En móvil, cabecera y pie fijo reducen el espacio para campos; revisar con teclado virtual real.

La comprobación documental encontró **17 documentos y cero enlaces Markdown locales rotos**. Los enlaces externos de referencia no se validan como archivos locales.
