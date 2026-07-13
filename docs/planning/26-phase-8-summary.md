# Resumen Fase 8 — Históricos y leyendas

> Estado: completada en el repositorio, validada con typecheck, tests locales, lint y build de producción.

## Entregado

- Migración `20260711154016_phase_8_history.sql` con:
  - `historical_player_stats` append-only y estadísticas por jugador/temporada.
  - `historical_team_matchups` con rivales normalizados por equipo y temporada.
  - `audit_log` y triggers para perfiles, roles, temporadas y cierres de tesorería.
  - RLS, permisos explícitos e índices para filtros, joins y rankings históricos.
- Función PostgreSQL `archive_season`:
  - autenticación admin dentro de la función;
  - ejecución transaccional y bloqueo contra dobles cierres;
  - validación de partidos, resultados y actas;
  - generación de históricos desde los datos fuente validados;
  - creación y activación de la temporada siguiente;
  - clonación de equipos, staff y roles scoped;
  - traslado de plantillas tras recalcular la categoría derivada.
- Server Action `archiveSeason` validada con Zod y confirmación por nombre de temporada.
- Flujo admin mobile-first "Iniciar nueva temporada" en `/admin/seasons`, con resultado resumido al terminar.
- Página `/legends` con:
  - top histórico de goles, partidos, MVP y asistencia ponderada;
  - temporada actual incluida en vivo;
  - mejores cruces y bestias negras históricas;
  - navegación accesible desde Rankings y estado activo en la bottom nav.
- Funciones puras de dominio para sumar históricos, resolver empates, normalizar rivales y clasificarlos.

## Seguridad y consistencia

- Las tablas históricas no tienen políticas de escritura para usuarios autenticados.
- La función privilegiada usa `security definer`, `search_path` vacío, permisos revocados a `public`/`anon` y una comprobación interna de administrador.
- La transición completa se revierte si falla cualquier paso.
- Los históricos referencian temporadas, equipos y perfiles con borrado restringido para evitar perder trazabilidad.
- Los datos actuales no se borran: la temporada, equipos, partidos, entrenamientos y actas anteriores permanecen consultables.

## Verificación

```text
TypeScript: tsc --noEmit — correcto
Tests dirigidos Fase 8: 30/30 — correctos
Tests unitarios completos + migración Fase 8: 330/330 — correctos
ESLint: 0 errores — 35 avisos preexistentes fuera de la fase
Next.js production build: correcto, ruta /legends incluida
```

La aplicación de la migración sobre el proyecto Supabase y la prueba de cierre con una copia de datos reales deben hacerse en el flujo habitual de despliegue antes de usar el botón en producción.
