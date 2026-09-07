"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminAccess, requireMatchStaffOf } from "@/server/actions/admin/_helpers";
import { canManageTeam } from "@/lib/domain/permissions";
import { defaultPeriods, sheetSchema, type LiveRecord } from "@/lib/domain/live-match";
import type { Json } from "@/types/database";
import { revalidatePath } from "next/cache";

async function loadLiveMatchImpl(matchId: string): Promise<LiveRecord> {
  z.uuid().parse(matchId);
  const access = await getAdminAccess();
  const me = access.profile;
  const db = await createClient();
  const { data: match, error } = await db
    .from("matches")
    .select("id,team_id,opponent,scheduled_at,final_score_them,teams(label,category_code)")
    .eq("id", matchId)
    .single();
  if (error || !match) throw new Error("No pudimos cargar el partido.");
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
    canEdit: canManageTeam(access, "match_operations", match.team_id),
    opponent: match.opponent,
    team: match.teams?.label ?? "Morvedre",
    date: match.scheduled_at,
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
  await requireMatchStaffOf(match.team_id);
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
  const sheet = sheetSchema.safeParse({
    version: 1,
    players,
    opponentCaps: Array.from({ length: 13 }, (_, i) => i + 1),
    periods: defaultPeriods(match.teams?.category_code ?? ""),
    period: 1,
    phase: "ready",
    keeper: players.find((p) => p.cap === 1 || p.cap === 13)?.cap ?? null,
    events: [],
    baseline: players.map((p) => ({
      cap: p.cap,
      goals: stats.data.find((s) => s.player_id === p.id)?.goals ?? 0,
      exclusions: stats.data.find((s) => s.player_id === p.id)?.exclusions ?? 0,
    })),
    baselineThem: match.final_score_them ?? 0,
  });
  if (!sheet.success)
    throw new Error(
      "Prepara la convocatoria y asigna un gorro diferente a cada jugador antes de abrir el acta.",
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
  const me = await requireMatchStaffOf(match.team_id);
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
