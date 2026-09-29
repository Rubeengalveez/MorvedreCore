import { describe, expect, it } from "vitest";
import { liveCallupReturn } from "@/lib/domain/live-match-navigation";

describe("liveCallupReturn", () => {
  it("vuelve al acta solo si la edición empezó allí", () => {
    expect(liveCallupReturn("partido-1", "acta")).toEqual({
      href: "/acta?match=partido-1",
      label: "Volver al acta",
    });
  });

  it("vuelve al partido desde su ficha y desde enlaces antiguos", () => {
    const expected = { href: "/matches/partido-1", label: "Volver al partido" };
    expect(liveCallupReturn("partido-1", "match")).toEqual(expected);
    expect(liveCallupReturn("partido-1", null)).toEqual(expected);
  });

  it("vuelve a la lista cuando se abrió desde administración", () => {
    expect(liveCallupReturn("partido-1", "admin")).toEqual({
      href: "/admin/matches",
      label: "Volver a partidos",
    });
  });
});
