import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { FamilyOverviewPanel } from "@/components/profile/family-overview";
import type { FamilyMemberOverview, FamilyOverview } from "@/server/queries/family";

const names = ["Lucía Torres", "Mateo Torres", "Alba Torres"];

function member(index: number): FamilyMemberOverview {
  return {
    id: `00000000-0000-4000-8000-00000000000${index}`,
    full_name: names[index] ?? `Menor ${index + 1}`,
    display_name: (names[index] ?? `Menor ${index + 1}`).split(" ")[0] ?? "Menor",
    photo_url: null,
    birth_year: 2014 + index,
    team_color: index === 0 ? "#10B981" : index === 1 ? "#FF6B35" : "#2563EB",
    relation: "mother",
    teams: [
      {
        id: `10000000-0000-4000-8000-00000000000${index}`,
        label: ["Benjamín", "Infantil", "Alevín"][index] ?? "Escuela",
        category_code: "demo",
        gender: "mixed",
        team_type: "competitive",
        color: "#2563EB",
        season_id: "20000000-0000-4000-8000-000000000000",
        home_pool: null,
        player_count: 12,
      },
    ],
    next_event: null,
    stats: {
      goals: index + 1,
      matches_played: 10,
      attendance_pct: 90,
      trainings_attended: 18,
      trainings_total: 20,
    },
    pending_order_count: index === 0 ? 1 : 0,
  };
}

function family(count: number): FamilyOverview {
  const members = Array.from({ length: count }, (_, index) => member(index));
  return {
    members,
    pending_approval_count: members.reduce(
      (total, current) => total + current.pending_order_count,
      0,
    ),
    next_event: null,
    team_ids: members.flatMap((current) => current.teams.map((team) => team.id)),
  };
}

describe("FamilyOverviewPanel", () => {
  it("keeps the single-child experience explicit and complete", () => {
    const { container } = render(
      <FamilyOverviewPanel family={family(1)} pendingTreasuryCents={3500} />,
    );

    expect(screen.getByText("1 menor a tu cargo")).toBeInTheDocument();
    expect(screen.getByText("Lucía")).toBeInTheDocument();
    expect(container.querySelectorAll("article")).toHaveLength(1);
    expect(screen.getByRole("link", { name: "Ver equipo de Lucía" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver calendario" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Revisar pedidos/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Cuotas y pagos/ })).toBeInTheDocument();
  });

  it("presents two children as the primary family layout", () => {
    const { container } = render(
      <FamilyOverviewPanel family={family(2)} pendingTreasuryCents={0} />,
    );

    expect(screen.getByText("2 menores a tu cargo")).toBeInTheDocument();
    expect(screen.getByText("Lucía y Mateo")).toBeInTheDocument();
    expect(container.querySelectorAll("article")).toHaveLength(2);
    expect(screen.queryByText("+1")).not.toBeInTheDocument();
  });

  it("keeps a third child readable without widening the family header", () => {
    const { container } = render(
      <FamilyOverviewPanel family={family(3)} pendingTreasuryCents={0} />,
    );

    expect(screen.getByText("3 menores a tu cargo")).toBeInTheDocument();
    expect(screen.getByText("Lucía, Mateo y Alba")).toBeInTheDocument();
    expect(screen.getByText("+1")).toBeInTheDocument();
    expect(container.querySelectorAll("article")).toHaveLength(3);
    expect(screen.getByText("En tu familia · 3 de 3")).toBeInTheDocument();
  });
});
