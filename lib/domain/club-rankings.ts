import { buildAttendanceOccurrences } from "./attendance-occurrences";
import type { Tables } from "@/types/database";
import {
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  safeInferCategory,
  type CategoryCode,
} from "./categories";
import { computeMvp } from "./mvp";
import { finalScore, playerTotals, sheetSchema, type LiveSheet } from "./live-match";

export type RankingsView = "season" | "streaks" | "legends";
export type RankingSubject = "players" | "teams";
export interface RankingIdentity {
  id: string;
  name: string;
  photo: string | null;
  category: CategoryCode | null;
  color: string;
  teamIds: string[];
}
export interface ClubRankingStats extends RankingIdentity {
  matches: number;
  goals: number;
  assists: number;
  exclusions: number;
  mvp: number;
  shots: number;
  shotGoals: number;
  saves: number;
  conceded: number;
  wins: number;
  draws: number;
  losses: number;
  attended: number;
  trainings: number;
  seasons: number;
  advancedMatches: number;
  goalRun: { current: number; best: number };
  assistRun: { current: number; best: number };
  mvpRun: { current: number; best: number };
  trainingRun: { current: number; best: number };
  winRun: { current: number; best: number };
  unbeatenRun: { current: number; best: number };
  contributionRun: { current: number; best: number };
  braceRun: { current: number; best: number };
  saveRun: { current: number; best: number };
  disciplineRun: { current: number; best: number };
  cleanRun: { current: number; best: number };
}
export interface ClubRankingRow {
  id: string;
  person: ClubRankingStats;
  position: number;
  value: number;
  display: string;
  unit: string;
  details: string[];
}
export interface ClubRankingMetric {
  id: string;
  label: string;
  unit: string;
  explanation: string;
}
export interface RankingMatchInput {
  id: string;
  team_id: string;
  scheduled_at: string;
  status: string;
  final_score_us: number | null;
  final_score_them: number | null;
}
export interface RankingStatInput {
  match_id: string;
  player_id: string;
  goals: number;
  exclusions: number;
  mvp: boolean;
}
export interface RankingTeamInput {
  id: string;
  label: string;
  color: string;
  category_code: string;
}
export interface RankingProfileInput {
  id: string | null;
  full_name: string | null;
  photo_url: string | null;
  birth_year: number | null;
}

