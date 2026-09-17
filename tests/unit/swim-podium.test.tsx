import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SwimPodium } from "@/components/rankings/swim-podium";
import type { SwimRankingRow } from "@/lib/domain/swim-times";

function mockRow(pos: number, name: string, timeCs: number, id: string): SwimRankingRow {
  return {
    id: `entry-${pos}`,
    position: pos,
    player_id: id,
    full_name: name,
    photo_url: null,
    category_code: "cadete",
    team_id: "team-1",
    team_label: "Cadete A",
    team_color: "#1E5AA8",
    time_cs: timeCs,
    test_date: "2026-02-15",
    season_label: "2025/2026",
  };
}

describe("SwimPodium", () => {
  it("renders leader and runners with formatted times", () => {
    const items = [
      mockRow(1, "Mario Rossi", 2845, "player-1"),
      mockRow(2, "Alex Vance", 2910, "player-2"),
      mockRow(3, "Carlos Perez", 3055, "player-3"),
    ];

    render(
      <SwimPodium
        items={items}
        distance={50}
        mode="best"
        myPlayerId="player-2"
      />,
    );

    expect(screen.getByText("Podio de nado")).toBeInTheDocument();
    expect(screen.getByText("Top 3")).toBeInTheDocument();
    expect(screen.getByText("Líder")).toBeInTheDocument();

    expect(screen.getByText("Mario Rossi")).toBeInTheDocument();
    expect(screen.getByText("28,45 s")).toBeInTheDocument();

    expect(screen.getByText("Alex Vance")).toBeInTheDocument();
    expect(screen.getByText("29,10 s")).toBeInTheDocument();
    expect(screen.getByText("Tú")).toBeInTheDocument();

    expect(screen.getByText("Carlos Perez")).toBeInTheDocument();
    expect(screen.getByText("30,55 s")).toBeInTheDocument();
  });

  it("links each podium position to the player's swim profile", () => {
    const items = [
      mockRow(1, "Mario Rossi", 2845, "player-1"),
    ];

    render(
      <SwimPodium
        items={items}
        distance={100}
        mode="latest"
      />,
    );

    const leaderLink = screen.getByRole("link", { name: /Mario Rossi/i });
    expect(leaderLink).toHaveAttribute(
      "href",
      "/players/player-1/swim-times?from=rankings&distance=100",
    );
  });
});
