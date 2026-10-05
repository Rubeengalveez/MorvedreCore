import { describe, expect, it } from "vitest";
import { changeDefaultCap, teamDefaultCapsSchema } from "@/lib/domain/team-default-caps";

const first = "11111111-1111-4111-8111-111111111111";
const second = "22222222-2222-4222-8222-222222222222";
const expected = [
  { player_id: first, cap_number: 1 },
  { player_id: second, cap_number: 2 },
];
describe("Gorros por defecto", () => {
  it("permite gorros pendientes sin duplicarlos", () => {
    expect(
      teamDefaultCapsSchema.safeParse({
        team_id: first,
        expected,
        players: expected.map((p) => ({ ...p, cap_number: null })),
      }).success,
    ).toBe(true);
  });
  it("rechaza gorros repetidos y jugadores ajenos a la plantilla recibida", () => {
    expect(
      teamDefaultCapsSchema.safeParse({
        team_id: first,
        expected,
        players: expected.map((p) => ({ ...p, cap_number: 2 })),
      }).success,
    ).toBe(false);
    expect(
      teamDefaultCapsSchema.safeParse({ team_id: first, expected, players: [expected[0]] }).success,
    ).toBe(false);
  });
  it.each([0, 15, 1.5])("rechaza el gorro inválido %s", (cap) => {
    expect(
      teamDefaultCapsSchema.safeParse({
        team_id: first,
        expected,
        players: [{ ...expected[0], cap_number: cap }, expected[1]],
      }).success,
    ).toBe(false);
  });
  it("intercambia dos gorros sin mutar el original", () => {
    expect(changeDefaultCap(expected, first, 2)).toEqual([
      { player_id: first, cap_number: 2 },
      { player_id: second, cap_number: 1 },
    ]);
    expect(expected[0].cap_number).toBe(1);
  });
  it("si no tenía gorro, el compañero queda sin gorro al intercambiar", () => {
    expect(
      changeDefaultCap([{ ...expected[0], cap_number: null }, expected[1]], first, 2)[1].cap_number,
    ).toBeNull();
  });
});
