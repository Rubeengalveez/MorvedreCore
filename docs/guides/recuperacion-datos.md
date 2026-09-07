# Copias y recuperación de datos

Responsable técnico: administración del proyecto. Estado a 5 de septiembre de 2026: exportador corregido y probado con datos sintéticos; restauración integral pendiente de ensayo.

## Qué contiene cada exportación

`pnpm db:backup` genera un JSON local de las 41 tablas públicas enumeradas en `scripts/lib/backup-data.mjs`. Incluye datos personales, solicitudes, preferencias y suscripciones push: debe tratarse como información privada. No debe adjuntarse a incidencias, chats ni repositorios.

La lectura usa páginas ordenadas por clave primaria y comprueba el recuento exacto. Si cambia el número de filas, falta una página o aparece una clave repetida, falla. No detecta todas las modificaciones simultáneas que mantienen el mismo número de filas; realizarla en una ventana sin escrituras. Para una instantánea consistente de toda la base hace falta un respaldo de Postgres.

El JSON no contiene usuarios ni credenciales de Auth, archivos de Storage, secuencias privadas, funciones, políticas o configuración externa. Es un complemento del respaldo integral, no permite reconstruir por sí solo todo el servicio.

## Ejecución y verificación

1. Confirmar el proyecto de origen y la ventana sin cambios. Comprobar que el manifiesto coincide con todas las tablas públicas actuales.
2. Ejecutar `pnpm test:backup` para validar el exportador sin credenciales ni datos reales.
3. Ejecutar `pnpm db:backup` con las credenciales de servidor del proyecto. Si falla, no considerar que hay una copia nueva válida.
4. Ejecutar `node scripts/verify-backup.mjs backups/NOMBRE.json` sobre el archivo concreto. Exige formato v1.2, las 41 tablas, claves y recuentos correctos y checksum SHA-256.
5. Con autorización para exportar al destino privado y aplicar retención, ejecutar `node scripts/backup-db.mjs --upload`. Verifica el objeto descargado antes de eliminar archivos de copia con más de 90 días. No imprime registros ni credenciales.
6. Conservar la evidencia de fecha, tablas, recuentos, checksum y resultado del job. Los formatos anteriores se conservan, pero no pasan la verificación de cobertura v1.2.

SHA-256 detecta alteraciones respecto al checksum; no cifra el archivo ni prueba autenticidad frente a alguien que pueda cambiar también el checksum. La privacidad depende del control de acceso al equipo y al bucket. Una copia guardada en el mismo proyecto tampoco cubre su pérdida completa.

## Ensayo de recuperación integral

No se ha completado este ensayo. Antes de autorizar uso operativo sin supervisión:

1. Preparar un destino aislado y vacío, sin correo, push ni cron que contacten con miembros. Registrar explícitamente origen y destino para evitar restaurar sobre el club.
2. Obtener un respaldo transaccional de Postgres que incluya los datos necesarios de Auth, esquema público y privado, junto con migraciones y configuración reproducible. Exportar por separado los archivos de Storage: las filas de metadatos no contienen los archivos.
3. Restaurar usando el procedimiento oficial correspondiente al formato y versión del respaldo. Mantener UUID de Auth y perfiles, dependencias de claves foráneas y secuencias. No importar las tablas JSON alfabéticamente: el manifiesto es de lectura, no un orden de restauración.
4. Comparar tablas, recuentos, claves foráneas, funciones y políticas. Validar acceso por roles y las relaciones familiares, equipos, asistencia, actas, pedidos y tesorería. Comprobar que los archivos se abren.
5. Probar inicio de sesión y flujos críticos con cuentas controladas en el destino aislado. Registrar tiempo de recuperación, pérdida de datos máxima y cualquier paso manual.
6. Dar el ensayo por correcto solo tras esas comprobaciones. No sobrescribir el origen para probar una recuperación.

Hasta disponer de ese resultado, el estado correcto es «integridad del archivo probada; recuperación integral pendiente».
