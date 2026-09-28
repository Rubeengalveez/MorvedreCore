import { describe, expect, it } from "vitest";

import { prepareCallupSource, type CallupCandidate } from "@/lib/domain/callup-selection";

const candidates: CallupCandidate[] = [
  { player_id: "a", full_name: "Ana", cap_number: 1, has_conflict: false, is_current_team: true },
  { player_id: "b", full_name: "Bea", cap_number: 1, has_conflict: false, is_current_team: true },
  { player_id: "c", full_name: "Carla", cap_number: 3, has_conflict: true, is_current_team: true },
];

describe("fuentes rápidas de convocatoria", () => {
  it("reparte gorros únicos y omite jugadores no disponibles", () => {
    const result = prepareCallupSource(
      [
        { player_id: "a", cap_number: 1 },
        { player_id: "b", cap_number: 1 },
        { player_id: "c", cap_number: 3 },
      ],
      candidates,
      new Set(),
    );

    expect(result).toEqual({
      players: [
        { player_id: "a", cap_number: 1 },
        { player_id: "b", cap_number: 2 },
      ],
      omitted: 1,
    });
  });

  it("conserva en la edición al convocado actual con conflicto conocido", () => {
    const result = prepareCallupSource(
      [{ player_id: "c", cap_number: 3 }],
      candidates,
      new Set(["c"]),
    );
    expect(result.players).toEqual([{ player_id: "c", cap_number: 3 }]);
  });
});
