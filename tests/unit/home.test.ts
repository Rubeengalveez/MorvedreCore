import { describe, expect, it } from "vitest";
import {
  homeDate,
  homeTime,
  homeEventIsCurrent,
  homeManagementLinks,
  peopleForEvent,
  type HomeEvent,
} from "@/lib/domain/home";
import { deriveAdminCapabilities } from "@/lib/domain/permissions";

const event: HomeEvent = {
  id: "event",
  team_id: "a",
  team_ids: ["a", "b"],
  team_player_ids: { a: ["child-a"], b: null },
  player_ids: ["child-a"],
  kind: "training",
  training_kind: "water",
  date: "2026-10-04",
  scheduled_at: "2026-10-04T10:00:00Z",
  duration_minutes: 90,
  title: "Agua",
  team_label: "Cadete · Juvenil",
  team_color: "#123456",
  cancelled: false,
  status: "scheduled",
  is_today: true,
  is_tomorrow: false,
  personIds: [],
  calledPersonIds: [],
  canOpenActa: false,
};
describe("Inicio: actividad y permisos", () => {
  it("mantiene la audiencia de cada equipo en un entrenamiento conjunto", () => {
    const people = [
      { id: "child-a", name: "Ana", photo: null, teamIds: ["a"], staffTeamIds: [] },
      { id: "child-b", name: "Luis", photo: null, teamIds: ["b"], staffTeamIds: [] },
      { id: "other", name: "Otro", photo: null, teamIds: ["a"], staffTeamIds: [] },
      { id: "coach", name: "Vega", photo: null, teamIds: ["a"], staffTeamIds: ["a"] },
    ];
    expect(peopleForEvent(event, people)).toEqual(["child-a", "child-b", "coach"]);
    expect(peopleForEvent({ ...event, team_player_ids: { a: [], b: [] } }, people)).toEqual([
      "coach",
    ]);
  });
  it("retira lo terminado y conserva los partidos realmente en juego", () => {
    const now = new Date("2026-10-04T11:30:00Z");
    expect(homeEventIsCurrent(event, now)).toBe(false);
    expect(homeEventIsCurrent({ ...event, scheduled_at: "2026-10-05T10:00:00Z" }, now)).toBe(true);
    expect(
      homeEventIsCurrent(
        { ...event, kind: "match", status: "in_progress", scheduled_at: "2026-10-03T10:00:00Z" },
        now,
      ),
    ).toBe(true);
    expect(homeEventIsCurrent({ ...event, cancelled: true }, now)).toBe(false);
    expect(homeEventIsCurrent({ ...event, status: "played" }, now)).toBe(false);
  });
  it("usa el día de Madrid incluso al cruzar medianoche y el cambio de hora", () => {
    expect(homeDate("2026-10-04T22:15:00Z", "2026-10-04T21:45:00Z", true)).toBe("Mañana · 00:15");
    expect(homeDate("2026-10-25T00:30:00Z", "2026-10-24T21:30:00Z")).toBe("Mañana");
    expect(homeTime("2026-10-25T01:30:00Z")).toBe("02:30");
  });
  it("Sol y tesorería solo ven su gestión; las familias no heredan permisos", () => {
    const base = { isAdmin: false, roles: [], staff: [] };
    expect(
      homeManagementLinks(
        deriveAdminCapabilities({ ...base, permissions: [{ permission: "manage_shop" }] }),
        false,
      ),
    ).toEqual([{ href: "/admin/shop?view=orders", label: "Gestionar tienda", kind: "shop" }]);
    expect(
      homeManagementLinks(
        deriveAdminCapabilities({ ...base, permissions: [{ permission: "manage_treasury" }] }),
        false,
      )[0].kind,
    ).toBe("treasury");
    expect(
      homeManagementLinks(deriveAdminCapabilities({ ...base, permissions: [] }), false),
    ).toEqual([]);
    expect(
      homeManagementLinks(
        deriveAdminCapabilities({ ...base, permissions: [], isAdmin: true }),
        true,
      ).map((l) => l.kind),
    ).toEqual(["attendance", "admin"]);
  });
});
