import { describe, expect, it } from "vitest";
import {
  applyRankingAttendance,
  buildClubRankingStats,
  clubRankingMetrics,
  clubRankingDetails,
  clubRankingValue,
  emptyRankingStats,
  mergeRankingHistory,
  rankClubStats,
  rankingPlayerTotals,
} from "@/lib/domain/club-rankings";
import { sheetSchema, type LiveSheet, type MatchEvent } from "@/lib/domain/live-match";

const playerId = "10000000-0000-4000-8000-000000000001";
const secondId = "10000000-0000-4000-8000-000000000002";
const profiles = [
  { id: playerId, full_name: "Álex García", birth_year: 2011, photo_url: "/brand/logo.webp" },
  { id: secondId, full_name: "Beatriz Pérez", birth_year: 2010, photo_url: null },
];
const teams = [
  { id: "t1", label: "Morvedre Cadete A", category_code: "cadete", color: "#1E5AA8" },
  { id: "t2", label: "Morvedre Juvenil", category_code: "juvenil", color: "#DC2626" },
];
let eventId = 0;
function event(kind: MatchEvent["kind"], overrides: Partial<MatchEvent> = {}): MatchEvent {
  return {
    id: `20000000-0000-4000-8000-${String(++eventId).padStart(12, "0")}`,
    side: "us",
    cap: 2,
    kind,
    period: 1,
    keeper: null,
    deleted: false,
    ...overrides,
  };
}
function sheet(events: MatchEvent[] = []): LiveSheet {
  return {
    version: 1,
    players: [
      { id: playerId, cap: 2, name: "Álex García" },
      { id: secondId, cap: 3, name: "Beatriz Pérez" },
    ],
    opponentCaps: [1, 2, 3],
    periods: 4,
    period: 4,
    phase: "finished",
    keeper: null,
    events,
    baseline: [],
    baselineThem: 0,
  };
}
function match(id = "m1", day = "01", team_id = "t1") {
  return {
    id,
    team_id,
    scheduled_at: `2026-06-${day}T18:00:00Z`,
    status: "played",
    final_score_us: 2,
    final_score_them: 1,
  };
}
function input() {
  return {
    profiles,
    teams,
    rosters: [
      { player_id: playerId, team_id: "t1" },
      { player_id: playerId, team_id: "t2" },
    ],
    matches: [match()],
    sheets: [] as Array<{ match_id: string; document: unknown }>,
    stats: [{ match_id: "m1", player_id: playerId, goals: 7, exclusions: 0, mvp: true }],
    categoryYear: 2025,
  };
}
function person(id: string, goals: number, matches = 4) {
  return {
    ...emptyRankingStats({
      id,
      name: id,
      photo: null,
      category: "cadete",
      color: "#1E5AA8",
      teamIds: ["t1"],
    }),
    goals,
    matches,
  };
}

