# Resumen de Fase 3 — Estadísticas y rankings

> Estado al cierre: **completada, compilando, validada**. Pendiente aplicar las 2 migraciones nuevas en Supabase cloud.

## Logros

### Base de datos (2 migraciones nuevas, 0022-0023)

- `0022_ranking_snapshots`: tabla materializada con `scope` (`season`/`category`/`team`) y `scope_key` para que un jugador aparezca en todos los rankings relevantes. 5 índices (uno por métrica común). RLS abierto a SELECT para autenticados, admin/all para mutaciones.
- `0023_opponent_stats`: agregados por `(season, team, opponent)` con `matches_played, wins, draws, losses, goals_for, goals_against, last_match_at`. Trigger `refresh_opponent_stats` se dispara en `INSERT/UPDATE OF status, final_score_us, final_score_them` sobre `matches`.

> La migración `0021_profiles_pii_restrict.sql` existía como `0019` (duplicada) y se renombró.

### Funciones de dominio

- `lib/domain/rankings.ts` (puro, 100% testeable):
  - `computeRanking(players, options)`: ordena con empates (1,1,3), marca top 3, filtra por scope, soporta `min_trainings_total`.
  - `findMyPosition(ranking, playerId)`: fila + deltas con vecinos.
  - `computeAttendanceStreak(sessions, attendance)`: racha ordenada cronológicamente hacia atrás, ignorando canceladas.
  - `computeOpponentHistory(rows, sort)`: enriquece con `win_pct`, `goal_diff` y ordena.
  - `opponentVerdict(history)`: "bestia negra" / "víctima preferida" / "equilibrado".
- `lib/domain/stats.ts`: `PlayerStats.attendance_streak` añadido; `computePlayerStats` lo calcula en orden inverso cronológico.

### Server actions

- `server/actions/admin/rankings.ts`:
  - `recomputePlayerRanking(playerId, seasonId)`: snapshot para los 3 scopes.
  - `recomputeSeasonRanking(seasonId)`: bulk admin-only.
  - `unvalidateMatchStats(matchId, reason)`: abre el acta y refresca los rankings.
  - `bulkUnvalidateMatchStats(matchIds, reason)`: para reabrir varias actas a la vez.
- `server/actions/admin/matches.ts`: `recordMatchStat` y `validateMatchStats` ahora disparan `recomputeSnapshotForPlayer` para mantener rankings al día.

### Server queries

- `server/queries/rankings.ts`:
  - `getRankings({ season_id, scope, metric, my_player_id, min_trainings_total })`: lista de jugadores rankeados, mi posición con deltas, total.
  - `getRankingsMeta(activeSeasonId?)`: temporada, categorías con nº de jugadores, equipos, lista de temporadas disponibles.
  - `getOpponentHistory({ season_id, team_id?, limit? })`: últimos rivales.

### Vistas UI

