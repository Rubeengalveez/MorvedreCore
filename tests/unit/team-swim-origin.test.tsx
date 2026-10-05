import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { TeamSwimTimesTab } from "@/app/(app)/team/[teamId]/_components/team-swim-times-tab";

vi.mock("@/server/queries/swim-times", () => ({
  getSwimTimeEntries: async () => [
    { player_id: "player", test_date: "2026-10-03", time_50_cs: 3000, time_100_cs: null },
  ],
}));
vi.mock("@/components/ui/adaptive-player-name", () => ({
  AdaptivePlayerName: ({ name }: { name: string }) => <span>{name}</span>,
}));
afterEach(cleanup);

describe("Origen en los tiempos del equipo", () => {
  it.each(["", "from=admin&adminTab=datos"])(
    "conserva el origen %s al abrir registro e historial",
    async (context) => {
      render(
        await TeamSwimTimesTab({
          teamId: "team",
          teamLabel: "Juvenil",
          teamColor: "#0A2E5C",
          isCoach: true,
          context,
          roster: [
            {
              player_id: "player",
              full_name: "Pau Pérez",
              photo_url: null,
              birth_year: 2010,
              cap_number: 2,
              squad_number: 2,
            },
          ],
        }),
      );
      expect(screen.getByRole("link", { name: "Añadir tiempos de nado" })).toHaveAttribute(
        "href",
        `/team/team/swim-times${context ? `?${context}` : ""}`,
      );
      expect(screen.getByRole("link", { name: /Pau Pérez/ })).toHaveAttribute(
        "href",
        `/players/player/swim-times?from=team&teamId=team${context ? "&teamFrom=admin&teamAdminTab=datos" : ""}`,
      );
    },
  );
});
