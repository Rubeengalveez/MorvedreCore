import { describe, expect, it } from "vitest";

import { getPlayerProfileBackTarget } from "@/lib/domain/player-profile-navigation";

describe("getPlayerProfileBackTarget", () => {
  it("returns to profile when the player card was opened from profile", () => {
    expect(getPlayerProfileBackTarget("profile", "team-1")).toEqual({
      href: "/profile",
      label: "Volver a mi perfil",
    });
  });

  it("returns to the team roster when opened from a team", () => {
    expect(getPlayerProfileBackTarget(undefined, "team-1")).toEqual({
      href: "/team/team-1?tab=jugadores",
      label: "Volver a la plantilla",
    });
  });

  it("ignores unknown navigation origins", () => {
    expect(getPlayerProfileBackTarget("external", "team-1")).toEqual({
      href: "/team/team-1?tab=jugadores",
      label: "Volver a la plantilla",
    });
  });
});