export function emptyRankingStats(identity: RankingIdentity): ClubRankingStats {
  const run = () => ({ current: 0, best: 0 });
  return {
    ...identity,
    matches: 0,
    goals: 0,
    assists: 0,
    exclusions: 0,
    mvp: 0,
    shots: 0,
    shotGoals: 0,
    saves: 0,
    conceded: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    attended: 0,
    trainings: 0,
    seasons: 0,
    advancedMatches: 0,
    goalRun: run(),
    assistRun: run(),
    mvpRun: run(),
    trainingRun: run(),
    winRun: run(),
    unbeatenRun: run(),
    contributionRun: run(),
    braceRun: run(),
    saveRun: run(),
    disciplineRun: run(),
    cleanRun: run(),
  };
}
export function rankingPlayerTotals(sheet: LiveSheet, player: LiveSheet["players"][number]) {
  const totals = playerTotals(sheet, "us", player.cap);
  const shots = sheet.shootout?.shots ?? [];
  const taken = shots.filter(
    (s) => s.side === "us" && (s.playerId ? s.playerId === player.id : s.cap === player.cap),
  );
  const received = shots.filter(
    (s) => s.side === "them" && (s.keeperId ? s.keeperId === player.id : s.keeper === player.cap),
  );
  const scored = taken.filter((s) => s.outcome === "goal").length;
  const shotGoals = totals.goalsNormal + totals.goalsExtra + totals.goalsPenalty + scored;
  return {
    player_id: player.id,
    goals: totals.goals + scored,
    exclusions: totals.exclusions,
    assists: totals.assists,
    shotGoals,
    shots: shotGoals + totals.missedShots + taken.length - scored,
    saves: totals.saves + received.filter((s) => s.outcome === "save").length,
    conceded: totals.conceded + received.filter((s) => s.outcome === "goal").length,
    mvp: false,
    red: totals.red,
  };
}
export function advanceRankingRun(run: { current: number; best: number }, pass: boolean) {
  run.current = pass ? run.current + 1 : 0;
  run.best = Math.max(run.best, run.current);
}
export function buildClubRankingStats(input: {
  profiles: RankingProfileInput[];
  teams: RankingTeamInput[];
  rosters: Array<{ player_id: string; team_id: string }>;
  matches: RankingMatchInput[];
  sheets: Array<{ match_id: string; document: unknown }>;
  stats: RankingStatInput[];
  categoryYear: number;
}) {
  const teamById = new Map(input.teams.map((t) => [t.id, t]));
  const teams = input.teams
    .filter((t) => t.category_code !== "escuela")
    .map((t) => {
      const category =
        t.category_code in CATEGORY_LABELS ? (t.category_code as CategoryCode) : null;
      const suffix = t.label.match(/\b([AB])$/i)?.[1]?.toUpperCase();
      const name = category ? `${CATEGORY_LABELS[category]}${suffix ? ` ${suffix}` : ""}` : t.label;
      return emptyRankingStats({
        id: t.id,
        name,
        photo: null,
        category,
        color: t.color,
        teamIds: [t.id],
      });
    });
  const teamStats = new Map(teams.map((t) => [t.id, t]));
  const membership = new Map<string, string[]>();
  for (const roster of input.rosters) {
    const ids = membership.get(roster.player_id) ?? [];
    if (!ids.includes(roster.team_id)) ids.push(roster.team_id);
    membership.set(roster.player_id, ids);
  }
  const people = input.profiles
    .filter((p) => p.id)
    .map((p) => {
      const teamIds = membership.get(p.id!) ?? [];
      const fallback = teamById.get(teamIds[0] ?? "")?.category_code;
      const category =
        p.birth_year == null
          ? fallback && fallback in CATEGORY_LABELS
            ? (fallback as CategoryCode)
            : null
          : safeInferCategory(p.birth_year, input.categoryYear);
      return emptyRankingStats({
        id: p.id!,
        name: p.full_name ?? "Jugador",
        photo: p.photo_url,
        category,
        color: category ? CATEGORY_COLORS[category] : "#1657a8",
        teamIds,
      });
    });
  const players = new Map(people.map((p) => [p.id, p]));
  const sheets = new Map(input.sheets.map((s) => [s.match_id, s.document]));
  const statsByMatch = new Map<string, RankingStatInput[]>();
  for (const s of input.stats) {
    const records = statsByMatch.get(s.match_id) ?? [];
    records.push(s);
    statsByMatch.set(s.match_id, records);
  }
  let actaCount = 0;
  let legacyCount = 0;
  const matches = [...new Map(input.matches.map((m) => [m.id, m])).values()]
    .filter((m) => m.status === "played")
    .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at) || a.id.localeCompare(b.id));
  for (const match of matches) {
    const rawDocument = sheets.get(match.id);
    const parsed = rawDocument == null ? null : sheetSchema.safeParse(rawDocument);
    if (parsed && !parsed.success) throw new Error("No se ha podido validar un acta finalizada.");
    if (parsed?.success && parsed.data.phase !== "finished") continue;
    const sheet = parsed?.success ? parsed.data : null;
    const records = sheet
      ? sheet.players.map((p) => rankingPlayerTotals(sheet, p))
      : [...new Map((statsByMatch.get(match.id) ?? []).map((s) => [s.player_id, s])).values()].map(
          (s) => ({
            ...s,
            assists: 0,
            shots: 0,
            shotGoals: 0,
            saves: 0,
            conceded: 0,
            red: false,
          }),
        );
    const mvps = sheet
      ? new Set(computeMvp(records, { useAssists: true }).player_ids)
      : new Set(records.filter((s) => s.mvp).map((s) => s.player_id));
    const us = sheet ? finalScore(sheet, "us") : match.final_score_us;
    const them = sheet ? finalScore(sheet, "them") : match.final_score_them;
    if (sheet) actaCount++;
    else if (records.length) legacyCount++;
    for (const stat of records) {
      let player = players.get(stat.player_id);
      if (!player && sheet) {
        const p = sheet.players.find((p) => p.id === stat.player_id)!;
        const category = teamById.get(match.team_id)?.category_code as CategoryCode | undefined;
        player = emptyRankingStats({
          id: p.id,
          name: p.name,
          photo: null,
          category: category ?? null,
          color: category ? (CATEGORY_COLORS[category] ?? "#1657a8") : "#1657a8",
          teamIds: [match.team_id],
        });
        players.set(p.id, player);
      }
      if (!player) continue;
      if (!player.teamIds.includes(match.team_id)) player.teamIds.push(match.team_id);
      player.matches++;
      player.seasons = 1;
      player.goals += stat.goals;
      player.exclusions += stat.exclusions;
      player.mvp += Number(mvps.has(stat.player_id));
      advanceRankingRun(player.goalRun, stat.goals > 0);
      advanceRankingRun(player.mvpRun, mvps.has(stat.player_id));
      advanceRankingRun(player.braceRun, stat.goals >= 2);
      advanceRankingRun(player.disciplineRun, stat.exclusions === 0 && !stat.red);
      advanceRankingRun(player.contributionRun, stat.goals + stat.assists > 0);
      if (us != null && them != null) {
        player.wins += Number(us > them);
        player.draws += Number(us === them);
        player.losses += Number(us < them);
        advanceRankingRun(player.winRun, us > them);
        advanceRankingRun(player.unbeatenRun, us >= them);
      } else {
        player.winRun.current = 0;
        player.unbeatenRun.current = 0;
      }
      if (sheet) {
        player.advancedMatches++;
        player.assists += stat.assists;
        player.shotGoals += stat.shotGoals;
        player.shots += stat.shots;
        player.saves += stat.saves;
        player.conceded += stat.conceded;
        advanceRankingRun(player.assistRun, stat.assists > 0);
        advanceRankingRun(player.saveRun, stat.saves > 0);
      } else {
        player.assistRun.current = 0;
        player.saveRun.current = 0;
      }
    }
    const team = teamStats.get(match.team_id);
    if (team && us != null && them != null) {
      team.matches++;
      team.seasons = 1;
      team.goals += us;
      team.conceded += them;
      team.wins += Number(us > them);
      team.draws += Number(us === them);
      team.losses += Number(us < them);
      advanceRankingRun(team.winRun, us > them);
      advanceRankingRun(team.unbeatenRun, us >= them);
      advanceRankingRun(team.goalRun, us > 0);
      advanceRankingRun(team.cleanRun, them === 0);
    }
  }
  return {
    players: [...players.values()],
    teams,
    actaCount,
    legacyCount,
    playedCount: matches.length,
  };
}

