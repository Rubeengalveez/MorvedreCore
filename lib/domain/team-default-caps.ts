import { z } from "zod";
import type { CallupPick } from "./callup-selection";

const picksSchema = z
  .array(
    z.object({
      player_id: z.string().uuid(),
      cap_number: z.number().int().min(1).max(14).nullable(),
    }),
  )
  .max(500);

export const teamDefaultCapsSchema = z
  .object({
    team_id: z.string().uuid(),
    players: picksSchema,
    expected: picksSchema,
  })
  .superRefine(({ players, expected }, ctx) => {
    const ids = new Set(players.map((p) => p.player_id));
    const caps = players.flatMap((p) => (p.cap_number == null ? [] : [p.cap_number]));
    if (
      ids.size !== players.length ||
      new Set(expected.map((p) => p.player_id)).size !== expected.length ||
      players.length !== expected.length ||
      expected.some((p) => !ids.has(p.player_id))
    ) {
      ctx.addIssue({
        code: "custom",
        message: "La plantilla ha cambiado. Actualiza y vuelve a intentarlo.",
      });
    }
    if (new Set(caps).size !== caps.length)
      ctx.addIssue({ code: "custom", message: "Cada jugador necesita un gorro diferente." });
  });

export function changeDefaultCap(
  players: CallupPick[],
  playerId: string,
  cap: number | null,
): CallupPick[] {
  if (!players.some((p) => p.player_id === playerId)) return players;
  const previous = players.find((p) => p.player_id === playerId)?.cap_number ?? null;
  return players.map((p) =>
    p.player_id === playerId
      ? { ...p, cap_number: cap }
      : cap != null && p.cap_number === cap
        ? { ...p, cap_number: previous }
        : p,
  );
}

export function defaultCapsKey(players: CallupPick[]): string {
  return [...players]
    .sort((a, b) => a.player_id.localeCompare(b.player_id))
    .map((p) => `${p.player_id}:${p.cap_number ?? "-"}`)
    .join("|");
}
