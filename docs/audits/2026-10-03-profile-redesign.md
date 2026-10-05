# Perfil: rediseño, accesibilidad y seguridad

Fecha: 3 de octubre de 2026. Entorno local de Morvedre Core.

## Uso y estructura

El perfil sirve para reconocer la cuenta, editar sus datos, encontrar la actividad propia y familiar y gestionar los ajustes de la cuenta. Se sustituye la acumulación de accesos y métricas por una identidad compacta y grupos de acciones. Se reutilizan controles de Tienda, fotos y nombres de Equipo y láminas de confirmación del Acta.

| Área          | Resultado                                                                                                                                         |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Inicio        | Identidad, Editar mis datos, actividad, familia cuando existe y ajustes de cuenta. Administración solo con capacidades propias.                   |
| Mis datos     | Nombre, foto, contacto privado y gorro preferido para jugadores. Revisión de cambios antes de guardar.                                            |
| Foto          | Selección JPG/PNG, encuadre, zoom, movimiento con controles accesibles, quitar y deshacer. Los cambios son provisionales hasta guardar el perfil. |
| Mi actividad  | Asistencia, ficha deportiva, tiempos y equipos propios. Pasar lista solo para entrenadores autorizados.                                           |
| Mi familia    | Accesos identificados por hijo a ficha, asistencia y tiempos; pedidos por autorizar y cuotas familiares.                                          |
| Mi cuenta     | Notificaciones del móvil, buzón, contraseña y enlace personal de calendario.                                                                      |
| Salida        | Confirmación antes de cerrar sesión y protección de actas locales pendientes conservada.                                                          |
| Carga y error | Tarjeta centrada con el estilo actual y recuperación explícita ante errores.                                                                      |

## Hallazgos corregidos

- La edición anterior permitía enviar el año de nacimiento a una acción privilegiada. El año influye en categorías y autorización de pedidos de menores: ahora lo gestiona el club, aparece como dato de lectura y el servidor rechaza su alteración.
- La ficha completa se enviaba al editor. Una consulta exclusiva de la cuenta entrega solo los campos necesarios; no envía roles, notas, identificadores de autenticación ni el enlace privado de calendario al formulario.
- La foto podía sustituirse o borrarse antes de confirmar la actualización de la ficha. Las nuevas fotos utilizan rutas únicas. La foto anterior se retira únicamente después del guardado.
- Una respuesta perdida podía confundirse con un fallo de escritura. Se comprueba la referencia de la foto antes de eliminar una subida nueva. Si no es posible verificarla, se conserva el archivo y se pide comprobar los datos, evitando romper una foto cuyo guardado pudo completarse.
- Se añade revisión de versión mediante `updated_at` para no sobrescribir una edición de otra sesión.
- El recorte de la foto usaba una medida diferente a la ventana visible. Ahora mide la ventana real y genera el recorte con sus dimensiones, incluido el montaje dentro del modal.
- El botón Atrás, los enlaces de navegación y el gesto móvil protegen los cambios sin guardar. La cancelación conserva el borrador.
- Los requisitos de contraseña del cliente y servidor eran distintos. Se unifican; el servidor comprueba la cuenta activa antes de cambiar las credenciales y permite solo destinos de regreso conocidos.
- El enlace de calendario usa el origen del navegador para funcionar al acceder por la IP local. La copia fallida permite seleccionar el enlace manualmente.
- Las notificaciones no esperan indefinidamente un service worker inexistente. Se muestran mensajes y acciones comprensibles cuando no está disponible.
- Se conserva el origen al entrar desde Perfil o Familia en pedidos, notificaciones, asistencia, equipos, jugadores, partidos y tiempos. Las pestañas de equipo no se convierten en pasos del botón Atrás.
- El historial de asistencia elige al propio jugador cuando corresponde, también si la cuenta tiene hijos vinculados. Los identificadores solicitados se limitan a la familia autorizada.

## Seguridad revisada

Todas las mutaciones siguen pasando por acciones de servidor y validación Zod. La actualización se limita a la cuenta autenticada, su ficha activa y la versión original. Los campos ajenos al formulario no se persisten. El gorro no se admite para cuentas sin rol de jugador.

Se verificaron de forma remota y de solo lectura las políticas de `profiles` y sus privilegios de columna: el usuario autenticado no tiene UPDATE de `birth_year` ni de `auth_user_id`, y el SELECT general no expone `phone_e164`. La acción privilegiada aplica sus propias restricciones de identidad y campos. No se cambiaron las políticas ni el esquema durante este trabajo.

Las fotos se validan por contenido, se normalizan en servidor y tienen límite de tamaño y de píxeles. La limpieza solo acepta archivos dentro del prefijo de la propia ficha y el bucket esperado. Un fallo de limpieza después del guardado no borra la referencia válida.

## Evidencias

- 115 pruebas correctas en 19 archivos: edición, protección de edad y permisos, concurrencia, fallos de guardado, ciclo de fotos, recorte, familia, contraseña, notificaciones, cierre de sesión y regresiones de navegación, equipos, asistencia y pedidos.
- TypeScript estricto y ESLint de los archivos revisados: correctos.
- Navegación real en el navegador autenticado: perfil, edición, revisión de cambios, cancelación, salida con borrador, gesto Atrás, ajustes, contraseña sin envío, actividad, asistencia propia, equipos y sus pestañas, familia vacía, pedidos y confirmación de cierre de sesión sin cerrar la cuenta.
- Auditoría axe en el contenido de Perfil, Mis datos, Mi cuenta, Mi actividad, Mi familia y Contraseña, y en modales de salida: sin infracciones detectadas con los conjuntos WCAG A/AA disponibles. Esto no acredita por sí solo conformidad WCAG completa.
- Revisión visual a 393 × 852 y 412 × 915, con comprobación adicional de desbordamiento a 320 px. Los enlaces principales quedan en una línea a 393 px; los controles de la portada cumplen al menos 48 px. Se usó Pretext para medir los textos, además de la revisión visual.
- Se comprobó el foco dentro del modal de sesión y su cancelación con Escape. El formulario lleva etiquetas, errores asociados a campos y foco al primer dato incorrecto; los mensajes de estado y error son accesibles.

## Límites de las pruebas

No se cambiaron datos personales reales, contraseñas ni permisos de notificaciones durante las pruebas. El guardado y sus fallos se verificaron con pruebas de acciones y componentes. El selector nativo de archivos no se pudo automatizar en el navegador disponible; la selección, recorte, cancelación y deshacer se comprobaron en componentes, incluido el cálculo del recorte.

La familia real de esta cuenta no contiene hijos vinculados. Se comprobaron composiciones de uno, dos y tres hijos mediante pruebas de componentes y restricciones de acceso mediante pruebas de página.

El envío push nativo sigue requiriendo un dispositivo compatible y un entorno seguro. Esta revisión no da por cerradas las verificaciones operativas de notificaciones pendientes en la auditoría general del proyecto.

Si se pierde conexión justo después de subir una foto y también falla verificar su referencia, puede quedar un archivo sin uso en Storage. Se conserva deliberadamente hasta poder comprobarlo para evitar eliminar una foto válida. No se expone al usuario una confirmación falsa de guardado.

## Punto de retorno

Los originales del apartado se guardaron en `tmp/profile-before-2026-10-03/`. Las copias de TypeScript llevan sufijo `.bak` para no entrar en la compilación. No se publica ni se modifica la demo.