export function applyRankingAttendance(
  players: ClubRankingStats[],
  sessions: Array<{
    id: string;
    team_id: string;
    joint_id: string | null;
    player_ids: string[] | null;
    scheduled_at: string;
  }>,
  entries: Array<{ session_id: string; player_id: string; present: boolean }>,
  rosters: Array<{ player_id: string; team_id: string; joined_at: string; left_at: string | null }>,
) {
  const playerById = new Map(players.map((p) => [p.id, p]));
  const occurrences = buildAttendanceOccurrences({
    sessions,
    rosters,
    entries,
    playerIds: players.map((p) => p.id),
  });
  for (const entry of occurrences.sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at))) {
    const player = playerById.get(entry.player_id);
    if (!player) continue;
    player.trainings++;
    player.attended += Number(entry.present);
    advanceRankingRun(player.trainingRun, entry.present);
  }
}

const metric = (
  id: string,
  label: string,
  unit: string,
  explanation: string,
): ClubRankingMetric => ({ id, label, unit, explanation });
export function clubRankingMetrics(
  view: RankingsView,
  subject: RankingSubject,
  attendance = false,
): ClubRankingMetric[] {
  if (subject === "teams") {
    if (view === "streaks")
      return [
        metric(
          "winRun",
          "Victorias seguidas",
          "partidos",
          "La racha se corta con un empate o una derrota.",
        ),
        metric(
          "unbeatenRun",
          "Sin perder",
          "partidos",
          "Victorias y empates consecutivos. Se corta con una derrota.",
        ),
        metric(
          "goalRun",
          "Partidos marcando",
          "partidos",
          "Partidos consecutivos del equipo con al menos un gol, incluida la tanda. Se corta al terminar sin goles.",
        ),
        metric(
          "cleanRun",
          "Portería a cero",
          "partidos",
          "Partidos consecutivos del equipo sin recibir goles, incluida la tanda. Se corta al recibir un gol.",
        ),
      ];
    return [
      metric(
        "wins",
        "Victorias",
        "victorias",
        "Partidos finalizados ganados, incluyendo las tandas de penaltis.",
      ),
      metric(
        "matches",
        "Partidos jugados",
        "partidos",
        "Número de partidos finalizados del equipo con resultado registrado.",
      ),
      metric(
        "goals",
        "Goles",
        "goles",
        "Marcadores finales de los partidos del equipo, incluyendo penaltis.",
      ),
      metric(
        "winPercent",
        "Porcentaje de victorias",
        "% victorias",
        "Victorias entre partidos finalizados. Mínimo 3 partidos.",
      ),
      metric(
        "goalDifference",
        "Diferencia de goles",
        "dif. goles",
        "Goles a favor menos goles en contra.",
      ),
      metric(
        "goalsAverage",
        "Goles por partido",
        "por partido",
        "Goles del equipo entre partidos finalizados. Mínimo 3 partidos.",
      ),
    ];
  }
  if (view === "streaks")
    return [
      metric(
        "goalRun",
        "Partidos marcando",
        "partidos",
        "Partidos consecutivos con goles entre aquellos con estadísticas del jugador.",
      ),
      metric(
        "assistRun",
        "Partidos asistiendo",
        "partidos",
        "Partidos consecutivos con al menos una asistencia registrada. Un partido sin asistencias o sin datos completos corta la racha.",
      ),
      metric(
        "mvpRun",
        "Partidos como MVP",
        "partidos",
        "Partidos consecutivos como MVP. Los MVP compartidos también cuentan.",
      ),
      metric(
        "braceRun",
        "Dos goles o más",
        "partidos",
        "Partidos consecutivos con al menos dos goles del jugador, incluida la tanda. Un partido con menos de dos corta la racha.",
      ),
      metric(
        "contributionRun",
        "Goles o asistencias",
        "partidos",
        "Partidos consecutivos con al menos un gol o una asistencia registrada, incluida la tanda. Un partido sin contribuciones registradas corta la racha.",
      ),
      metric(
        "saveRun",
        "Partidos con paradas",
        "partidos",
        "Partidos consecutivos con al menos una parada registrada, incluidas las tandas. Un partido sin paradas o sin datos completos corta la racha.",
      ),
      metric(
        "disciplineRun",
        "Sin expulsiones",
        "partidos",
        "Partidos consecutivos sin expulsiones, penaltis cometidos ni tarjeta roja. Cualquiera de esas sanciones corta la racha.",
      ),
      metric(
        "winRun",
        "Victorias seguidas",
        "partidos",
        "Partidos consecutivos ganados en los que el jugador tiene registro, incluida la tanda. Un empate o una derrota corta la racha.",
      ),
      metric(
        "unbeatenRun",
        "Sin perder",
        "partidos",
        "Partidos consecutivos sin perder en los que el jugador tiene registro. Un empate prolonga la racha y una derrota la corta.",
      ),
      ...(attendance
        ? [
            metric(
              "trainingRun",
              "Entrenamientos asistiendo",
              "entrenos",
              "Entrenamientos consecutivos asistiendo. Los entrenamientos sin revisar cuentan como asistencia provisional; una falta marcada corta la racha. Se excluyen cancelaciones, sesiones futuras y duplicados conjuntos.",
            ),
          ]
        : []),
    ];
  if (view === "legends")
    return clubRankingMetrics("season", subject, attendance).map((m) => ({
      ...m,
      explanation: m.id.startsWith("swim")
        ? "Todos los intentos registrados, sin repetir registros. Un jugador puede ocupar varios puestos. La categoría corresponde a la temporada de la marca."
        : `${m.explanation} Se suman las temporadas archivadas y la actual sin duplicarlas. Las medias y porcentajes se calculan sobre los totales acumulados, no promediando temporadas. Los datos que nunca se registraron no se inventan.`,
    }));
  return [
    metric(
      "goals",
      "Goles",
      "goles",
      "Goles del jugador en partidos finalizados, incluidos los goles de la tanda de penaltis.",
    ),
    metric("assists", "Asistencias", "asist.", "Asistencias anotadas en actas finalizadas."),
    metric(
      "matches",
      "Partidos jugados",
      "partidos",
      "Partidos finalizados en los que el jugador aparece en el registro deportivo. Cada partido cuenta una sola vez, aunque haya tanda.",
    ),
    metric(
      "exclusions",
      "Expulsiones",
      "expulsiones",
      "Total de expulsiones y penaltis cometidos registrados en partidos finalizados. Una tarjeta roja no suma una expulsión adicional.",
    ),
    metric(
      "contributions",
      "Goles + asistencias",
      "G + A",
      "Suma de goles y asistencias registrados.",
    ),
    metric(
      "goalsAverage",
      "Goles por partido",
      "por partido",
      "Goles entre partidos con registro del jugador. Mínimo 3 partidos.",
    ),
    metric(
      "shooting",
      "Eficacia de tiro",
      "% acierto",
      "Porcentaje de goles entre tiros registrados: goles y tiros fallados, incluidos todos los intentos de la tanda. Mínimo 5 tiros. Los goles antiguos sin registro de tiro se excluyen de ambos términos para no inventar eficacia.",
    ),
    metric(
      "mvp",
      "MVP",
      "MVP",
      "Número de partidos como MVP: más goles y asistencias, con menos expulsiones para desempatar. La tanda cuenta en los goles. Los MVP compartidos cuentan para todos los empatados. El porcentaje muestra qué parte de sus partidos fue MVP.",
    ),
    metric(
      "saves",
      "Paradas",
      "paradas",
      "Paradas registradas en partidos finalizados, incluidos los penaltis parados en la tanda. Un tiro fuera o al palo no cuenta como parada.",
    ),
    metric(
      "swim50",
      "Nado · 50 m",
      "50 m",
      "Mejor marca o último intento registrado de cada jugador.",
    ),
    metric(
      "swim100",
      "Nado · 100 m",
      "100 m",
      "Mejor marca o último intento registrado de cada jugador.",
    ),
    ...(attendance
      ? [
          metric(
            "attendance",
            "Asistencia a entrenamientos",
            "% asistencia",
            "Asistencias entre entrenamientos transcurridos. Sin revisar cuenta como asistencia provisional hasta que se marque una falta. Se excluyen cancelaciones, sesiones futuras y duplicados conjuntos. Mínimo 3 entrenamientos.",
          ),
        ]
      : []),
  ];
}

