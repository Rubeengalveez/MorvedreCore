import { describe, expect, it } from "vitest";

import {
  getPlayerProfileBackTarget,
  getRankingPlayerProfileHref,
} from "@/lib/domain/player-profile-navigation";

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

  it("returns to the same ranking filter, page and player", () => {
    const rankingHref = "/rankings?scope=category%3Ajuvenil&metric=assists&page=3";
    const profileHref = getRankingPlayerProfileHref("team-1", "player-1", rankingHref);
    const url = new URL(profileHref, "https://morvedre.local");

    expect(url.pathname).toBe("/team/team-1/players/player-1");
    expect(
      getPlayerProfileBackTarget(
        url.searchParams.get("from") ?? undefined,
        "team-1",
        url.searchParams.get("returnTo") ?? undefined,
        "player-1",
      ),
    ).toEqual({
      href: `${rankingHref}#ranking-player-player-1`,
      label: "Volver a Rankings",
    });
  });

  it("rejects external or unrelated ranking return paths", () => {
    expect(
      getPlayerProfileBackTarget("rankings", "team-1", "https://example.com", "player-1"),
    ).toEqual({ href: "/rankings", label: "Volver a Rankings" });
    expect(
      getPlayerProfileBackTarget(
        "rankings",
        "team-1",
        "/profile#ranking-player-player-1",
        "player-1",
      ),
    ).toEqual({ href: "/rankings", label: "Volver a Rankings" });
  });
});

it("mantiene el origen de una ficha familiar o personal", () => {
  expect(getPlayerProfileBackTarget("family", "team").href).toBe("/profile/family");
  expect(getPlayerProfileBackTarget("profile-activity", "team").href).toBe("/profile/activity");
});
