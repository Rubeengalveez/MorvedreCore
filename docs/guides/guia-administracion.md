# Guía rápida para administración — Club Waterpolo Morvedre

Guía operativa para la secretaría técnica y administración global del club (Eva, Rubén y dirección deportiva).

---

## 1. Solicitudes de acceso y altas

Cuando un socio, padre o jugador nuevo rellena el formulario de solicitud de acceso:

1. Entra en **Administración → Solicitudes de acceso**.
2. Revisa los datos de la persona solicitante (nombre, correo, teléfono, rol y si declara tener hijos en el club).
3. **Aprobación segura**:
   - Pulsa en **Aprobar**.
   - El sistema crea la cuenta, asigna el rol (familiar, jugador, etc.) y vincula los hijos si existen. Si falla una alta nueva, intenta retirar la cuenta creada.
   - Si el correo ya existía, la aprobación puede emitir una contraseña temporal nueva después de guardar el perfil y sus vínculos. Comunícala por un canal privado y explica el cambio obligatorio al entrar.

---

## 2. Gestión de equipos y plantilla

1. En **Administración → Equipos**, puedes consultar los 7 equipos de competición federada y el grupo de Escuela.
2. Para cada equipo puedes:
   - Asignar el entrenador titular (Vega, Vitaliy, Rubén).
   - Asignar delegados de equipo/mesa autorizados a gestionar actas y partidos.
   - Añadir o retirar jugadores de la plantilla (_roster_).
   - Recuerda: la regla del club permite alinear a un jugador en su categoría natural o hasta una categoría superior.

---

## 3. Importación de datos desde Excel

1. Para importar jugadores, entra en **Administración → Jugadores → Importar**.
2. Prepara un Excel con las columnas que muestra la pantalla: `nombre_completo`, `ano_nacimiento`, `dorsal`, `nombre_equipo`, `email_tutor`, `nombre_tutor`, `telefono_tutor` y `relacion`.
3. Selecciona el archivo y pulsa **Previsualizar**. Revisa los errores, coincidencias y altas propuestas.
4. Confirma solo tras revisar el resumen. Al terminar, comprueba el resultado de la importación; no supongas que todas las filas se han importado si aparecen errores.

---

## 4. Cambio de temporada y nuevo curso

1. El cambio de temporada se gestiona de forma planificada. Para preparar el curso `2026/2027`:
   - Se ejecuta el script de preparación (`node scripts/prepare-2026-2027-season.mjs --dry-run` para simular, y `--apply` para generar los 8 equipos del nuevo año).
   - La temporada actual sigue activa hasta que se decida su cambio oficial (`--activate`).
2. Todas las estadísticas, actas y datos históricos de temporadas pasadas quedan archivados y consultables en el módulo de Leyendas e Históricos sin pérdida de información.

---

## 5. Copias de seguridad (Backups) y seguridad

- El exportador cubre las 41 tablas públicas actuales, con lectura paginada y verificación SHA-256. El workflow semanal requiere credenciales y una ejecución exitosa comprobada.
- Para verificar manualmente el estado de la última copia en cualquier momento:
  ```bash
  node scripts/verify-backup.mjs
  ```
- Este comando comprueba el manifiesto, los recuentos y el checksum del archivo. No demuestra que toda la aplicación sea restaurable: Auth y los archivos se respaldan por separado. Sigue el [procedimiento de recuperación](recuperacion-datos.md).
