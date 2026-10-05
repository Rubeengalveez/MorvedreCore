"use server";

import { validateTimeoutChanges } from "@/lib/domain/live-match-timeouts";

import { reconcileLiveRoster } from "@/lib/domain/live-match-roster";
import { identifyLiveSheet } from "@/lib/domain/live-match-identity";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminAccess } from "@/server/actions/admin/_helpers";
import { canUseLiveMatch } from "@/lib/domain/permissions";
import {
  defaultPeriods,
  sheetSchema,
  type LiveRecord,
  type LiveSheet,
} from "@/lib/domain/live-match";
import type { Json } from "@/types/database";
import { scheduleNotificationPush } from "@/server/notification-push";
import { revalidatePath } from "next/cache";
import { prepareParticipation } from "@/lib/domain/live-match-participation";
import { rosterRequirementError } from "@/lib/domain/live-match-rules";
import { suggestCallupForMatch } from "@/server/actions/admin/matches";

export type ActaPreparation = {
  players: { id: string; cap: number; name: string }[];
  opponent: string;
  team: string;
  reason: "caps" | "too_many" | "keeper";
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
    .select(
      "id,team_id,opponent,scheduled_at,final_score_them,competition_type,is_home,pool_name,location,teams(label,category_code)",
    )
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
  const [suggestions, savedTemplate] = await Promise.allSettled([
    suggestCallupForMatch(matchId, false),
    db.from("team_callup_templates").select("player_id,cap_number").eq("team_id", match.team_id),
  ]);
  const base = {
    matchId,
    owner: me.id,
    viewer: me.id,
    canEdit: true,
    opponent: match.opponent,
    team: match.teams?.label ?? "Morvedre",
    date: match.scheduled_at,
    competition: match.competition_type,
    venue: match.location,
    homeAway: match.is_home ? ("home" as const) : ("away" as const),
    dirty: false,
    callupCandidates:
      suggestions.status === "fulfilled"
        ? suggestions.value.map((candidate) => ({
            player_id: candidate.player_id,
            full_name: candidate.full_name,
            cap_number: candidate.cap_number,
            has_conflict: candidate.has_conflict,
            is_current_team: candidate.source_team_id === null,
          }))
        : undefined,
    callupTemplate:
      savedTemplate.status === "fulfilled" && !savedTemplate.value.error
        ? (savedTemplate.value.data ?? [])
        : undefined,
  };
  if (existing)
    return {
      ...base,
      owner: existing.owner_id,
      revision: existing.revision,
      device: existing.device_id,
      mutation: existing.mutation_id,
      sheet: prepareParticipation(sheetSchema.parse(existing.document), match.teams?.category_code),
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
    players.some((p) => p.cap < 1 || p.cap > 14) ||
    new Set(players.map((p) => p.cap)).size !== players.length
  ) {
    throw new PreparationRequired({
      players,
      opponent: base.opponent,
      team: base.team,
      reason: "caps",
    });
  }
  if (!players.some((player) => player.cap === 1 || player.cap === 13)) {
    throw new PreparationRequired({
      players,
      opponent: base.opponent,
      team: base.team,
      reason: "keeper",
    });
  }
  const sheet = sheetSchema.safeParse({
    version: 2,
    category: match.teams?.category_code,
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
  return {
    ...base,
    revision: 0,
    device: "",
    mutation: "",
    sheet: identifyLiveSheet(prepareParticipation(sheet.data, match.teams?.category_code)),
  };
}

const saveSchema = z.object({
  matchId: z.uuid(),
  device: z.uuid(),
  revision: z.number().int().min(0),
  mutation: z.uuid(),
  sheet: sheetSchema,
  rosterEdit: z.boolean().optional(),
  takeover: z.boolean().default(false),
});
async function syncLiveMatchImpl(input: z.input<typeof saveSchema>) {
  const data = saveSchema.parse(input);
  const db = await createClient();
  const { data: match, error } = await db
    .from("matches")
    .select("team_id,teams(category_code)")
    .eq("id", data.matchId)
    .single();
  if (error || !match)
    throw new Error("No pudimos comprobar el partido. Tus jugadas siguen en este móvil.");
  const access = await getAdminAccess();
  if (!canUseLiveMatch(access, match.team_id))
    throw new Error("El acta en directo está reservada al delegado de este equipo.");
  const me = access.profile;
  const previous = await db
    .from("live_match_sheets")
    .select("document,mutation_id,device_id,owner_id")
    .eq("match_id", data.matchId)
    .maybeSingle();
  if (previous.error) throw new Error("No pudimos comprobar la versión del acta.");
  if (!data.takeover)
    validateTimeoutChanges(
      { ...data.sheet, category: match.teams?.category_code as LiveSheet["category"] },
      previous.data ? sheetSchema.parse(previous.data.document) : undefined,
    );
  const alreadySaved =
    previous.data?.mutation_id === data.mutation &&
    previous.data?.device_id === data.device &&
    previous.data?.owner_id === me.id;
  let canonical = data.sheet;
  if (
    data.sheet.phase !== "finished" &&
    data.sheet.category &&
    data.sheet.category !== match.teams?.category_code
  )
    throw new Error("La categoría del acta no coincide con el equipo del partido.");
  if (alreadySaved) canonical = identifyLiveSheet(sheetSchema.parse(previous.data!.document));
  else if (
    !data.rosterEdit &&
    !data.takeover &&
    (previous.data?.document as { phase?: string } | null)?.phase !== "finished"
  ) {
    const roster = await db
      .from("match_callups")
      .select("player_id,cap_number,profiles!match_callups_player_id_fkey(full_name)")
      .eq("match_id", data.matchId)
      .in("status", ["called", "confirmed"])
      .not("cap_number", "is", null);
    if (roster.error)
      throw new Error("No pudimos actualizar la convocatoria. Tus jugadas siguen guardadas.");
    canonical = reconcileLiveRoster(
      data.sheet,
      roster.data
        .filter((p): p is typeof p & { cap_number: number } => p.cap_number !== null)
        .map((p) => ({
          id: p.player_id,
          cap: p.cap_number,
          name: p.profiles?.full_name ?? "Jugador",
        })),
    );
  }
  if (data.rosterEdit && !alreadySaved) {
    const active = data.sheet.players.filter((player) => !player.retired);
    const requirement = rosterRequirementError(
      match.teams?.category_code,
      active.map((p) => p.cap),
    );
    if (requirement) throw new Error(requirement);
    if (
      active.length < 1 ||
      active.length > 14 ||
      active.some((player) => player.cap < 1 || player.cap > 14) ||
      new Set(active.map((player) => player.cap)).size !== active.length ||
      new Set(active.map((player) => player.id)).size !== active.length
    ) {
      throw new Error("Revisa los jugadores y gorros de la convocatoria.");
    }
    const [{ data: prior, error: priorError }, eligible] = await Promise.all([
      db.from("match_callups").select("player_id,status").eq("match_id", data.matchId),
      suggestCallupForMatch(data.matchId, false),
    ]);
    if (priorError) throw new Error("No pudimos comprobar la convocatoria actual.");
    const priorIds = new Set(
      (prior ?? [])
        .filter((row) => row.status === "called" || row.status === "confirmed")
        .map((row) => row.player_id),
    );
    const options = new Map(eligible.map((player) => [player.player_id, player]));
    if (
      active.some(
        (player) =>
          !priorIds.has(player.id) &&
          (!options.has(player.id) || options.get(player.id)?.has_conflict),
      )
    )
      throw new Error("Hay un jugador que ya no está disponible. Tus cambios siguen en el móvil.");
    canonical = identifyLiveSheet(data.sheet);
  }
  if (!alreadySaved && canonical.phase !== "finished") {
    const priorSheet = previous.data?.document as {
      phase?: string;
      opponentCaps?: number[];
    } | null;
    const starting = canonical.phase === "playing" && priorSheet?.phase !== "playing";
    if (starting) {
      const own = rosterRequirementError(
        match.teams?.category_code,
        canonical.players.filter((p) => !p.retired).map((p) => p.cap),
      );
      if (own) throw new Error(own);
    }
    if (
      starting ||
      JSON.stringify(priorSheet?.opponentCaps ?? []) !== JSON.stringify(canonical.opponentCaps)
    ) {
      const rival = rosterRequirementError(
        match.teams?.category_code,
        canonical.opponentCaps,
        "them",
      );
      if (rival) throw new Error(rival);
    }
  }
  const { data: revision, error: saveError } = await createAdminClient().rpc(
    "save_live_match_sheet",
    {
      p_match: data.matchId,
      p_actor: me.id,
      p_device: data.device,
      p_revision: data.revision,
      p_mutation: data.mutation,
      p_document:
        data.takeover && previous.data ? previous.data.document : (canonical as unknown as Json),
      p_takeover: data.takeover,
      ...(data.rosterEdit ? { p_roster_edit: true } : {}),
    },
  );
  if (saveError) {
    if (saveError.code === "PGRST202")
      throw new Error(
        "La actualización del servidor está pendiente. El acta sigue guardada en este móvil.",
      );
    if (saveError.message.startsWith("CONFLICT:"))
      throw new Error(saveError.message.slice(9).trim());
    throw new Error("No pudimos sincronizar el acta. Tus cambios siguen guardados en este móvil.");
  }
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
      canonical.players.map((player) => player.id),
      seasonMatch.season_id,
    );
  }
  scheduleNotificationPush();
  revalidatePath(`/matches/${data.matchId}`);
  revalidatePath(`/admin/matches/${data.matchId}`);
  return { revision, owner: me.id, sheet: canonical };
}