describe("clasificaciones desde partidos y actas", () => {
  it("prioriza el acta sin sumar estadísticas manuales ni eventos borrados", () => {
    const data = input();
    data.matches.push(match());
    data.sheets = [
      {
        match_id: "m1",
        document: sheet([
          event("goal"),
          event("goal", { deleted: true }),
          event("assist", { cap: 3 }),
          event("shot_out"),
        ]),
      },
    ];
    const result = buildClubRankingStats(data);
    expect(result.players[0]).toMatchObject({
      matches: 1,
      goals: 1,
      shots: 2,
      assists: 0,
      advancedMatches: 1,
      mvp: 1,
      photo: "/brand/logo.webp",
    });
    expect(result.players[1]).toMatchObject({ assists: 1, mvp: 1 });
    expect(result).toMatchObject({ actaCount: 1, legacyCount: 0 });
    expect(result.teams[0]).toMatchObject({ goals: 1, wins: 1, matches: 1 });
  });
  it("no cuenta un acta en curso aunque el partido esté marcado como jugado", () => {
    const data = input();
    data.sheets = [{ match_id: "m1", document: { ...sheet([event("goal")]), phase: "playing" } }];
    expect(buildClubRankingStats(data).players[0]?.matches).toBe(0);
    expect(buildClubRankingStats(data).teams[0]?.matches).toBe(0);
  });
  it("muestra un fallo de lectura ante un acta inválida, sin inventar ceros", () => {
    expect(() =>
      buildClubRankingStats({
        ...input(),
        sheets: [{ match_id: "m1", document: { version: 99 } }],
      }),
    ).toThrow("validar");
  });
  it("conserva los registros anteriores sin duplicar jugadores por partido", () => {
    const data = input();
    data.stats.push({ ...data.stats[0]! });
    const result = buildClubRankingStats(data);
    expect(result.players[0]).toMatchObject({ goals: 7, matches: 1, advancedMatches: 0 });
    expect(result.legacyCount).toBe(1);
    const assists = clubRankingMetrics("season", "players").find((m) => m.id === "assists")!;
    expect(rankClubStats(result.players, assists, { subject: "players", view: "season" })).toEqual(
      [],
    );
  });
  it("usa la categoría de edad, incluso cuando juega de refuerzo en Juvenil", () => {
    const result = buildClubRankingStats({ ...input(), matches: [match("m1", "01", "t2")] });
    expect(result.players[0]?.category).toBe("cadete");
    expect(result.teams.map((t) => t.name)).toEqual(["Cadete A", "Juvenil"]);
  });
  it("separa los datos de un jugador que juega en dos equipos", () => {
    const data = input();
    data.matches.push(match("m2", "02", "t2"));
    data.stats.push({ ...data.stats[0]!, match_id: "m2", goals: 3 });
    expect(buildClubRankingStats(data).players[0]?.goals).toBe(10);
    expect(
      buildClubRankingStats({ ...data, matches: data.matches.filter((m) => m.team_id === "t1") })
        .players[0]?.goals,
    ).toBe(7);
  });
  it("no usa los goles de un marcador antiguo como tiros registrados", () => {
    const document = sheet([event("goal"), event("shot_saved")]);
    document.baseline = [{ cap: 2, goals: 4, exclusions: 0 }];
    const result = buildClubRankingStats({ ...input(), sheets: [{ match_id: "m1", document }] });
    expect(result.players[0]).toMatchObject({ goals: 5, shots: 2, shotGoals: 1 });
  });
  it("ordena las rachas por fecha y corta la actual, conservando la mejor", () => {
    const data = input();
    data.matches = [match("m3", "03"), match("m1", "01"), match("m2", "02")];
    data.stats = data.matches.map((m) => ({
      match_id: m.id,
      player_id: playerId,
      goals: m.id === "m3" ? 0 : 1,
      exclusions: 0,
      mvp: false,
    }));
    expect(buildClubRankingStats(data).players[0]?.goalRun).toEqual({ current: 0, best: 2 });
    expect(buildClubRankingStats(data).teams[0]?.winRun).toEqual({ current: 3, best: 3 });
  });
  it("una derrota corta las rachas de victoria y de imbatibilidad", () => {
    const data = input();
    data.matches = [
      match(),
      { ...match("m2", "02"), final_score_us: 1, final_score_them: 1 },
      { ...match("m3", "03"), final_score_us: 0, final_score_them: 1 },
    ];
    expect(buildClubRankingStats(data).teams[0]).toMatchObject({
      winRun: { current: 0, best: 1 },
      unbeatenRun: { current: 0, best: 2 },
      wins: 1,
      draws: 1,
      losses: 1,
    });
  });
});

