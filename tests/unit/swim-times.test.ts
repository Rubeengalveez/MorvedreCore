import { describe, expect, it } from "vitest";

import {
  categoryForSwimEntry,
  clampDateToSeason,
  computeSwimLegends,
  computeSwimRanking,
  formatSwimTime,
  normalizeSearchTerm,
  parseSwimTime,
  type SwimTimeEntryInput,
} from "@/lib/domain/swim-times";

function entry(overrides: Partial<SwimTimeEntryInput>): SwimTimeEntryInput {
  return {
    id: "entry-1",
    revision: 1,
    player_id: "player-1",
    full_name: "Jugador Uno",
    photo_url: null,
    birth_year: 2011,
    team_id: "team-1",
    team_label: "Cadete A",
    team_color: "#1E5AA8",
    team_category: "cadete",
    season_id: "season-1",
    season_label: "2026/27",
    season_end_year: 2027,
    test_date: "2026-09-01",
    created_at: "2026-09-01T18:00:00Z",
    start_type: "water",
    time_50_cs: null,
    time_100_cs: null,
    ...overrides,
  };
}

describe("parseSwimTime", () => {
  it.each([
    ["34,52", 3452],
    ["34.52", 3452],
    ["34", 3400],
    ["1:18,40", 7840],
  ])("convierte %s en centésimas en 50m", (value, expected) => {
    expect(parseSwimTime(value, 50)).toMatchObject({ ok: true, centiseconds: expected });
  });

  it.each([
    ["1.15", 7500],
    ["1,15", 7500],
    ["1:15", 7500],
    ["75", 7500],
    ["1:18,40", 7840],
  ])("convierte %s en centésimas en 100m", (value, expected) => {
    expect(parseSwimTime(value, 100)).toMatchObject({ ok: true, centiseconds: expected });
  });

  it("rechaza formatos ambiguos", () => {
    expect(parseSwimTime("1:8,40", 100)).toMatchObject({ ok: false });
    expect(parseSwimTime("34,527", 50)).toMatchObject({ ok: false });
  });

  it("marca valores poco habituales para pedir una segunda confirmación", () => {
    expect(parseSwimTime("12,00", 50)).toMatchObject({ ok: true, warning: true });
    expect(parseSwimTime("34,52", 50)).toMatchObject({ ok: true, warning: false });
  });

  it("muestra segundos y minutos de forma legible", () => {
    expect(formatSwimTime(3452)).toBe("34,52 s");
    expect(formatSwimTime(7840)).toBe("1:18,40");
  });
});

describe("clampDateToSeason", () => {
  const season = { start_date: "2025-09-01", end_date: "2026-07-31" };

  it("acota fechas posteriores al final de la temporada", () => {
    expect(clampDateToSeason("2026-09-14", season)).toBe("2026-07-31");
  });

  it("acota fechas anteriores al inicio de la temporada", () => {
    expect(clampDateToSeason("2025-08-15", season)).toBe("2025-09-01");
  });

  it("mantiene fechas dentro de la temporada", () => {
    expect(clampDateToSeason("2026-01-15", season)).toBe("2026-01-15");
  });
});

describe("normalizeSearchTerm", () => {
  it("elimina tildes para permitir búsquedas insensibles a acentos", () => {
    expect(normalizeSearchTerm("Jiménez")).toBe("jimenez");
    expect(normalizeSearchTerm("jimenez")).toBe("jimenez");
    expect(normalizeSearchTerm("Álvaro")).toBe("alvaro");
    expect(normalizeSearchTerm("PÉREZ MÉNDEZ")).toBe("perez mendez");
  });

  it("coincide una búsqueda sin tildes contra un nombre con tildes", () => {
    const playerName = "Hugo Jiménez Méndez";
    const query = "jimenez";
    expect(normalizeSearchTerm(playerName).includes(normalizeSearchTerm(query))).toBe(true);
  });

  it("coincide una búsqueda con tildes contra un nombre sin tildes", () => {
    const playerName = "Hugo Jimenez";
    const query = "Jiménez";
    expect(normalizeSearchTerm(playerName).includes(normalizeSearchTerm(query))).toBe(true);
  });
});

