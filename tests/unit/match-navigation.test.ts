import { describe, expect, it } from "vitest";
import { getMatchBackTarget, getTeamMatchHref } from "@/lib/domain/match-navigation";
const teamId = "a155c394-5d41-465a-a566-ee8c0d87b931";
describe("Vuelta de un partido al equipo", () => {
  it("vuelve a Inicio cuando se abre desde la agenda o el resultado", () => {
    expect(getMatchBackTarget({ from: "dashboard", matchTeamId: teamId })).toEqual({
      href: "/dashboard",
      label: "Inicio",
    });
  });
  it("conserva el origen del perfil al regresar de un partido al equipo", () => {
    const url = new URL(
      getTeamMatchHref("match", teamId, "principal", undefined, 5, "from=profile"),
      "http://localhost",
    );
    expect(
      getMatchBackTarget({ ...Object.fromEntries(url.searchParams), matchTeamId: teamId }).href,
    ).toBe(`/team/${teamId}?tab=principal&from=profile`);
  });
  it("conserva la cantidad desplegada y limita valores inválidos", () => {
    expect(
      getMatchBackTarget({
        from: "team",
        teamId,
        teamTab: "partidos",
        teamList: "played",
        teamCount: "10",
        matchTeamId: teamId,
      }).href,
    ).toBe(`/team/${teamId}?tab=partidos&list=played&count=10`);
    expect(
      getMatchBackTarget({
        from: "team",
        teamId,
        teamTab: "partidos",
        teamCount: "1000000000",
        matchTeamId: teamId,
      }).href,
    ).toBe(`/team/${teamId}?tab=partidos`);
  });
  it("conserva la pestaña y abre la lista de resultados de origen", () => {
    const url = new URL(
      getTeamMatchHref("match", teamId, "partidos", "played"),
      "http://localhost",
    );
    expect(
      getMatchBackTarget({ ...Object.fromEntries(url.searchParams), matchTeamId: teamId }),
    ).toEqual({ href: `/team/${teamId}?tab=partidos&list=played`, label: "Volver al equipo" });
  });
  it("conserva el resumen", () => {
    expect(
      getMatchBackTarget({ from: "team", teamId, teamTab: "principal", matchTeamId: teamId }).href,
    ).toBe(`/team/${teamId}?tab=principal`);
  });
  it("mantiene el regreso al administrador al visitar un partido desde la ficha pública", () => {
    const url = new URL(
      getTeamMatchHref("match", teamId, "partidos", "upcoming", 10, "from=admin&adminTab=datos"),
      "http://localhost",
    );
    expect(
      getMatchBackTarget({ ...Object.fromEntries(url.searchParams), matchTeamId: teamId }).href,
    ).toBe(`/team/${teamId}?tab=partidos&list=upcoming&count=10&from=admin&adminTab=datos`);
  });
  it.each([
    { from: "team", teamId: "https://example.com" },
    { from: "team", teamId: "11111111-1111-4111-8111-111111111111" },
    { from: "calendar", teamId },
    {},
  ])("no acepta destinos externos ni otro equipo: %j", (origin) => {
    expect(getMatchBackTarget({ ...origin, matchTeamId: teamId })).toEqual({
      href: "/calendar",
      label: "Calendario",
    });
  });
});
