import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { TeamMatches } from "@/components/team/team-matches";
import type { TeamMatch } from "@/components/team/team-match-card";
const teamId = "a155c394-5d41-465a-a566-ee8c0d87b931";
const matches = Array.from(
  { length: 7 },
  (_, index) =>
    ({
      id: `match-${index}`,
      opponent: `Rival ${index}`,
      status: "played",
      is_home: true,
      final_score_us: 3,
      final_score_them: 2,
      scheduled_at: "2026-10-02T15:00:00Z",
      competition_type: "league",
      location: null,
    }) as TeamMatch,
);
afterEach(cleanup);
describe("Listas de partidos del equipo", () => {
  it("restaura los resultados que se habían desplegado", () => {
    render(
      <TeamMatches
        teamId={teamId}
        upcoming={[]}
        played={matches}
        initialList="played"
        initialCount={10}
      />,
    );
    expect(screen.getAllByRole("link")).toHaveLength(7);
    expect(screen.getAllByRole("link")[6]).toHaveAttribute(
      "href",
      `/matches/match-6?from=team&teamId=${teamId}&teamTab=partidos&teamList=played&teamCount=10`,
    );
  });
  it("permite desplegar resultados, ver más y volver a compactar", () => {
    render(<TeamMatches teamId={teamId} upcoming={[]} played={matches} />);
    const results = screen.getByRole("button", { name: /Resultados/ });
    expect(results).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(results);
    expect(screen.getAllByRole("link")).toHaveLength(5);
    fireEvent.click(screen.getByRole("button", { name: /Ver 2 más/ }));
    expect(screen.getAllByRole("link")).toHaveLength(7);
    fireEvent.click(screen.getByRole("button", { name: /Mostrar solo/ }));
    expect(screen.getAllByRole("link")).toHaveLength(5);
    fireEvent.click(results);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
  it("al volver de un resultado abre esa lista y conserva el origen en los enlaces", () => {
    render(<TeamMatches teamId={teamId} upcoming={[]} played={matches} initialList="played" />);
    expect(screen.getByRole("button", { name: /Resultados/ })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(screen.getAllByRole("link")[0]).toHaveAttribute(
      "href",
      `/matches/match-0?from=team&teamId=${teamId}&teamTab=partidos&teamList=played`,
    );
  });
});