export function clubRankingValue(
  person: ClubRankingStats,
  id: string,
  order: "current" | "best" = "current",
): number | null {
  if (id.endsWith("Run")) {
    const run =
      person[
        id as
          | "goalRun"
          | "assistRun"
          | "mvpRun"
          | "trainingRun"
          | "winRun"
          | "unbeatenRun"
          | "braceRun"
          | "contributionRun"
          | "saveRun"
          | "disciplineRun"
          | "cleanRun"
      ];
    return run?.[order] ?? null;
  }
  if (id === "goalsAverage") return person.matches >= 3 ? person.goals / person.matches : null;
  if (id === "shooting") return person.shots >= 5 ? (person.shotGoals * 100) / person.shots : null;
  if (id === "winPercent") return person.matches >= 3 ? (person.wins * 100) / person.matches : null;
  if (id === "attendance")
    return person.trainings >= 3 ? (person.attended * 100) / person.trainings : null;
  if (id === "contributions") return person.goals + person.assists;
  if (id === "goalDifference") return person.goals - person.conceded;
  if (["matches", "goals", "assists", "mvp", "wins", "saves", "exclusions"].includes(id))
    return person[id as "matches" | "goals" | "assists" | "mvp" | "wins" | "saves" | "exclusions"];
  return null;
}
export function rankingNumber(value: number, digits = 0) {
  return new Intl.NumberFormat("es-ES", { maximumFractionDigits: digits }).format(value);
}
export function clubRankingDetails(
  person: ClubRankingStats,
  id: string,
  subject: RankingSubject,
  view: RankingsView,
): string[] {
  if (view === "streaks") {
    const run =
      person[
        id as
          | "goalRun"
          | "assistRun"
          | "mvpRun"
          | "trainingRun"
          | "winRun"
          | "unbeatenRun"
          | "braceRun"
          | "contributionRun"
          | "saveRun"
          | "disciplineRun"
          | "cleanRun"
      ];
    return [`Actual: ${run?.current ?? 0}`, `Mejor: ${run?.best ?? 0}`];
  }
  if (subject === "teams")
    return [
      `${person.matches} partidos`,
      `${person.wins} V · ${person.draws} E · ${person.losses} D`,
    ];
  if (id === "attendance") return [`${person.attended} asistidos`, `${person.trainings} listas`];
  if (id === "shooting") return [`${person.shotGoals} goles`, `${person.shots} tiros`];
  if (id === "mvp")
    return [
      `${person.matches} partidos`,
      `${rankingNumber(person.matches ? (person.mvp * 100) / person.matches : 0, 1)} % como MVP`,
    ];
  if (id === "matches")
    return [
      `${person.goals} goles`,
      `${rankingNumber(person.matches ? person.goals / person.matches : 0, 2)} goles/partido`,
    ];
  if (id === "exclusions")
    return [
      `${person.matches} partidos`,
      `${rankingNumber(person.matches ? person.exclusions / person.matches : 0, 2)} por partido`,
    ];
  if (id === "assists")
    return [
      `${person.advancedMatches} partidos`,
      `${rankingNumber(person.advancedMatches ? person.assists / person.advancedMatches : 0, 2)} asistencias/partido`,
    ];
  if (id === "contributions") return [`${person.goals} goles`, `${person.assists} asistencias`];
  if (id === "saves") return [`${person.conceded} recibidos`, `${person.advancedMatches} partidos`];
  return [
    `${person.matches} partidos`,
    `${rankingNumber(person.matches ? person.goals / person.matches : 0, 2)} goles/partido`,
  ];
}
export function rankClubStats(
  people: ClubRankingStats[],
  metric: ClubRankingMetric,
  options: {
    subject: RankingSubject;
    view: RankingsView;
    order?: "current" | "best";
    category?: string;
    team?: string;
  },
): ClubRankingRow[] {
  const digits = ["shooting", "winPercent", "attendance"].includes(metric.id)
    ? 1
    : metric.id === "goalsAverage"
      ? 2
      : 0;
  const values = people
    .filter(
      (p) =>
        (!options.category || p.category === options.category) &&
        (!options.team || p.teamIds.includes(options.team)),
    )
    .map((person) => ({ person, value: clubRankingValue(person, metric.id, options.order) }))
    .filter(
      (item): item is { person: ClubRankingStats; value: number } =>
        item.value != null &&
        (!["assists", "saves", "assistRun", "saveRun"].includes(metric.id) ||
          item.person.advancedMatches > 0) &&
        (metric.id === "attendance" || metric.id === "trainingRun"
          ? item.person.trainings > 0
          : item.person.matches > 0),
    );
  const sorted = values
    .map((v) => ({ ...v, value: Number(v.value.toFixed(digits)) }))
    .sort(
      (a, b) =>
        b.value - a.value ||
        a.person.name.localeCompare(b.person.name, "es") ||
        a.person.id.localeCompare(b.person.id),
    );
  let previousValue: number | null = null;
  let position = 0;
  return sorted.map((entry, index) => {
    if (entry.value !== previousValue) position = index + 1;
    previousValue = entry.value;
    return {
      id: entry.person.id,
      person: entry.person,
      position,
      value: entry.value,
      display: rankingNumber(entry.value, digits),
      unit:
        entry.value === 1
          ? ((
              {
                partidos: "partido",
                goles: "gol",
                victorias: "victoria",
                paradas: "parada",
                expulsiones: "expulsión",
                entrenos: "entreno",
              } as Record<string, string>
            )[metric.unit] ?? metric.unit)
          : metric.unit,
      details: clubRankingDetails(entry.person, metric.id, options.subject, options.view),
    };
  });
}

