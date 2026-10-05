import { fireEvent, render, screen, within } from "@testing-library/react";
import { useSyncExternalStore } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MatchesList, type MatchRow } from "@/app/(app)/admin/matches/_components/matches-list";
import { adminMatchesReturnPath, matchListTab } from "@/lib/domain/admin-matches";
import type { Team } from "@/server/actions/admin";

vi.mock("next/navigation", () => ({
  useSearchParams: () =>
    new URLSearchParams(
      useSyncExternalStore(
        (listener) => {
          window.addEventListener("popstate", listener);
          return () => window.removeEventListener("popstate", listener);
        },
        () => window.location.search,
      ),
    ),
}));
const team = { id: "team-1", label: "Infantil", season_label: "2026/2027" } as Team & {
  season_label: string;
};
const match = {
  id: "match-1",
  team_id: team.id,
  team_label: team.label,
  team_color: "#000",
  opponent: "CN Valencia",
  competition_type: "league",
  is_home: true,
  location: "Piscina",
  pool_name: null,
  maps_url: null,
  scheduled_at: "2026-11-10T12:00:00Z",
  status: "scheduled",
  final_score_us: null,
  final_score_them: null,
} as MatchRow;
function show(rows: MatchRow[], editable = [team.id]) {
  render(
    <MatchesList
      teams={[team]}
      matches={rows}
      defaultTeamId={team.id}
      editableTeamIds={editable}
    />,
  );
}
beforeEach(() => {
  vi.restoreAllMocks();
  window.history.replaceState({}, "", "/admin/matches");
  const native = window.history.replaceState.bind(window.history);
  vi.spyOn(window.history, "replaceState").mockImplementation((...args) => {
    native(...args);
    window.dispatchEvent(new Event("popstate"));
  });
});
describe("Gestión de partidos", () => {
  it("muestra todos por defecto y reúne los filtros en un solo desplegable", () => {
    show([
      match,
      { ...match, id: "played", status: "played" },
      { ...match, id: "cancelled", status: "cancelled" },
    ]);
    expect(screen.getAllByRole("article")).toHaveLength(3);
    expect(screen.queryByRole("combobox", { name: "Estado" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Filtros" }));
    fireEvent.change(screen.getByRole("combobox", { name: "Estado" }), {
      target: { value: "played" },
    });
    expect(screen.getByRole("button", { name: "Filtros: 1 activos" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(screen.getByRole("link", { name: /Ver partido:/ })).toHaveAttribute(
      "href",
      "/matches/played",
    );
    expect(matchListTab("postponed")).toBe("upcoming");
    fireEvent.click(screen.getByRole("button", { name: "Quitar filtros" }));
    expect(screen.getAllByRole("article")).toHaveLength(3);
  });
  it("encuentra nombres sin exigir tildes y conserva los filtros en el enlace de edición", () => {
    show([{ ...match, opponent: "CN Sagúnto" }]);
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "sagunto" } });
    const href = screen.getByRole("link", { name: /Editar partido:/ }).getAttribute("href")!;
    const url = new URL(href, "http://localhost");
    expect(url.searchParams.get("returnTo")).toContain("q=sagunto");
    expect(screen.getByRole("article", { name: /Sagúnto/ })).toBeVisible();
  });
  it("muestra el marcador visitante en el mismo orden que sus equipos", () => {
    window.history.replaceState({}, "", "/admin/matches?tab=played");
    show([{ ...match, is_home: false, status: "played", final_score_us: 2, final_score_them: 8 }]);
    const card = screen.getByRole("article");
    expect(within(card).getByLabelText("Goles local: 8")).toBeVisible();
    expect(within(card).getByLabelText("Goles visitante: 2")).toBeVisible();
  });
  it("oculta la edición sin permiso y deja limpiar los filtros de una lista vacía", () => {
    show([match], []);
    expect(screen.queryByRole("link", { name: /Editar partido:/ })).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "No existe" } });
    expect(screen.getByText("No encontramos partidos")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Mostrar todos los partidos" }));
    expect(screen.getByRole("article")).toBeVisible();
  });
  it("encuentra fragmentos de rivales y categorías sin tildes ni distinguir mayúsculas", () => {
    show([
      { ...match, opponent: "CW Turia" },
      { ...match, id: "beneplacito", opponent: "BenePlácito 2", team_label: "Alevín" },
    ]);
    for (const query of ["beneplacito", "alevin", "ALEVIN beneplacito"]) {
      fireEvent.change(screen.getByRole("searchbox"), { target: { value: query } });
      expect(screen.getByRole("article", { name: /BenePlácito/ })).toBeVisible();
      expect(screen.getAllByRole("article")).toHaveLength(1);
    }
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "turia" } });
    expect(screen.getByRole("article", { name: /Turia/ })).toBeVisible();
  });
  it("restringe el retorno al listado del admin", () => {
    expect(adminMatchesReturnPath("https://evil.test/admin/matches")).toBe("/admin/matches");
    expect(adminMatchesReturnPath("//evil.test/admin/matches")).toBe("/admin/matches");
    expect(adminMatchesReturnPath("/admin/matches/otro")).toBe("/admin/matches");
    expect(adminMatchesReturnPath("/admin/matches?tab=played&unsafe=yes&q=Valencia")).toBe(
      "/admin/matches?tab=played&q=Valencia",
    );
  });
});
