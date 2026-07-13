# Sección de asistencia para entrenadores

## Objetivo

Convertir la asistencia en una herramienta diaria completa, rápida y segura para una persona poco habituada a aplicaciones. El flujo funciona desde 320 px y no depende de gestos, iconos aislados ni menús de administración.

## Arquitectura final

- `Asistencia` es una pestaña principal que solo aparece si el perfil activo tiene rol `coach`, figura como entrenador principal o ayudante y tiene activado `Puede pasar lista`.
- El administrador concede o retira el permiso global por entrenador desde `Admin > Personal`. Un entrenador autorizado puede gestionar todas las categorías de la temporada para sustituir a otro. El permiso nunca está disponible para delegados, preparadores ni administradores que no sean también entrenadores asignados.
- `/attendance` permite elegir fecha y entrenamiento.
- `/attendance/[sessionId]` abre una única lista, sin mezclar categorías.
- Inicio queda limpio y conserva el saludo compacto solicitado.

## Flujo de uso

1. El entrenador abre `Asistencia`.
2. Ve los entrenamientos del día con hora, jugadores y estado de la lista.
3. Puede cambiar de día con flechas o elegir cualquier fecha en el calendario.
4. Pulsa un entrenamiento para abrirlo.
5. Todos los jugadores sin registro aparecen como `Presente` y se guardan automáticamente.
6. Si alguien falta, solo pulsa `Ausente` junto a su nombre.
7. Cada cambio se sincroniza solo y muestra `Guardando cambios` o `Guardado automáticamente`.
8. Puede volver a una sesión anterior y corregir cualquier estado.

## Prevención de errores

- No existe un botón final que pueda olvidarse.
- Los guardados se ponen en cola para que dos cambios rápidos no se escriban fuera de orden.
- Si falla la red, el estado se muestra de forma visible y ofrece `Reintentar`.
- El navegador avisa si se intenta cerrar la página con cambios pendientes.
- La Server Action valida con Zod, autentica al entrenador, exige el permiso global y una asignación como entrenador en la temporada del equipo, rechaza sesiones canceladas y compara la lista completa con la plantilla vigente en la fecha de la sesión.
- PostgreSQL vuelve a comprobar la pertenencia a plantilla y fija `marked_by` y `marked_at` usando la identidad autenticada.
- RLS autoriza la escritura en cualquier equipo de la misma temporada solo si el perfil conserva `manage_attendance` y una asignación real como entrenador; retirar el permiso bloquea inmediatamente nuevos cambios.

## Accesibilidad y ergonomía

- Una pantalla por entrenamiento y una sola columna.
- Solo se muestra el nombre del jugador; se eliminan dorsales y metadatos innecesarios.
- Botones `Presente` y `Ausente` de 56 px con texto, icono, borde y color.
- Objetivos táctiles de al menos 48 px, foco visible, `aria-pressed`, grupos accesibles por jugador y mensajes `aria-live`.
- Soporte para reducción de movimiento y área segura sobre la navegación inferior.

## Datos y zona horaria

Las fechas y horas se interpretan siempre en `Europe/Madrid`. La plantilla histórica se reconstruye usando `joined_at` y `left_at`, por lo que corregir una sesión antigua utiliza los jugadores que pertenecían al equipo ese día.

## Capturas

- `screenshots/attendance-section-320.png`
- `screenshots/attendance-autosave-393.png`
- `screenshots/attendance-history-430.png`

## Verificación

- Pruebas del valor presente por defecto y el autoguardado.
- Prueba de ausencia con un solo toque y sin botón de guardado.
- Prueba de corrección de una ausencia ya guardada en una sesión pasada.
- Pruebas de contratos Zod, permisos e integridad PostgreSQL.
- Verificación cloud de que ningún rol no entrenador puede recibir el permiso y de que todos los permisos activos pertenecen a un entrenador asignado.
- Revisión visual a 320, 393 y 430 px.