- **`/rankings` (nueva)**: server component que parsea searchParams (`scope`, `metric`) y delega en `RankingsContent` (client) para los tabs. Tabs de scope (Club/Categoría/Equipo) y de métrica (Goles/Excl/MVP/Asist/Racha).
  - `TopThreeCards` con `PichichiPodium` (corona dorada al #1).
  - `MyPositionCard` con deltas hacia #1 y hacia el siguiente.
  - `RankingRow` densa con `CapTile`.
  - `OpponentsMini` con `opponentVerdict` (bestia negra/víctima).
  - `EmptyState` motivador.
- **`/profile` (modificada)**: nuevo bloque "Tu posición en los rankings" con `PlayerRankingSummary` (2 `RankingMiniCard` para goles y asistencia, solo para player).
- **`/team/[id]` (modificada)**: nuevo bloque "Top del equipo" con `TopMetricCard` para goleadores y MVPs (solo si hay stats en la temporada).
- **`components/layout/bottom-nav.tsx`**: 6 tabs. Reemplazado "Tienda" (placeholder) por "Rankings" con pictograma `Trofeo`. Tienda accesible por URL directa.

### Componentes UI nuevos

- `components/ui/cap-tile.tsx` — Dorsal cuadrado con color de equipo, 3 tamaños, ring animado si `isMe`.
- `components/ui/pool-scoreboard.tsx` — Marcador con franjas laterales de equipo, modos `preview`/`live`/`final`, MVP opcional.
- `components/ui/pichichi-podium.tsx` — Top 3 escalonado con corona SVG al #1.
- `components/ui/medal.tsx` — Medalla 1/2/3 con cinta.
- `components/ui/eyebrow.tsx` — Eyebrow tipográfico reutilizable (text-eyebrow).
- `components/ui/pictogram-badge.tsx` — Badge circular con pictograma.
- `components/ui/lane-pattern.tsx` — Fondo con 8 carriles verticales (LanePattern).
- `components/ui/exclusion-timer.tsx` — Barra de cuenta atrás 20s con color de equipo.

### Pictogramas nuevos

- `components/brand/pictograms/trofeo.tsx` (Rankings)
- `components/brand/pictograms/familia.tsx` (Admin Familias)
- `components/brand/pictograms/personal.tsx` (Admin Personal)
- `components/brand/pictograms/file-up.tsx` (Admin Importar)

## Validación

```
lint:        0 errores, 0 warnings
typecheck:   0 errores
tests:       359 passed · 22 skipped · 0 failed (381 totales)
build:       28 rutas, 0 errores
```

### Tests nuevos (Fase 3)

| Suite                               | Tests    | Cubre                                                                                                                                     |
| ----------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `rankings.test.ts`                  | 34       | computeRanking (sort/empates/top 3/scope/min_trainings), findMyPosition, computeAttendanceStreak, computeOpponentHistory, opponentVerdict |
| `admin-actions.test.ts` (extendido) | 94 (+12) | recomputeRankingSchema, unvalidateMatchStatsSchema, bulkUnvalidateMatchStatsSchema                                                        |
| `stats.test.ts` (extendido)         | 9        | attendance_streak calculado en orden cronológico inverso                                                                                  |

**Total: +46 tests en Fase 3. Total proyecto: 381 tests (22 skip sin env Supabase).**

## Cómo probar

1. **Aplicar las 2 migraciones** (ver bloque de SQL en chat):
   - `0022_ranking_snapshots.sql`
   - `0023_opponent_stats.sql`
2. Login como admin.
3. Ir a `/admin/matches` → crear partido → convocar jugadores → cerrar acta con goles/exclusiones/MVP → validar.
4. **Como player** (login con un jugador convocado): ir a `/rankings`. Verás tu posición, el podio del top 3 y los rivales recientes. Cambia entre Club/Categoría/Equipo y entre Goles/Excl/MVP/Asist/Racha.
5. **En `/profile`**: bloque "Tu posición en los rankings" con tu puesto en goles y asistencia.
6. **En `/team/[id]`**: bloque "Top del equipo" con los 3 goleadores y 3 MVPs.

## Auditoría resuelta

- ✅ `setMyCallupStatus` rechaza cambios en partidos jugados/cancelados.
- ✅ `recordMatchStat` rechaza stats de jugadores no convocados.
- ✅ `recentActivity` IDs únicos.
- ✅ Calendario: `agendaStartIso/EndIso` navegan con `yearMonth`, `window.location.href` → `router.push()`, `<a href>` → `<Link>`.
- ✅ Form de Tienda: maneja submit y muestra feedback.
- ✅ Contraste WCAG en badges `bg-action`.
- ✅ Logo: 2.13 MB → 119 KB (WebP).
- ✅ Migración 0019 duplicada renombrada a 0021.
- ✅ Dependencias transitivas declaradas (`cva`, `lucide-react`, `react-hook-form`).
- ✅ 0 warnings de lint.

## Pendiente

- Push notifications reales (Fase 9 polish).
- Desglose de exclusiones por tipo (Fase 8 / refino).
- Página "Leyendas" (Fase 8 — sin datos históricos).
- Racha de equipo (no solo de player) — solicitada por el usuario, en backlog.