describe("computeSwimRanking", () => {
  const measurements = [
    entry({
      id: "a-old",
      player_id: "a",
      full_name: "Ana",
      test_date: "2026-09-01",
      time_50_cs: 3300,
    }),
    entry({
      id: "a-new",
      player_id: "a",
      full_name: "Ana",
      test_date: "2026-09-08",
      time_50_cs: 3500,
    }),
    entry({ id: "b", player_id: "b", full_name: "Bea", test_date: "2026-09-07", time_50_cs: 3400 }),
  ];

  it("usa una sola fila por jugador y ordena su tiempo actual", () => {
    const rows = computeSwimRanking({ entries: measurements, distance: 50, mode: "latest" });
    expect(rows.map((row) => [row.player_id, row.time_cs])).toEqual([
      ["b", 3400],
      ["a", 3500],
    ]);
  });

  it("permite cambiar a la mejor marca de cada jugador", () => {
    const rows = computeSwimRanking({ entries: measurements, distance: 50, mode: "best" });
    expect(rows.map((row) => [row.player_id, row.time_cs])).toEqual([
      ["a", 3300],
      ["b", 3400],
    ]);
  });

  it("elige el último 50 y el último 100 de forma independiente", () => {
    const rows = [
      entry({ id: "fifty", test_date: "2026-09-01", time_50_cs: 3450 }),
      entry({ id: "hundred", test_date: "2026-09-10", time_100_cs: 7900 }),
    ];
    expect(computeSwimRanking({ entries: rows, distance: 50, mode: "latest" })[0]?.id).toBe(
      "fifty",
    );
    expect(computeSwimRanking({ entries: rows, distance: 100, mode: "latest" })[0]?.id).toBe(
      "hundred",
    );
  });

  it("usa posiciones de competición cuando hay empate", () => {
    const rows = computeSwimRanking({
      entries: [
        entry({ id: "a", player_id: "a", time_50_cs: 3400 }),
        entry({ id: "b", player_id: "b", time_50_cs: 3400 }),
        entry({ id: "c", player_id: "c", time_50_cs: 3500 }),
      ],
      distance: 50,
      mode: "latest",
    });
    expect(rows.map((row) => row.position)).toEqual([1, 1, 3]);
  });
});

describe("computeSwimLegends", () => {
  it("conserva cada intento aunque pertenezca al mismo jugador", () => {
    const rows = computeSwimLegends({
      entries: [
        entry({ id: "try-1", time_50_cs: 3300 }),
        entry({ id: "try-2", test_date: "2026-09-02", time_50_cs: 3320 }),
        entry({ id: "try-3", test_date: "2026-09-03", time_50_cs: 3340 }),
      ],
      distance: 50,
      startType: "water",
    });
    expect(rows).toHaveLength(3);
    expect(rows.map((row) => row.player_id)).toEqual(["player-1", "player-1", "player-1"]);
  });

  it("filtra por las condiciones comparables de la prueba", () => {
    const rows = computeSwimLegends({
      entries: [
        entry({ id: "water", time_100_cs: 7800 }),
        entry({ id: "block", start_type: "block", time_100_cs: 7600 }),
        entry({ id: "other-water", test_date: "2026-09-03", time_100_cs: null }),
      ],
      distance: 100,
      startType: "water",
    });
    expect(rows.map((row) => row.id)).toEqual(["water"]);
  });

  it("calcula la categoría en la temporada de la medición", () => {
    const juvenileThenAdult = entry({ birth_year: 2008, season_end_year: 2027 });
    const adultLater = entry({ birth_year: 2008, season_end_year: 2028 });
    expect(categoryForSwimEntry(juvenileThenAdult)).toBe("juvenil");
    expect(categoryForSwimEntry(adultLater)).toBe("absoluto");
  });
});
