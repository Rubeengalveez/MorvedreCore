# 03 · Jugadores

[Documento general](00-panel-general.md).

## Objetivo

Encontrar una persona y completar su gestión deportiva: ficha, equipos, familia, situación y acceso, sin recorrer módulos desconectados. Crear jugador no equivale a crear usuario de acceso.

## Inventario actual

`players/page.tsx` consulta perfiles; `players-table.tsx` ofrece búsqueda, activos/desactivados, edición y cambio de estado. `player-form-sheet.tsx` edita nombre, nacimiento, género, gorro, contacto, URL de foto y notas. Alta e importación están visibles. Asignar a equipo se resuelve desde Equipos, aunque la cabecera promete asignación.

## Hallazgos prioritarios

- **JUG-01, P0 (C):** el formulario de edición no envía `school_enrolled` ni `school_payment_paid`; `updatePlayer` escribe ambos como `parsed.data... ?? false`. Editar otro dato puede borrar esos indicadores. Probar con ficha sintética de Escuela antes de cualquier uso real.
- **JUG-02, P1 (C/R):** la carga ignora errores de temporada, perfiles y plantilla. `profilesData ?? []` acaba como «Plantilla vacía». La causa exacta del caso reportado no está demostrada: revisar consulta, permisos, versión y datos.
- **JUG-03, P1 (C):** `useState(players)` no se concilia al recibir props actualizadas. Las acciones revalidan la ruta, pero la lista puede conservar datos anteriores tras alta o edición.
- **DAT-01, P1 (C):** categoría calculada con año del reloj; la asignación a equipo usa el inicio de temporada. Puede cambiar en enero dentro del mismo curso.
- **JUG-04, P2 (C):** se listan perfiles, no una selección explícita de jugadores. Hay límite fijo 1000. Un mapa guarda una sola etiqueta de equipo por persona y pierde la información de pertenencia múltiple.
- **JUG-05, P2 (C):** fallo al activar/desactivar revierte silenciosamente. La búsqueda carece de nombre asociado.
- Foto mediante URL y control de cambio de contraseña para fichas sin cuenta requieren simplificación.

## Diseño y funciones necesarias

### Reproducción local confirmada (V)

La pantalla de demo muestra «Plantilla vacía». La consulta exacta devuelve `42501: permission denied for table profiles`. Una consulta permitida de IDs cuenta **210 perfiles**, no 210 jugadores. La comprobación individual confirma HTTP 403 para `phone_e164`, `email_contact` y `notes`, mientras las otras siete columnas consultadas devuelven HTTP 200. Esto coincide con la restricción de columnas de `20260712171403_audit_security_hardening.sql`.

La causa queda confirmada para el entorno y cuenta de demo. El arreglo debe separar listado sin datos privados de lectura administrativa autorizada, comprobar `manage_players` en servidor y devolver errores diferenciados. **No ampliar SELECT de datos privados a todos los usuarios autenticados.** Sigue pendiente confirmar que la web reportada usa esta misma versión.

En la captura de 320 px, «Nuevo jugador» queda cortado a la derecha aunque el documento mide cero desbordamiento horizontal: revisar la cabecera de dos columnas y el contenedor que recorta contenido.

Lista con búsqueda rotulada, equipo actual, estado y filtro «Sin equipo». Fila: nombre completo, categoría de temporada, equipos y situación. Ficha con cuatro bloques: Datos, Equipos, Familia y Acceso; Tesorería enlazada solo con su permiso. Escuela debe tener condición explícita; nunca inferir que todo menor es jugador competitivo.

Desde la ficha: editar datos, incorporar/retirar de equipo con fecha efectiva, vincular tutor y consultar situación de acceso. Reutilizar las acciones existentes con sus permisos, sin saltarse `manage_teams` al venir desde Jugadores. Subir foto desde dispositivo es propuesta para sustituir la URL técnica.

Distinguir «Dar de baja de un equipo», «Desactivar ficha» y «Retirar acceso a la cuenta». No usar una acción como sustituta de las tres. Mantener historial deportivo y económico.

## Flujo de alta propuesto

Datos mínimos → equipo actual o «Lo asignaré después» → vínculo familiar cuando proceda → resumen de ficha y acceso pendiente. Permitir completar en pasos, sin exigir cuenta personal a cada niño.

## Aceptación

1. El nuevo jugador aparece sin recargar manualmente y la edición muestra el nuevo nombre.
2. Un fallo de lectura genera error recuperable, no plantilla vacía.
3. Editar teléfono de Escuela conserva inscripción y pago.
4. Una persona en dos equipos muestra ambos; categoría estable al pasar de diciembre a enero.
5. Tutor sin rol deportivo no aparece como jugador por tener perfil.
6. No se pierden campos no incluidos en una edición.
7. Controles y búsqueda accesibles; nombre completo disponible aunque se trunque en la fila.

Dependencias: modelo de persona/jugador, temporada, permisos y vínculos. No introducir borrado físico de personas con historial.
