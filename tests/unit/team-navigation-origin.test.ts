import { describe, expect, it } from "vitest";
import { teamAdminOrigin, teamNestedOrigin } from "@/lib/domain/team-navigation-origin";
describe("Origen de la ficha pública", () => {
  it.each(["plantilla", "personal", "datos"])("regresa a %s", (tab) =>
    expect(teamAdminOrigin("id", "admin", tab).href).toBe(`/admin/teams/id?tab=${tab}`),
  );
  it("no acepta rutas arbitrarias", () => {
    expect(teamAdminOrigin("id", "https://external", "datos").href).toBe("/team");
    expect(teamAdminOrigin("id", "admin", "https://external").context).toBe(
      "from=admin&adminTab=plantilla",
    );
  });
});

it("regresa a la actividad del perfil después de consultar un equipo", () => {
  expect(teamAdminOrigin("id", "profile")).toEqual({
    href: "/profile/activity",
    context: "from=profile",
    label: "Mi actividad",
  });
});

it("mantiene el origen del perfil al abrir jugadores o tiempos sin convertirlo en administración", () => {
  expect(teamNestedOrigin("from=profile").toString()).toBe("teamFrom=profile");
  expect(teamNestedOrigin("from=admin&adminTab=datos").toString()).toBe(
    "teamFrom=admin&teamAdminTab=datos",
  );
  expect(teamNestedOrigin("from=https://external").toString()).toBe("");
});