export async function loadLiveMatch(matchId: string) {
  try {
    return { ok: true as const, data: await loadLiveMatchImpl(matchId) };
  } catch (error) {
    return {
      ok: false as const,
      error:
        error instanceof z.ZodError
          ? "Hay datos del acta que necesitan revisión. Conservamos el documento guardado."
          : error instanceof Error
            ? error.message
            : "No pudimos abrir el acta.",
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
          .array(z.object({ id: z.uuid(), cap: z.number().int().min(1).max(14) }))
          .min(1)
          .max(14),
      })
      .parse(input);
    if (
      new Set(data.players.map((p) => p.cap)).size !== data.players.length ||
      new Set(data.players.map((p) => p.id)).size !== data.players.length
    )
      throw new Error("Cada jugador necesita un gorro diferente.");
    if (!data.players.some((player) => player.cap === 1 || player.cap === 13))
      throw new Error("Asigna el gorro 1 o 13 a un portero antes de abrir el acta.");
    const access = await getAdminAccess();
    const db = await createClient();
    const { data: match, error } = await db
      .from("matches")
      .select("team_id")
      .eq("id", data.matchId)
      .single();
    if (error || !match || !canUseLiveMatch(access, match.team_id))
      throw new Error("Solo el entrenador o delegado de este equipo puede preparar el acta.");
    const { error: saveError } = await createAdminClient().rpc("prepare_live_match_caps", {
      p_match: data.matchId,
      p_actor: access.profile.id,
      p_players: data.players,
    });
    if (saveError) throw new Error(saveError.message);
    scheduleNotificationPush();
    revalidatePath(`/matches/${data.matchId}`);
    return { ok: true as const };
  } catch (error) {
    return {
      ok: false as const,
      error:
        error instanceof z.ZodError
          ? "Elige un gorro entre 1 y 14 para cada jugador."
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
      error:
        error instanceof z.ZodError
          ? (error.issues.find((issue) => issue.code === "custom")?.message ??
            "Revisa los datos del acta. Tus cambios siguen guardados en este móvil.")
          : error instanceof Error
            ? error.message
            : "No pudimos sincronizar el acta.",
    };
  }
}
