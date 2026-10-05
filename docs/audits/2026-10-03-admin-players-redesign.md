# Gestión de jugadores: diseño, accesibilidad y funcionamiento

## Objetivo

Renovar `/admin/players` para que registrar, buscar y editar jugadores resulte sencillo en móvil. Se reutilizan controles, colores, contornos y láminas de confirmación de Tienda, Equipos y Acta. La importación retirada por petición de Rubén permanece eliminada.

## Hallazgos y correcciones

| Hallazgo                                                                           | Corrección                                                                                                                                                                                                   |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| El listado mezclaba jugadores con familiares y personal sin rol de jugador.        | Se limita a perfiles con rol de jugador. Los perfiles con varios roles siguen apareciendo si también son jugadores. La muestra actual pasa de 210 perfiles generales a 125 jugadores activos.                |
| La jerarquía y los controles respondían al diseño antiguo.                         | Directorio de tarjetas con foto, nombre, equipo, categoría por edad y año. Botón principal Nuevo jugador, edición accesible desde la identidad y acciones explícitas.                                        |
| Búsqueda y filtros poco consistentes.                                              | Búsqueda por palabras sin distinción de mayúsculas o tildes, incluyendo nombre, categoría, equipo, año y gorro. Filtros agrupados en una lámina: estado, categoría y equipo, incluyendo Sin equipo.          |
| Resultados vacíos con páginas fuera de rango.                                      | La paginación se limita al rango real y conserva búsqueda y filtros. Los extremos son botones desactivados. Restablecer limpia también el texto del buscador.                                                |
| Demasiados campos sin una secuencia clara al registrar.                            | Nombre, año y equipo principal siempre visibles; Foto y contacto y Otros datos se despliegan por separado. La categoría se deriva del año y la temporada actual.                                             |
| Ediciones parciales exigían campos ocultos sin modificar.                          | Se corrige el esquema de actualización y se envían solo los cambios efectivos. No se habilita guardar por añadir espacios al nombre.                                                                         |
| Los errores no guiaban hacia el dato incorrecto.                                   | Mensajes por campo, atributos accesibles y foco en el primer campo inválido. Un error de guardado conserva el borrador para reintentar.                                                                      |
| Falta de confirmación y protección del borrador.                                   | Revisión de datos antes de registrar o guardar, confirmación al activar/desactivar y confirmación al salir con cambios. Guardar bloquea cierres y dobles pulsaciones.                                        |
| Añadir una foto mediante una URL no era adecuado para móvil.                       | Selección de JPG/PNG de hasta 5 MB, vista previa, cambio y retirada. El servidor comprueba el archivo y normaliza la imagen; una operación fallida limpia la nueva subida.                                   |
| Nombres y filas de acciones podían desbordarse.                                    | Nombres con abreviación progresiva en una línea y nombre completo accesible. Botones en columnas iguales, texto sin saltos accidentales y 48 px de altura. Categoría y nacimiento comparten una fila propia. |
| Varios equipos podían convertirse en un párrafo desalineado.                       | Cada pertenencia aparece como una línea independiente. Correo y notas tienen su propio bloque en la revisión, sin comprimir las etiquetas de otras filas.                                                    |
| El alta escribía perfil, rol y plantilla en pasos separados.                       | Función transaccional `register_admin_player`: comprueba temporada, edad, duplicados y gorros ocupados, y registra todas las relaciones o ninguna.                                                           |
| Las acciones podían dirigirse a un perfil que no era jugador.                      | Se verifica el rol del destinatario. La desactivación del propio perfil se rechaza en ambos caminos de escritura. Cada acción comprueba `manage_players`.                                                    |
| Los cambios podían dejar vistas de equipos sin actualizar.                         | Se revisan las invalidaciones de las rutas relacionadas y se conserva la separación entre gorro preferido y convocatoria por defecto gestionada en Equipos.                                                  |
| Estados de Escuela podían conservar una cuota marcada tras retirar la inscripción. | Retirar la inscripción limpia también el indicador de cuota pagada.                                                                                                                                          |
| Pantalla de carga antigua y poco integrada.                                        | Estado centrado, con cabecera azul y contorno oscuro, como reemplazo del contenido durante la carga.                                                                                                         |

## Cambios de datos y permisos

Migración aplicada: `20261002172025_admin_player_registration_atomic.sql`.

La función es `SECURITY INVOKER` y solo puede ejecutarla `service_role` desde el servidor. Se comprobó en Supabase que `authenticated` no tiene permiso de ejecución. La interfaz no recibe credenciales administrativas. No se añaden tablas ni se amplían permisos personales.

Los gorros ya asignados se desactivan en el alta y se vuelven a comprobar dentro de la transacción. Un gorro inicial puede incorporarse a la convocatoria por defecto existente, si queda plaza; las convocatorias de partidos ya creados no se modifican.

## Verificación

- TypeScript sin errores y ESLint de los archivos modificados.
- 136 pruebas de dominio, interfaz, acciones, fotos y regresiones de administración/equipos; incluyen denegación de permisos, actualización parcial, dobles pulsaciones, errores, conservación de borradores y limpieza de fotos de altas fallidas.
- Fixture SQL de registro atómico ejecutado con rollback: perfil, rol, plantilla, duplicado, gorro ocupado, año futuro y restricción de ejecución. No quedan jugadores de prueba guardados.
- Revisión del directorio y formulario en 393 × 852 e inspección adicional en 412 × 915; ancho mínimo de 320 × 760 y revisión de escritorio. Sin desplazamiento horizontal de la página ni desbordamiento de las acciones revisadas.
- Nombres largos probados con un alta ficticia que se descartó antes de guardar. Medición de etiquetas mediante Pretext y geometría del navegador.
- Axe con reglas WCAG A/AA, 2.1 AA y 2.2 AA: cero infracciones detectadas en directorio, filtros, formulario y revisión. Filtros y formulario expandido no dejan comprobaciones incompletas. El análisis global del directorio señala contraste por solapamiento de herramientas de desarrollo sobre la navegación inferior; se revisó visualmente. Estas pruebas no constituyen una certificación WCAG.
- Apertura con teclado de los datos opcionales, cierre con Escape, restauración del foco y confirmación de salida comprobados. No se modificaron fichas reales durante las pruebas de navegador.

Evidencias: `docs/audits/evidence/admin-players-2026-10-02/`. La carpeta conserva la fecha de inicio de esta revisión.

## Límites y asuntos previos

No se ha desplegado la aplicación. La comprobación visual no sustituye una sesión real con las personas que gestionarán jugadores. Las pruebas de almacenamiento de fotos usan archivos y clientes controlados; no se subió una foto de una persona real durante la auditoría.

Los avisos previos de Supabase, ajenos a esta función, siguen documentados: tablas cerradas sin políticas ([guía](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy)), funciones antiguas ejecutables con `SECURITY DEFINER` ([guía](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable)) y protección frente a contraseñas filtradas ([guía](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)). No se declara cerrada la auditoría operativa general del proyecto.
