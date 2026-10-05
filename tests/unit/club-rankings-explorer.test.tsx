import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ClubRankingsExplorer } from "@/components/rankings/club-rankings-explorer";
import { RankingsSectionNav } from "@/components/rankings/rankings-section-nav";
import { emptyRankingStats } from "@/lib/domain/club-rankings";
import type { ClubRankingsData } from "@/server/queries/club-rankings";
vi.mock("next/navigation", async () => {
  const { useSyncExternalStore } = await import("react");
  return {
    useSearchParams: () =>
      new URLSearchParams(
        useSyncExternalStore(
          (notify) => {
            window.addEventListener("ranking-test-query", notify);
            return () => window.removeEventListener("ranking-test-query", notify);
          },
          () => window.location.search,
          () => "",
        ),
      ),
  };
});
beforeEach(() => {
  window.history.replaceState(null, "", "/rankings");
  const original = window.history.replaceState.bind(window.history);
  vi.spyOn(window.history, "replaceState").mockImplementation((...args) => {
    original(...args);
    window.dispatchEvent(new Event("ranking-test-query"));
  });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
function data(): ClubRankingsData {
  const players = ["Álex García", "Beatriz López", "Carlos Pérez", "David Vila"].map((name, i) => ({
    ...emptyRankingStats({
      id: `p${i}`,
      name,
      photo: i === 0 ? "/brand/logo.webp" : null,
      category: "cadete",
      color: "#1E5AA8",
      teamIds: ["t1"],
    }),
    matches: 4,
    goals: 10 - i,
    assists: i,
    advancedMatches: 4,
    mvp: 1,
  }));
  const team = {
    ...emptyRankingStats({
      id: "t1",
      name: "Cadete A",
      photo: null,
      category: "cadete",
      color: "#1E5AA8",
      teamIds: ["t1"],
    }),
    matches: 4,
    goals: 8,
    wins: 3,
    winRun: { current: 3, best: 3 },
  };
  return {
    season: { id: "s1", label: "2025/2026" },
    players,
    teams: [team],
    playersByTeam: { t1: players },
    swim: [],
    actaCount: 4,
    legacyCount: 0,
    archivedSeasons: 0,
  };
}
describe("explorar clasificaciones", () => {
  it("la paginación ofrece botones con texto y cambia al siguiente grupo", () => {
    const result = data();
    result.players = Array.from({ length: 13 }, (_, i) => ({
      ...result.players[i % 4]!,
      id: `page-${i}`,
      name: `Jugador ${i}`,
      goals: 20 - i,
    }));
    render(<ClubRankingsExplorer data={result} view="season" myId="" />);
    expect(screen.getByRole("button", { name: "Página siguiente" })).toHaveTextContent("Siguiente");
    const listStart = screen.getByRole("searchbox").closest("label")!;
    listStart.scrollIntoView = vi.fn();
    fireEvent.click(screen.getByRole("button", { name: "Página siguiente" }));
    expect(screen.getByText("Página 2 de 2")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Jugador 10, puesto 11/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Jugador 0, puesto 1,/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Página anterior" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Página siguiente" })).toBeDisabled();
    expect(listStart.scrollIntoView).toHaveBeenCalledWith({ block: "start", behavior: "instant" });
  });
  it("mantiene datos abreviados en las tarjetas y los muestra completos al abrir", () => {
    render(<ClubRankingsExplorer data={data()} view="season" myId="p0" />);
    const card = screen.getByRole("button", { name: /David Vila, puesto 4/ });
    expect(within(card).getByText("4 PJ")).toBeInTheDocument();
    expect(within(card).getByText("1,75 G/P")).toBeInTheDocument();
    fireEvent.click(card);
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("4 partidos")).toBeInTheDocument();
    expect(within(dialog).getByText("1,75 goles/partido")).toBeInTheDocument();
  });
  it("los primeros empatados comparten oro y dimensiones sin texto ni número redundante", () => {
    const result = data();
    result.players[1]!.goals = result.players[0]!.goals;
    render(<ClubRankingsExplorer data={result} view="season" myId="" />);
    const podium = screen.getByRole("region", { name: "Podio de la clasificación" });
    const winners = within(podium).getAllByRole("button", { name: /puesto 1,/ });
    expect(winners).toHaveLength(2);
    expect(winners[0]!.lastElementChild?.className).toBe(winners[1]!.lastElementChild?.className);
    expect(within(podium).queryByText("1º")).not.toBeInTheDocument();
    expect(screen.queryByText("Los empates comparten puesto.")).not.toBeInTheDocument();
  });
  it("la ayuda cambia con la clasificación y explica las expulsiones", () => {
    render(<ClubRankingsExplorer data={data()} view="season" myId="" />);
    fireEvent.change(screen.getByRole("combobox", { name: "Clasificación" }), {
      target: { value: "exclusions" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Cómo se calcula esta clasificación" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByRole("heading", { name: "Expulsiones" })).toBeInTheDocument();
    expect(within(dialog).getByText(/tarjeta roja no suma/)).toBeInTheDocument();
  });
  function swimData() {
    const result = data();
    result.swim = [3000, 3500].map((time_50_cs, index) => ({
      id: `time-${index}`,
      revision: 1,
      player_id: "p0",
      full_name: "Álex García",
      photo_url: null,
      birth_year: 2011,
      team_id: "t1",
      team_label: "Cadete A",
      team_color: "#1E5AA8",
      team_category: "cadete",
      season_id: "s1",
      season_label: "2025/2026",
      season_end_year: 2026,
      test_date: `2026-06-0${index + 1}`,
      created_at: `2026-06-0${index + 1}T18:00:00Z`,
      time_50_cs,
      time_100_cs: null,
    }));
    return result;
  }
  it("Nado empieza por el intento actual y permite consultar el récord", () => {
    window.history.replaceState(null, "", "/rankings?metric=swim50");
    render(<ClubRankingsExplorer data={swimData()} view="season" myId="p0" />);
    expect(
      screen.getByRole("button", { name: /Álex García, puesto 1, 35,00 s/ }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Mejor marca" }));
    expect(
      screen.getByRole("button", { name: /Álex García, puesto 1, 30,00 s/ }),
    ).toBeInTheDocument();
  });
  it("Leyendas conserva cada marca histórica aunque sean de la misma persona", () => {
    window.history.replaceState(null, "", "/legends?metric=swim50");
    render(<ClubRankingsExplorer data={swimData()} view="legends" myId="p0" />);
    expect(
      screen.getByRole("button", { name: /Álex García, puesto 1, 30,00 s/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Álex García, puesto 2, 35,00 s/ }),
    ).toBeInTheDocument();
    expect(screen.getByText("2 marcas")).toBeInTheDocument();
  });
  it("muestra fotos y abre los puestos de la persona elegida", () => {
    render(<ClubRankingsExplorer data={data()} view="season" myId="p0" />);
    expect(screen.getByRole("img", { name: "Álex García" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Álex García, puesto 1/ }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByRole("heading", { name: "Álex García" })).toBeInTheDocument();
    expect(
      within(dialog).getByRole("button", { name: /Goles: puesto 1, 10 goles/ }),
    ).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: /Asistencias/ })).toBeInTheDocument();
  });
  it("buscar sin tildes conserva el puesto, sin reinventar un primer puesto", () => {
    render(<ClubRankingsExplorer data={data()} view="season" myId="p0" />);
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "beatriz lopez" } });
    expect(screen.getByRole("button", { name: /Beatriz López, puesto 2/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Carlos Pérez, puesto/ })).not.toBeInTheDocument();
  });
  it("cambiar el dato reemplaza la URL y no añade pasos al botón atrás", () => {
    render(<ClubRankingsExplorer data={data()} view="season" myId="p0" />);
    const historyLength = window.history.length;
    fireEvent.change(screen.getByRole("combobox", { name: "Clasificación" }), {
      target: { value: "assists" },
    });
    expect(new URLSearchParams(window.location.search).get("metric")).toBe("assists");
    expect(window.history.length).toBe(historyLength);
    expect(screen.getByRole("heading", { name: "Asistencias" })).toBeInTheDocument();
  });
  it("ofrece rankings y rachas de equipos", () => {
    render(<ClubRankingsExplorer data={data()} view="streaks" myId="p0" />);
    fireEvent.click(screen.getByRole("button", { name: "Equipos" }));
    expect(screen.getByRole("heading", { name: "Victorias seguidas" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Cadete A, puesto 1, 3 partidos/ }),
    ).toBeInTheDocument();
  });
  it("respeta una URL antigua de nado al buscar", () => {
    window.history.replaceState(null, "", "/rankings?metric=swim&distance=100");
    render(<ClubRankingsExplorer data={data()} view="season" myId="p0" />);
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "alex" } });
    expect(new URLSearchParams(window.location.search).get("metric")).toBe("swim100");
    expect(screen.getByRole("heading", { name: "Nado · 100 m" })).toBeInTheDocument();
  });
  it("conserva categoría y equipos al pasar a Rachas", () => {
    window.history.replaceState(null, "", "/rankings?scope=category:cadete&subject=teams");
    render(<RankingsSectionNav active="season" />);
    const href = screen.getByRole("link", { name: "Rachas" }).getAttribute("href")!;
    const url = new URL(href, "http://localhost");
    expect(url.pathname).toBe("/streaks");
    expect(url.searchParams.get("scope")).toBe("category:cadete");
    expect(url.searchParams.get("subject")).toBe("teams");
  });
});
