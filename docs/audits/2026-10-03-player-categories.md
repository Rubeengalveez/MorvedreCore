# Categorías por temporada y edición de jugadores

Fecha: 3 de octubre de 2026.

## Causa

Los límites de `inferCategory` estaban desplazados dos años respecto al año inicial de temporada. Había además lectores de convocatorias, rankings, rachas y cabecera que usaban el año del calendario. La categoría del formulario no coincidía con los ejemplos confirmados por Rubén.

## Corrección

| Nacimiento | 2025/2026 | 2026/2027           |
| ---------- | --------- | ------------------- |
| 2010       | Cadete    | Juvenil, primer año |
| 2011       | Cadete    | Cadete, segundo año |

La inferencia se mantiene derivada, sin añadir una categoría almacenada al perfil. Las llamadas usan el año de inicio de la temporada correspondiente. Natación, cuyo dato es el año final, resta uno. La alternativa sin temporada comienza en septiembre.

Se retiran Género y Notas internas del formulario y del payload. No se borran sus datos históricos ni se modifican plantillas automáticamente.

La migración `20261003134441_correct_player_category_season_cohorts.sql`, aplicada en Supabase, corrige los límites del registro y archivo de temporada y las claves de categoría de los snapshots existentes. Mantiene permisos y controles de autorización de ambas funciones. Las cifras de los rankings no se recalculan en esta migración.

## Verificación

- Los cuatro ejemplos de Rubén fallaron antes de la corrección.
- 294 pruebas correctas en 14 archivos: límites de categorías, cambio de temporada, equipos, formularios, payload, altas, tienda, natación, convocatoria y rankings.
- Prueba SQL transaccional: alta de las dos edades Cadete en su categoría, rechazo como Infantil y comprobación de que la función de registro no se expone a anon ni authenticated. Todo revertido con rollback.
- Cero snapshots agrupados por una categoría discordante tras la migración.
- Navegador local: edición de un nacido en 2010 muestra Cadete en la temporada configurada 2025/2026; Otros datos no contiene género ni notas. No se guarda ninguna ficha real.
- TypeScript y ESLint de los archivos afectados sin errores.
- Los asesores de seguridad mantienen exactamente los avisos previos. No hay nuevos avisos por esta migración: [tablas cerradas sin políticas](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy), [funciones anteriores con SECURITY DEFINER](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable) y [protección de contraseñas filtradas](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

Evidencia: `evidence/player-categories-2026-10-03/editor.png`.
