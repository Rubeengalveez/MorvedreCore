# Accesibilidad móvil del acceso · 25 de septiembre de 2026

## Alcance

Login, solicitud de acceso para jugador y familia, selector de solicitud, recuperación y cambio de contraseña. Se conservó el diseño actual y se revisó el recorrido a una anchura móvil de 394 px.

## Hallazgos y correcciones

- El enlace «Saltar al contenido principal» no tenía destino en las pantallas de acceso. El login y el resto del recorrido tienen ahora un único `main` con `id="main-content"`.
- El mensaje de credenciales incorrectas tenía poco contraste. Se oscureció el texto, se vinculó el mensaje a los dos campos y se marcó su estado de error.
- Los campos y algunos botones tenían bordes o áreas táctiles demasiado discretos. Se unificó el tratamiento de campos, se reforzaron los bordes y se ampliaron los controles pequeños sin cambiar la estructura visual.
- En la solicitud familiar, el cambio de paso y la adición o eliminación de un hijo podían dejar el foco en un control oculto o eliminado. Ahora el foco pasa al indicador del paso, al campo del nuevo hijo o al botón de añadir, según corresponda. Cada hijo tiene un grupo y un título identificables.
- Los mensajes de éxito usan un encabezado bajo el título de la página; los errores de recuperación y cambio de contraseña tienen texto más legible.

## Verificación

- Lighthouse Accessibility móvil: login con credenciales incorrectas, **93 → 100/100**; solicitud familiar, **100/100**. Los informes se generaron completos, aunque el ejecutable mostró un error de permisos al borrar su carpeta temporal después de escribirlos.
- Inspección del árbol de accesibilidad del login, selector, solicitud de jugador y familia: títulos, regiones principales, nombres de controles y orden de lectura coherentes.
- Recorrido familiar manual: el foco llega al paso 2, al nombre del hijo recién añadido y vuelve a «Añadir otro hijo» tras quitarlo.
- `npm run typecheck`, ESLint de los archivos modificados y `npm run build`: correctos.

La puntuación automática no acredita por sí sola conformidad WCAG 2.2. Queda por contrastar el recorrido con VoiceOver o TalkBack en un dispositivo físico y con usuarios reales; la comprobación de identidad no se envió con datos de prueba a la base de datos.