export function mergeRankingHistory(
  players: ClubRankingStats[],
  history: Array<
    Pick<
      Tables<"historical_player_stats">,
      | "profile_id"
      | "profile_name"
      | "season_id"
      | "category_code"
      | "matches_played"
      | "goals"
      | "exclusions"
      | "mvp_count"
    > & { ranking_totals?: unknown; trainings_attended?: number; trainings_total?: number }
  >,
  profiles: RankingProfileInput[],
  categoryYear: number,
) {
  const byId = new Map(players.map((p) => [p.id, p]));
  const profileById = new Map(profiles.map((p) => [p.id, p]));
  const seen = new Set<string>();
  for (const record of history) {
    const key = `${record.profile_id}:${record.season_id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    let player = byId.get(record.profile_id);
    if (!player) {
      const profile = profileById.get(record.profile_id);
      const category =
        profile?.birth_year != null
          ? safeInferCategory(profile.birth_year, categoryYear)
          : (record.category_code as CategoryCode);
      player = emptyRankingStats({
        id: record.profile_id,
        name: profile?.full_name ?? record.profile_name,
        photo: profile?.photo_url ?? null,
        category,
        color: category ? (CATEGORY_COLORS[category] ?? "#1657a8") : "#1657a8",
        teamIds: [],
      });
      byId.set(player.id, player);
      players.push(player);
    }
    const totals =
      record.ranking_totals != null && typeof record.ranking_totals === "object"
        ? (record.ranking_totals as Record<string, unknown>)
        : null;
    const value = (key: string, fallback = 0) => {
      const number = totals?.[key];
      return typeof number === "number" && Number.isSafeInteger(number) && number >= 0
        ? number
        : fallback;
    };
    player.matches += value("matches", record.matches_played);
    player.goals += value("goals", record.goals);
    player.exclusions += value("exclusions", record.exclusions);
    player.mvp += value("mvp", record.mvp_count);
    player.assists += value("assists");
    player.shots += value("shots");
    player.shotGoals += value("shotGoals");
    player.saves += value("saves");
    player.conceded += value("conceded");
    player.advancedMatches += value("advancedMatches");
    player.attended += record.trainings_attended ?? 0;
    player.trainings += record.trainings_total ?? 0;
    player.seasons++;
  }
}
