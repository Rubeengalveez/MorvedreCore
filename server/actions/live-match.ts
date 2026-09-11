"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminAccess } from "@/server/actions/admin/_helpers";
import { canUseLiveMatch } from "@/lib/domain/permissions";
import { defaultPeriods, sheetSchema, type LiveRecord } from "@/lib/domain/live-match";
import type { Json } from "@/types/database";
import { revalidatePath } from "next/cache";

export type ActaPreparation = {
  players: { id: string; cap: number; name: string }[];
  opponent: string;
  team: string;
  reason: "caps" | "too_many";
};
class PreparationRequired extends Error {
  constructor(public preparation: ActaPreparation) {
    super("La convocatoria ya está. Revisa los gorros señalados para empezar.");
  }
}

async function loadLiveMatchImpl(matchId: string): Promise<LiveRecord> {
  z.uuid().parse(matchId);
  const access = await getAdminAccess();
  const me = access.profile;
  const db = await createClient();
  const { data: match, error } = await db
    .from("matches")
    .select("id,team_id,opponent,scheduled_at,final_score_them,competition_type,is_home,pool_name,location,teams(label,category_code)")
    .eq("id", matchId)
    .single();
  if (error || !match) throw new Error("No pudimos cargar el partido.");
  if (!canUseLiveMatch(access, match.team_id))
    throw new Error("El acta en directo está reservada al delegado de este equipo.");
  const { data: existing, error: sheetError } = await db
    .from("live_match_sheets")
    .select("*")
    .eq("match_id", matchId)
    .maybeSingle();
  if (sheetError)
    throw new Error(
      "No pudimos abrir el acta en directo. Comprueba la conexión y la configuración del servidor.",
    );
  const base = {
    matchId,
    owner: me.id,
    viewer: me.id,
    canEdit: true,
    opponent: match.opponent,
    team: match.teams?.label ?? "Morvedre",
    date: match.scheduled_at,
    competition: match.competition_type,
    venue: match.pool_name ?? match.location,
    homeAway: match.is_home ? ("home" as const) : ("away" as const),
    dirty: false,
  };
  if (existing)
    return {
      ...base,
      owner: existing.owner_id,
      revision: existing.revision,
      device: existing.device_id,
      mutation: existing.mutation_id,
      sheet: sheetSchema.parse(existing.document),
    };
  const [callups, stats] = await Promise.all([
    db
      .from("match_callups")
      .select("player_id,cap_number,profiles!match_callups_player_id_fkey(full_name)")
      .eq("match_id", matchId)
      .in("status", ["called", "confirmed"]),
    db
      .from("match_stats")
      .select("player_id,goals,exclusions,validated_at")
      .eq("match_id", matchId),
  ]);
  if (callups.error || stats.error) throw new Error("No pudimos leer la convocatoria.");
  if (stats.data.some((s) => s.validated_at))
    throw new Error("Este partido ya tiene un acta validada. Puedes verla desde el partido.");
  const players = callups.data
    .map((p) => ({
      id: p.player_id,
      cap: p.cap_number ?? 0,
      name: p.profiles?.full_name ?? "Jugador",
    }))
    .sort((a, b) => a.cap - b.cap);
  if (!players.length)
    throw new Error(
      "Todavía no hay jugadores convocados para este partido. Pide al entrenador que complete la convocatoria.",
    );
  if (players.length > 14) {
    throw new PreparationRequired({
      players,
      opponent: base.opponent,
      team: base.team,
      reason: "too_many",
    });
  }
  if (
    players.some((p) => p.cap < 1 || p.cap > 99) ||
    new Set(players.map((p) => p.cap)).size !== players.length
  ) {
    throw new PreparationRequired({
      players,
      opponent: base.opponent,
      team: base.team,
      reason: "caps",
    });
  }
  const sheet = sheetSchema.safeParse({
    version: 2,
    players,
    opponentCaps: Array.from({ length: 14 }, (_, i) => i + 1),
    periods: defaultPeriods(match.teams?.category_code ?? ""),
    period: 1,
    phase: "ready",
    keeper: players.find((p) => p.cap === 1 || p.cap === 13)?.cap ?? null,
    events: [],
    pending: null,
    baseline: players.map((p) => ({
      cap: p.cap,
      goals: stats.data.find((s) => s.player_id === p.id)?.goals ?? 0,
      exclusions: stats.data.find((s) => s.player_id === p.id)?.exclusions ?? 0,
    })),
    baselineThem: match.final_score_them ?? 0,
  });
  if (!sheet.success)
    throw new Error(
      "Hay datos del partido que necesitan revisión: " + sheet.error.issues[0]?.message,
    );
  return { ...base, revision: 0, device: "", mutation: "", sheet: sheet.data };
}

