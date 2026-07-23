import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { MatchRow, TrainingRow } from "@/components/calendar/event-sheet";
import type { CalendarMatch, CalendarTraining } from "@/server/queries/calendar";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock("@/server/actions/admin", () => ({
  setMyCallupStatus: vi.fn(),
}));

const training: CalendarTraining = {
  id: "550e8400-e29b-41d4-a716-446655440001",
  team_id: "550e8400-e29b-41d4-a716-446655440002",
  team_label: "Cadete B",
  team_color: "#1F67B1",
  block_label: "Viernes",
  scheduled_at: "2026-07-10T17:00:00.000Z",
  duration_minutes: 90,
  location: "Piscina Municipal Puerto Sagunto",
  maps_url: "https://maps.app.goo.gl/piscina-municipal",
  cancelled: false,
  cancellation_reason: null,
};

const match: CalendarMatch = {
  id: "550e8400-e29b-41d4-a716-446655440003",
  team_id: training.team_id,
  team_label: training.team_label,
  team_color: training.team_color,
  opponent: "CN Terrassa",
  is_home: false,
  competition_type: "tournament",
  status: "scheduled",
  scheduled_at: "2026-07-18T17:00:00.000Z",
  location: "Piscina CN Terrassa",
  maps_url: "https://maps.app.goo.gl/piscina-terrassa",
  pool_name: "Piscina CN Terrassa",
  final_score_us: null,
  final_score_them: null,
  callup_status: null,
  cap_number: null,
};

describe("calendar event sheet cards", () => {
  it("groups the training schedule without repeating it and exposes a real attendance link", () => {
    render(<TrainingRow training={training} isCoach />);

    expect(screen.getByRole("heading", { name: "Sesión de agua y táctica" })).toBeVisible();
    expect(screen.getAllByText("19:00–20:30")).toHaveLength(1);
    expect(screen.getByText("90 min")).toBeVisible();
    expect(screen.getByText(training.location!)).toBeVisible();
    expect(
      screen.getByRole("link", { name: `Abrir ${training.location} en el mapa` }),
    ).toHaveAttribute("href", training.maps_url);
    expect(screen.getByRole("link", { name: "Pasar lista" })).toHaveAttribute(
      "href",
      `/attendance/${training.id}`,
    );
  });

  it("shows a cancelled training as information without an attendance action", () => {
    render(
      <TrainingRow
        training={{ ...training, cancelled: true, cancellation_reason: "Piscina cerrada" }}
        isCoach
      />,
    );

    expect(screen.getByText("Cancelado.")).toBeVisible();
    expect(screen.getByText("Piscina cerrada")).toBeVisible();
    expect(screen.queryByRole("link", { name: "Pasar lista" })).not.toBeInTheDocument();
  });

  it("keeps match teams, venue and actions in a clear semantic structure", () => {
    render(<MatchRow match={match} isCoach activeProfileId="profile-1" onChanged={vi.fn()} />);

    expect(screen.getByRole("heading", { name: "CN Terrassa contra Morvedre" })).toBeVisible();
    expect(screen.getByText("Torneo")).toBeVisible();
    expect(screen.getByText("Piscina CN Terrassa")).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Abrir Piscina CN Terrassa en el mapa" }),
    ).toHaveAttribute("href", match.maps_url);
    expect(screen.getByRole("link", { name: "Ver convocatoria completa" })).toHaveAttribute(
      "href",
      `/matches/${match.id}`,
    );
    expect(screen.getByRole("link", { name: "Gestionar convocatoria" })).toHaveAttribute(
      "href",
      `/admin/matches/${match.id}`,
    );
  });
});