describe("puestos y comparaciones", () => {
  it("la tanda atribuye goles y paradas por identidad tras cambiar el gorro", () => {
    const document = sheet([]);
    document.shootout = {
      firstSide: "us",
      shots: [
        {
          id: "30000000-0000-4000-8000-000000000001",
          side: "us",
          cap: 8,
          playerId,
          keeper: null,
          outcome: "goal",
        },
        {
          id: "30000000-0000-4000-8000-000000000002",
          side: "them",
          cap: 2,
          keeper: 9,
          keeperId: secondId,
          outcome: "save",
        },
        {
          id: "30000000-0000-4000-8000-000000000003",
          side: "us",
          cap: 8,
          playerId,
          keeper: null,
          outcome: "post",
        },
        {
          id: "30000000-0000-4000-8000-000000000004",
          side: "them",
          cap: 2,
          keeper: 9,
          keeperId: secondId,
          outcome: "out",
        },
      ],
    };
    expect(rankingPlayerTotals(document, document.players[0]!)).toMatchObject({
      goals: 1,
      shots: 2,
      shotGoals: 1,
      saves: 0,
    });
    expect(rankingPlayerTotals(document, document.players[1]!)).toMatchObject({
      goals: 0,
      shots: 0,
      saves: 1,
      conceded: 0,
    });
  });
  it("MVP compara partidos y porcentaje de MVP y usa partidos en los textos", () => {
    const p = {
      ...person("Ana", 10, 8),
      mvp: 2,
      advancedMatches: 4,
      assists: 3,
      shotGoals: 5,
      shots: 10,
    };
    expect(clubRankingDetails(p, "mvp", "players", "season")).toEqual([
      "8 partidos",
      "25 % como MVP",
    ]);
    expect(clubRankingDetails(p, "assists", "players", "season")).toEqual([
      "4 partidos",
      "0,75 asistencias/partido",
    ]);
    expect(clubRankingDetails(p, "shooting", "players", "season")).toEqual(["5 goles", "10 tiros"]);
  });
  it("ofrece las mismas métricas en Leyendas y explica cada una", () => {
    const current = clubRankingMetrics("season", "players", true);
    const legends = clubRankingMetrics("legends", "players", true);
    expect(legends.map((m) => m.id)).toEqual(current.map((m) => m.id));
    expect(current.map((m) => m.id)).toContain("matches");
    expect(current.map((m) => m.id)).toContain("exclusions");
    expect(legends.every((m) => !m.label.includes("históric"))).toBe(true);
    expect(
      [...current, ...legends, ...clubRankingMetrics("streaks", "players", true)].every(
        (m) => m.explanation.length > 35,
      ),
    ).toBe(true);
  });
  it("amplía las rachas y las corta ante un partido que no cumple", () => {
    const data = input();
    data.matches = [match("m2", "02"), match("m1", "01")];
    data.sheets = [
      {
        match_id: "m1",
        document: sheet([event("goal"), event("goal"), event("assist"), event("save")]),
      },
      {
        match_id: "m2",
        document: sheet([event("goal", { side: "them", cap: 1 }), event("exclusion")]),
      },
    ];
    for (const record of data.sheets) {
      const document = record.document as LiveSheet;
      document.players[0]!.cap = 1;
      document.keeper = 1;
      document.events = document.events.map((e) => ({
        ...e,
        cap: e.side === "us" ? 1 : e.cap,
        keeper: e.side === "them" ? 1 : e.keeper,
      }));
      const validated = sheetSchema.safeParse(document);
      if (!validated.success) throw new Error(JSON.stringify(validated.error.issues));
    }
    expect(buildClubRankingStats(data).players[0]).toMatchObject({
      braceRun: { current: 0, best: 1 },
      saveRun: { current: 0, best: 1 },
      contributionRun: { current: 0, best: 1 },
      disciplineRun: { current: 0, best: 1 },
      winRun: { current: 0, best: 1 },
      unbeatenRun: { current: 0, best: 1 },
    });
    expect(clubRankingMetrics("streaks", "players").length).toBe(9);
  });
  it("la tanda cuenta una vez en el resultado y en los goles y tiros individuales", () => {
    const document = sheet([event("goal"), event("goal", { side: "them", cap: 1, keeper: 1 })]);
    document.players.push({ id: "10000000-0000-4000-8000-000000000003", cap: 1, name: "Portero" });
    document.keeper = 1;
    document.shootout = {
      firstSide: "us",
      shots: Array.from({ length: 6 }, (_, i) => ({
        id: `30000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`,
        side: i % 2 ? "them" : "us",
        cap: i % 2 ? 1 : 2,
        keeper: i % 2 ? 1 : null,
        outcome: i % 2 ? "out" : "goal",
      })),
    };
    const validated = sheetSchema.safeParse(document);
    if (!validated.success) throw new Error(JSON.stringify(validated.error.issues));
    const result = buildClubRankingStats({ ...input(), sheets: [{ match_id: "m1", document }] });
    expect(result.players[0]).toMatchObject({ goals: 4, shots: 4, shotGoals: 4 });
    expect(result.teams[0]).toMatchObject({ goals: 4, conceded: 1, wins: 1 });
  });
  it("los empates comparten puesto 1, 1, 3", () => {
    const goals = clubRankingMetrics("season", "players")[0]!;
    expect(
      rankClubStats([person("Ana", 5), person("Bea", 5), person("Cris", 3)], goals, {
        subject: "players",
        view: "season",
      }).map((p) => p.position),
    ).toEqual([1, 1, 3]);
  });
  it("un empate visible de eficacia también comparte puesto", () => {
    const shooting = clubRankingMetrics("season", "players").find((m) => m.id === "shooting")!;
    const a = { ...person("Ana", 1), shots: 10000, shotGoals: 3333 };
    const b = { ...person("Bea", 1), shots: 10000, shotGoals: 3334 };
    expect(
      rankClubStats([a, b], shooting, { subject: "players", view: "season" }).map(
        (p) => p.position,
      ),
    ).toEqual([1, 1]);
  });
  it("exige tres partidos para promedios y cinco tiros para eficacia", () => {
    expect(clubRankingValue(person("Ana", 10, 2), "goalsAverage")).toBeNull();
    expect(
      clubRankingValue({ ...person("Ana", 10), shots: 4, shotGoals: 4 }, "shooting"),
    ).toBeNull();
    expect(clubRankingValue({ ...person("Ana", 10), shots: 5, shotGoals: 4 }, "shooting")).toBe(80);
  });
  it("no ofrece la asistencia privada a quien no tiene permisos", () => {
    expect(clubRankingMetrics("season", "players").some((m) => m.id === "attendance")).toBe(false);
    expect(clubRankingMetrics("streaks", "players").some((m) => m.id === "trainingRun")).toBe(
      false,
    );
    expect(clubRankingMetrics("season", "players", true).some((m) => m.id === "attendance")).toBe(
      true,
    );
  });
});