const saveSchema = z.object({
  matchId: z.uuid(),
  device: z.uuid(),
  revision: z.number().int().min(0),
  mutation: z.uuid(),
  sheet: sheetSchema,
  takeover: z.boolean().default(false),
});
async function syncLiveMatchImpl(input: z.input<typeof saveSchema>) {
  const data = saveSchema.parse(input);
  const db = await createClient();
  const { data: match, error } = await db
    .from("matches")
    .select("team_id")
    .eq("id", data.matchId)
    .single();
  if (error || !match)
    throw new Error("No pudimos comprobar el partido. Tus jugadas siguen en este móvil.");
  const access = await getAdminAccess();
  if (!canUseLiveMatch(access, match.team_id))
    throw new Error("El acta en directo está reservada al delegado de este equipo.");
  const me = access.profile;
  const { data: revision, error: saveError } = await createAdminClient().rpc(
    "save_live_match_sheet",
    {
      p_match: data.matchId,
      p_actor: me.id,
      p_device: data.device,
      p_revision: data.revision,
      p_mutation: data.mutation,
      p_document: data.sheet as unknown as Json,
      p_takeover: data.takeover,
    },
  );
  if (saveError) throw new Error(saveError.message);
  if (data.sheet.phase === "finished") {
    const { recomputeStreaksForMatch } = await import("@/server/actions/admin/streaks");
    await recomputeStreaksForMatch(data.matchId);
    const { recomputeSnapshotsForPlayers } = await import("@/server/actions/admin/rankings");
    const { data: seasonMatch, error: seasonError } = await db
      .from("matches")
      .select("season_id")
      .eq("id", data.matchId)
      .single();
    if (seasonError)
      throw new Error("Acta guardada. Falta actualizar los rankings; reintenta el envío.");
    await recomputeSnapshotsForPlayers(
      data.sheet.players.map((player) => player.id),
      seasonMatch.season_id,
    );
  }
  revalidatePath(`/matches/${data.matchId}`);
  revalidatePath(`/admin/matches/${data.matchId}`);
  return { revision, owner: me.id };
}

export async function loadLiveMatch(matchId: string) {
  try {
    return { ok: true as const, data: await loadLiveMatchImpl(matchId) };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "No pudimos abrir el acta.",
      preparation: error instanceof PreparationRequired ? error.preparation : undefined,
    };
  }
}

export async function prepareLiveMatch(input: {
  matchId: string;
  players: { id: string; cap: number }[];
}) {
  try {
    const data = z
      .object({
        matchId: z.uuid(),
        players: z
          .array(z.object({ id: z.uuid(), cap: z.number().int().min(1).max(99) }))
          .min(1)
          .max(14),
      })
      .parse(input);
    if (
      new Set(data.players.map((p) => p.cap)).size !== data.players.length ||
      new Set(data.players.map((p) => p.id)).size !== data.players.length
    )
      throw new Error("Cada jugador necesita un gorro diferente.");
    const access = await getAdminAccess();
    const db = await createClient();
    const { data: match, error } = await db
      .from("matches")
      .select("team_id")
      .eq("id", data.matchId)
      .single();
    if (error || !match || !canUseLiveMatch(access, match.team_id))
      throw new Error("Solo el delegado de este equipo puede preparar el acta.");
    const { error: saveError } = await createAdminClient().rpc("prepare_live_match_caps", {
      p_match: data.matchId,
      p_actor: access.profile.id,
      p_players: data.players,
    });
    if (saveError) throw new Error(saveError.message);
    revalidatePath(`/matches/${data.matchId}`);
    return { ok: true as const };
  } catch (error) {
    return {
      ok: false as const,
      error:
        error instanceof z.ZodError
          ? "Elige un gorro entre 1 y 99 para cada jugador."
          : error instanceof Error
            ? error.message
            : "No pudimos guardar los gorros.",
    };
  }
}
export async function syncLiveMatch(input: z.input<typeof saveSchema>) {
  try {
    return { ok: true as const, data: await syncLiveMatchImpl(input) };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "No pudimos sincronizar el acta.",
    };
  }
}
