import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { RankingRowItem } from "@/components/rankings/ranking-row";
import { CATEGORY_COLORS } from "@/lib/domain/categories";
import type { RankingRow } from "@/lib/domain/rankings";

function row(category: RankingRow["category_code"], teamLabel: string): RankingRow {
  return {
    player_id: `player-${category}`,
    full_name: `Jugador ${category}`,
    photo_url: null,
    cap_number: null,
    category_code: category,
    team_id: null,
    team_label: teamLabel,
    team_color: "#1E5AA8",
    primary_value: 4,
    full_name_locale: `jugador ${category}`,
    matches_played: 3,
    goals: 2,
    exclusions: 0,
    mvp_count: 0,
    trainings_attended: 4,
    trainings_total: 5,
    attendance_pct: 80,
    position: 4,
    medal: null,
  };
}

describe("ranking category presentation", () => {
  it("uses the canonical category label and color together", () => {
    const { container } = render(
      <RankingRowItem
        row={row("juvenil", "Cadete B")}
        metricLabel="Entrenos"
        metricSuffix=""
        metric="streak"
        isMe={false}
      />,
    );

    expect(screen.getByText("Juvenil")).toBeInTheDocument();
    expect(screen.queryByText("Cadete B")).not.toBeInTheDocument();
    expect(container.firstElementChild).toHaveStyle({
      borderLeftColor: CATEGORY_COLORS.juvenil,
    });
  });

  it("does not reuse the fallback blue for other categories", () => {
    const { container } = render(
      <RankingRowItem
        row={row("benjamin", "Benjamín")}
        metricLabel="Entrenos"
        metricSuffix=""
        metric="streak"
        isMe={false}
      />,
    );

    expect(container.firstElementChild).toHaveStyle({
      borderLeftColor: CATEGORY_COLORS.benjamin,
    });
  });
});
