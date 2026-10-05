import { describe, expect, it } from "vitest";
import {
  compareTeams,
  matchesTeamSearch,
  splitTeamRoster,
  teamSeasonYear,
} from "@/lib/domain/team-presentation";

describe("Presentación de equipos", () => {
  it.each([
    ["Alevín · Vitaliy Petrov", "alevin"],
    ["Rubén Gálvez Álvarez", "galvez ruben"],
    ["Cadete B", "cad b"],
    ["Benjamín", " BENJAMIN "],
  ])("busca fragmentos y palabras sin depender de tildes: %s", (text, query) =>
    expect(matchesTeamSearch(text, query)).toBe(true),
  );
  it("exige todas las palabras de la búsqueda", () =>
    expect(matchesTeamSearch("Cadete A Vitaliy", "cadete ruben")).toBe(false));
  it("ordena por edad y después por nombre natural", () => {
    const teams = [
      { category_code: "juvenil", label: "Juvenil" },
      { category_code: "cadete", label: "Cadete 10" },
      { category_code: "benjamin", label: "Benjamín" },
      { category_code: "cadete", label: "Cadete 2" },
    ];
    expect(teams.sort(compareTeams).map((t) => t.label)).toEqual([
      "Benjamín",
      "Cadete 2",
      "Cadete 10",
      "Juvenil",
    ]);
  });
  it("deriva la categoría del inicio de la temporada, no del año del ordenador", () => {
    expect(teamSeasonYear("2025-09-01")).toBe(2025);
    const players = [{ id: "a", birth_year: 2014 }];
    expect(splitTeamRoster(players, "alevin", 2025).own).toHaveLength(1);
  });
  it("separa los refuerzos sin perder jugadores de otras edades o sin fecha", () => {
    const players = [
      { id: "same", birth_year: 2015 },
      { id: "lower", birth_year: 2017 },
      { id: "older", birth_year: 2008 },
      { id: "unknown", birth_year: null },
    ];
    const result = splitTeamRoster(players, "alevin", 2026);
    expect(result.reinforcements.map((p) => p.id)).toEqual(["lower"]);
    expect(result.own.map((p) => p.id)).toEqual(["same", "older", "unknown"]);
    expect(new Set([...result.own, ...result.reinforcements]).size).toBe(players.length);
  });
  it("conserva toda la plantilla de Escuela", () => {
    const players = [{ birth_year: 2020 }, { birth_year: null }];
    expect(splitTeamRoster(players, "escuela", 2026)).toEqual({ own: players, reinforcements: [] });
  });
});