describe("asistencia e histórico", () => {
  it("suma un resumen compacto por temporada sin duplicarlo y pondera porcentajes", () => {
    const p = { ...person(playerId, 2, 3), advancedMatches: 3, assists: 1, shots: 5, shotGoals: 2 };
    const history = {
      profile_id: playerId,
      profile_name: "Álex",
      season_id: "old",
      category_code: "cadete",
      matches_played: 99,
      goals: 99,
      exclusions: 0,
      mvp_count: 0,
      ranking_totals: {
        version: 1,
        matches: 7,
        goals: 9,
        exclusions: 2,
        mvp: 3,
        assists: 4,
        shotGoals: 9,
        shots: 15,
        saves: 3,
        conceded: 1,
        advancedMatches: 7,
      },
      trainings_attended: 8,
      trainings_total: 10,
    };
    mergeRankingHistory([p], [history, history], profiles, 2025);
    expect(p).toMatchObject({
      matches: 10,
      goals: 11,
      assists: 5,
      shots: 20,
      shotGoals: 11,
      saves: 3,
      advancedMatches: 10,
      mvp: 3,
      trainings: 10,
      attended: 8,
    });
    expect(clubRankingValue(p, "shooting")).toBe(55);
    expect(clubRankingValue(p, "goalsAverage")).toBe(1.1);
  });
  it("deduplica conjuntos y respeta el día local de alta y los destinatarios", () => {
    const p = person(playerId, 0);
    const sessions: Parameters<typeof applyRankingAttendance>[1] = ["s1", "s2"].map((id, i) => ({
      id,
      team_id: i ? "t2" : "t1",
      joint_id: "j1",
      player_ids: null,
      scheduled_at: "2026-06-01T22:15:00Z",
    }));
    sessions.push({
      ...sessions[0]!,
      id: "s3",
      joint_id: "j2",
      scheduled_at: "2026-06-03T22:15:00Z",
      player_ids: [secondId],
    });
    applyRankingAttendance(
      [p],
      sessions,
      [
        { session_id: "s1", player_id: playerId, present: false },
        { session_id: "s2", player_id: playerId, present: true },
        { session_id: "s3", player_id: playerId, present: false },
      ],
      ["t1", "t2"].map((team_id) => ({
        player_id: playerId,
        team_id,
        joined_at: "2026-06-02",
        left_at: null,
      })),
    );
    expect(p).toMatchObject({ attended: 1, trainings: 1, trainingRun: { current: 1, best: 1 } });
  });
  it("una lista ausente no cuenta como falta y una ausencia registrada corta la racha", () => {
    const p = person(playerId, 0);
    const sessions = ["01", "02", "03"].map((day) => ({
      id: day,
      team_id: "t1",
      joint_id: null,
      player_ids: null,
      scheduled_at: `2026-06-${day}T18:00:00Z`,
    }));
    applyRankingAttendance(
      [p],
      sessions,
      [
        { session_id: "01", player_id: playerId, present: true },
        { session_id: "03", player_id: playerId, present: false },
      ],
      [{ player_id: playerId, team_id: "t1", joined_at: "2025-09-01", left_at: null }],
    );
    expect(p).toMatchObject({ trainings: 3, attended: 2, trainingRun: { current: 0, best: 2 } });
  });
  it("suma una temporada archivada una sola vez sin inventar datos avanzados", () => {
    const p = { ...person(playerId, 3, 2), seasons: 1 };
    const old = {
      profile_id: playerId,
      profile_name: "Antiguo",
      season_id: "2024",
      category_code: "infantil",
      matches_played: 10,
      goals: 20,
      exclusions: 2,
      mvp_count: 3,
    };
    mergeRankingHistory([p], [old, old], profiles, 2025);
    expect(p).toMatchObject({
      goals: 23,
      matches: 12,
      mvp: 3,
      seasons: 2,
      assists: 0,
      shots: 0,
      category: "cadete",
    });
  });
});
