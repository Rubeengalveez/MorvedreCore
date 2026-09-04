# Guía rápida para administración — Club Waterpolo Morvedre

Guía operativa para la secretaría técnica y administración global del club (Eva, Rubén y dirección deportiva).

---

## 1. Solicitudes de acceso y altas

Cuando un socio, padre o jugador nuevo rellena el formulario de solicitud de acceso:

1. Entra en **Administración → Solicitudes de acceso**.
2. Revisa los datos de la persona solicitante (nombre, correo, teléfono, rol y si declara tener hijos en el club).
3. **Aprobación segura**:
   - Pulsa en **Aprobar**.
   - El sistema crea la cuenta de usuario en el sistema de autenticación de forma segura y transaccional, asigna el rol (familiar, jugador, etc.) y vincula los hijos si existen.
   - Si se detecta que el correo ya existía, el sistema asocia el nuevo rol o vínculo familiar sin machacar ni resetear las contraseñas previas del usuario.

---

## 2. Gestión de equipos y plantilla

1. En **Administración → Equipos**, puedes consultar los 7 equipos de competición federada y el grupo de Escuela.
2. Para cada equipo puedes:
   - Asignar el entrenador titular (Vega, Vitaliy, Rubén).
   - Asignar delegados de equipo/mesa autorizados a gestionar actas y partidos.
   - Añadir o retirar jugadores de la plantilla (*roster*).
   - Recuerda: la regla del club permite alinear a un jugador en su categoría natural o hasta una categoría superior.

---

## 3. Importación de datos desde Excel

1. Si necesitas dar de alta o actualizar en bloque jugadores o familias al inicio de temporada, entra en **Administración → Importar**.
2. Descarga la plantilla oficial en Excel.
3. Rellena las columnas (nombre, apellidos, DNI, fecha de nacimiento, número de gorro, categoría, emails y teléfonos).
4. Sube el archivo: la app valida los datos antes de escribir nada, mostrando un resumen de altas nuevas y actualizaciones para que confirmes los cambios.

---

## 4. Cambio de temporada y nuevo curso

1. El cambio de temporada se gestiona de forma planificada. Para preparar el curso `2026/2027`:
   - Se ejecuta el script de preparación (`node scripts/prepare-2026-2027-season.mjs --dry-run` para simular, y `--apply` para generar los 8 equipos del nuevo año).
   - La temporada actual sigue activa hasta que se decida su cambio oficial (`--activate`).
2. Todas las estadísticas, actas y datos históricos de temporadas pasadas quedan archivados y consultables en el módulo de Leyendas e Históricos sin pérdida de información.

---

## 5. Copias de seguridad (Backups) y seguridad

- El sistema genera copias de seguridad automáticas de las 30 tablas de la base de datos con verificación de integridad criptográfica SHA-256.
- Para verificar manualmente el estado de la última copia en cualquier momento:
  ```bash
  node scripts/verify-backup.mjs
  ```
- Este comando comprueba los checksums y confirma que todos los registros de jugadores, partidos, entrenamientos y tesorería están íntegros y restaurables.
