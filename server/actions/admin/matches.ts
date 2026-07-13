"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { insertNotificationsWithPush } from "./notification-dispatch";
import type { Tables } from "@/types/database";
import {
  createCallupSchema,
  createMatchSchema,
  recordMatchStatSchema,
  updateCallupSchema,
  updateMatchSchema,
  validateMatchStatsSchema,
} from "@/lib/domain/admin-schemas";
import {
  canCallUpTo,
  defaultCapForPlayer,
  findConflicts,
  isPlayerBRuleBlocked,
  suggestCallup,
  type AvailabilityRow,
  type CallupSuggestion,
  type PlayerForCallup,
  type TeamForCallup,
} from "@/lib/domain/callups";
import { safeInferCategory, type CategoryCode } from "@/lib/domain/categories";

import { requireCoachOf } from "./_helpers";

async function recomputeRankingForMatchAll(matchId: string): Promise<void> {
  const { recomputeSnapshotForPlayer } = await import("./rankings");
  const { recomputeStreaksForMatch } = await import("./streaks");
  const supabase = await createClient();
  const { data: match } = await supabase
    .from("matches")
    .select("season_id")
    .eq("id", matchId)
    .maybeSingle();
  const seasonId = (match as { season_id?: string } | null)?.season_id;
  if (!seasonId) return;
  const { data: callupRows } = await supabase
    .from("match_callups")
    .select("player_id")
    .eq("match_id", matchId);
  const playerIds = Array.from(
    new Set((callupRows ?? []).map((r) => (r as { player_id: string }).player_id)),
  );
  for (const playerId of playerIds) {
    await recomputeSnapshotForPlayer(playerId, seasonId).catch(() => {
      // ignore individual failures
    });
  }
  await recomputeStreaksForMatch(matchId).catch((e) => {
    console.error("recomputeStreaksForMatch error", e);
  });
}

export type MatchRow = Tables<"matches">;
export type CallupRow = Tables<"match_callups">;
export type MatchStatRow = Tables<"match_stats">;

function throwIfError(error: { message: string } | null, fallback: string): void {
  if (error) {
    throw new Error(fallback);
  }
}

function notificationTitle(opponent: string, status: string): string {
  if (status === "confirmed") return "Convocatoria confirmada";
  if (status === "declined") return "Has rechazado la convocatoria";
  if (status === "withdrawn") return "Te has dado de baja de la convocatoria";
  if (status === "no_show") return "No te has presentado al partido";
  return `Convocatoria: ${opponent}`;
}

function localIsoDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

async function loadCurrentUserProfile(): Promise<{
  id: string;
  authUserId: string;
  isAdmin: boolean;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("No has iniciado sesión.");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  throwIfError(profileError, "No pudimos verificar tu identidad.");
  if (!profile) {
    throw new Error("Tu perfil no está configurado.");
  }

  const { data: adminRole } = await supabase
    .from("user_roles")
    .select("role")
    .eq("profile_id", profile.id)
    .eq("role", "admin")
    .is("scope_team_id", null)
    .maybeSingle();

  return { id: profile.id, authUserId: user.id, isAdmin: Boolean(adminRole) };
}

export async function createMatch(input: {
  season_id: string;
  team_id: string;
  opponent: string;
  competition_type?: "league" | "cup" | "tournament" | "friendly";
  is_home?: boolean;
  location?: string | null;
  pool_name?: string | null;
  scheduled_at: string;
  logistics_enabled?: boolean;
  notes?: string | null;
}): Promise<MatchRow> {
  const parsed = createMatchSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Datos inválidos.");
  }

  await requireCoachOf(parsed.data.team_id);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("matches")
    .insert({
      season_id: parsed.data.season_id,
      team_id: parsed.data.team_id,
      opponent: parsed.data.opponent,
      competition_type: parsed.data.competition_type ?? "league",
      is_home: parsed.data.is_home ?? true,
      location: parsed.data.location ?? null,
      pool_name: parsed.data.pool_name ?? null,
      scheduled_at: parsed.data.scheduled_at,
      logistics_enabled: parsed.data.logistics_enabled ?? false,
      notes: parsed.data.notes ?? null,
    })
    .select("*")
    .single();

  throwIfError(error, "No pudimos crear el partido. Inténtalo de nuevo.");
  if (!data) {
    throw new Error("No pudimos crear el partido. Inténtalo de nuevo.");
  }

  revalidatePath("/admin/matches");
  revalidatePath("/admin");

  return data;
}

export async function updateMatch(
  id: string,
  input: Partial<{
    season_id: string;
    team_id: string;
    opponent: string;
    competition_type: "league" | "cup" | "tournament" | "friendly";
    is_home: boolean;
    location: string | null;
    pool_name: string | null;
    scheduled_at: string;
    status: "scheduled" | "in_progress" | "played" | "cancelled" | "postponed";
    logistics_enabled: boolean;
    notes: string | null;
    final_score_us: number | null;
    final_score_them: number | null;
  }>,
): Promise<MatchRow> {
  const parsed = updateMatchSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Datos inválidos.");
  }

  if (Object.keys(parsed.data).length === 0) {
    throw new Error("No hay cambios para guardar.");
  }

  const supabase = await createClient();
  const { data: existing, error: existingError } = await supabase
    .from("matches")
    .select("team_id")
    .eq("id", id)
    .maybeSingle();

  throwIfError(existingError, "No pudimos cargar el partido.");
  if (!existing) {
    throw new Error("El partido no existe.");
  }

  await requireCoachOf(parsed.data.team_id ?? existing.team_id);

  const { data, error } = await supabase
    .from("matches")
    .update(parsed.data)
    .eq("id", id)
    .select("*")
    .single();

  throwIfError(error, "No pudimos actualizar el partido. Inténtalo de nuevo.");
  if (!data) {
    throw new Error("No pudimos actualizar el partido. Inténtalo de nuevo.");
  }

  revalidatePath("/admin/matches");
  revalidatePath(`/admin/matches/${id}`);

  return data;
}

export async function deleteMatch(id: string): Promise<void> {
  const supabase = await createClient();
  const { data: existing, error: existingError } = await supabase
    .from("matches")
    .select("team_id")
    .eq("id", id)
    .maybeSingle();

  throwIfError(existingError, "No pudimos cargar el partido.");
  if (!existing) {
    throw new Error("El partido no existe.");
  }

  await requireCoachOf(existing.team_id);

  const { error } = await supabase.from("matches").delete().eq("id", id);

  throwIfError(error, "No pudimos eliminar el partido. Inténtalo de nuevo.");

  revalidatePath("/admin/matches");
}

export async function createCallup(input: {
  match_id: string;
  player_id: string;
  cap_number?: number | null;
  source_team_id?: string | null;
}): Promise<CallupRow> {
  const parsed = createCallupSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Datos inválidos.");
  }

  const supabase = await createClient();
  const { data: match, error: matchError } = await supabase
    .from("matches")
    .select("id, team_id, scheduled_at, opponent, teams(id, category_code, label)")
    .eq("id", parsed.data.match_id)
    .maybeSingle();

  throwIfError(matchError, "No pudimos cargar el partido.");
  if (!match) {
    throw new Error("El partido no existe.");
  }

  await requireCoachOf(match.team_id);

  const targetTeam = (
    match as { teams?: { id: string; category_code: string; label: string } | null }
  ).teams;
  if (!targetTeam) {
    throw new Error("No pudimos cargar el equipo del partido.");
  }

  const { data: player, error: playerError } = await supabase
    .from("profiles")
    .select("id, full_name, cap_number, birth_year")
    .eq("id", parsed.data.player_id)
    .maybeSingle();

  throwIfError(playerError, "No pudimos cargar al jugador.");
  if (!player) {
    throw new Error("El jugador no existe.");
  }

  if (player.birth_year == null) {
    throw new Error("El jugador no tiene año de nacimiento. No se puede comprobar la categoría.");
  }

  const { data: roster, error: rosterError } = await supabase
    .from("team_rosters")
    .select("team_id")
    .eq("player_id", parsed.data.player_id)
    .is("left_at", null)
    .maybeSingle();

  throwIfError(rosterError, "No pudimos cargar la plantilla del jugador.");

  const allTeamsPromise = supabase.from("teams").select("id, category_code, label");
  const availabilityPromise = supabase
    .from("match_availability")
    .select("player_id, date, available, reason")
    .eq("player_id", parsed.data.player_id)
    .eq("date", localIsoDate(match.scheduled_at));
  const existingCallupsPromise = supabase
    .from("match_callups")
    .select("player_id, cap_number")
    .eq("match_id", parsed.data.match_id);

  const [{ data: allTeams }, { data: availability }, { data: existingCallups }] = await Promise.all(
    [allTeamsPromise, availabilityPromise, existingCallupsPromise],
  );

  if (existingCallups?.some((c) => c.player_id === parsed.data.player_id)) {
    throw new Error("El jugador ya está convocado en este partido.");
  }

  const teamsForCallup: TeamForCallup[] = (allTeams ?? []).map((t) => ({
    id: t.id,
    category_code: t.category_code as TeamForCallup["category_code"],
    label: t.label,
  }));

  const playerCurrentTeamId = roster?.team_id ?? null;
  if (
    playerCurrentTeamId &&
    isPlayerBRuleBlocked(parsed.data.player_id, playerCurrentTeamId, targetTeam.id, teamsForCallup)
  ) {
    throw new Error("Regla B: este jugador no puede subir a este equipo.");
  }

  const currentYear = new Date().getFullYear();
  const playerCategory = safeInferCategory(player.birth_year, currentYear);
  if (playerCategory && !canCallUpTo(playerCategory, targetTeam.category_code as CategoryCode)) {
    throw new Error("El jugador no puede ser convocado en este equipo (categoría no compatible).");
  }

  const conflict = findConflicts(
    parsed.data.player_id,
    match.scheduled_at,
    (availability ?? []).map((a) => ({
      player_id: a.player_id,
      date: a.date,
      available: a.available,
      reason: a.reason,
    })),
  );
  if (conflict) {
    throw new Error("El jugador ha marcado que no está disponible ese día.");
  }

  const existingCaps = (existingCallups ?? [])
    .filter((c): c is { player_id: string; cap_number: number } => c.cap_number != null)
    .map((c) => ({ player_id: c.player_id, cap_number: c.cap_number }));

  const capNumber =
    parsed.data.cap_number ??
    defaultCapForPlayer(
      parsed.data.player_id,
      { cap_number: player.cap_number },
      targetTeam.id,
      existingCaps,
    );

  const sourceTeamId =
    parsed.data.source_team_id !== undefined
      ? parsed.data.source_team_id
      : playerCurrentTeamId && playerCurrentTeamId !== targetTeam.id
        ? playerCurrentTeamId
        : null;

  const { data, error } = await supabase
    .from("match_callups")
    .insert({
      match_id: parsed.data.match_id,
      player_id: parsed.data.player_id,
      cap_number: capNumber,
      source_team_id: sourceTeamId,
      status: "called",
    })
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error("El jugador ya está convocado en este partido.");
    }
    throw new Error("No pudimos añadir la convocatoria. Inténtalo de nuevo.");
  }
  if (!data) {
    throw new Error("No pudimos añadir la convocatoria. Inténtalo de nuevo.");
  }

  const scheduledDate = new Date(match.scheduled_at);
  const dateLabel = scheduledDate.toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const { error: notifyError } = await insertNotificationsWithPush({
    recipient_id: parsed.data.player_id,
    kind: "convocatoria",
    title: notificationTitle(match.opponent, "called"),
    body: `${dateLabel} · ${targetTeam.label}\nRival: ${match.opponent}`,
    href: `/admin/matches/${parsed.data.match_id}`,
    related_match_id: parsed.data.match_id,
  });
  if (notifyError) {
    throw new Error("Se añadió la convocatoria, pero no pudimos avisar al jugador.");
  }

  revalidatePath("/admin/matches");
  revalidatePath(`/admin/matches/${parsed.data.match_id}`);

  return data;
}

export async function updateCallup(
  matchId: string,
  playerId: string,
  input: {
    cap_number?: number | null;
    status?: "called" | "confirmed" | "declined" | "withdrawn" | "no_show";
  },
): Promise<CallupRow> {
  const parsed = updateCallupSchema.safeParse({
    callup_id: `${matchId}:${playerId}`,
    cap_number: input.cap_number,
    status: input.status,
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Datos inválidos.");
  }

  if (parsed.data.cap_number === undefined && parsed.data.status === undefined) {
    throw new Error("No hay cambios para guardar.");
  }

  const update: {
    cap_number?: number | null;
    status?: string;
    confirmed_at?: string | null;
  } = {};
  if (parsed.data.cap_number !== undefined) {
    update.cap_number = parsed.data.cap_number;
  }
  if (parsed.data.status) {
    update.status = parsed.data.status;
    update.confirmed_at = parsed.data.status === "confirmed" ? new Date().toISOString() : null;
  }

  const supabase = await createClient();
  const { data: match, error: matchError } = await supabase
    .from("matches")
    .select("team_id")
    .eq("id", matchId)
    .maybeSingle();

  throwIfError(matchError, "No pudimos cargar el partido.");
  if (!match) {
    throw new Error("El partido no existe.");
  }

  await requireCoachOf(match.team_id);

  const { data, error } = await supabase
    .from("match_callups")
    .update(update)
    .eq("match_id", matchId)
    .eq("player_id", playerId)
    .select("*")
    .single();

  throwIfError(error, "No pudimos actualizar la convocatoria. Inténtalo de nuevo.");
  if (!data) {
    throw new Error("No pudimos actualizar la convocatoria. Inténtalo de nuevo.");
  }

  revalidatePath("/admin/matches");
  revalidatePath(`/admin/matches/${matchId}`);

  return data;
}

export async function setMyCallupStatus(input: {
  match_id: string;
  status: "confirmed" | "declined" | "withdrawn";
}): Promise<CallupRow> {
  const me = await loadCurrentUserProfile();

  const parsed = z
    .object({
      match_id: z.string().uuid("Partido inválido."),
      status: z.enum(["confirmed", "declined", "withdrawn"]),
    })
    .safeParse({
      match_id: input.match_id,
      status: input.status,
    });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Datos inválidos.");
  }

  const supabase = await createClient();
  const { data: match, error: matchError } = await supabase
    .from("matches")
    .select("id, status, scheduled_at")
    .eq("id", parsed.data.match_id)
    .maybeSingle();

  throwIfError(matchError, "No pudimos cargar el partido.");
  if (!match) {
    throw new Error("El partido no existe.");
  }
  if (match.status !== "scheduled" && match.status !== "in_progress") {
    throw new Error("Este partido ya no admite cambios de convocatoria. Habla con tu entrenador.");
  }

  const update: {
    status: string;
    confirmed_at: string | null;
  } = {
    status: parsed.data.status,
    confirmed_at: parsed.data.status === "confirmed" ? new Date().toISOString() : null,
  };

  const { data, error } = await supabase
    .from("match_callups")
    .update(update)
    .eq("match_id", parsed.data.match_id)
    .eq("player_id", me.id)
    .select("*")
    .single();

  throwIfError(error, "No pudimos guardar tu respuesta. Inténtalo de nuevo.");
  if (!data) {
    throw new Error("No pudimos guardar tu respuesta. Inténtalo de nuevo.");
  }

  revalidatePath(`/matches/${parsed.data.match_id}`);
  revalidatePath("/calendar");
  revalidatePath("/dashboard");

  return data;
}

export async function deleteCallup(matchId: string, playerId: string): Promise<void> {
  const supabase = await createClient();
  const { data: match, error: matchError } = await supabase
    .from("matches")
    .select("team_id")
    .eq("id", matchId)
    .maybeSingle();

  throwIfError(matchError, "No pudimos cargar el partido.");
  if (!match) {
    throw new Error("El partido no existe.");
  }

  await requireCoachOf(match.team_id);

  const { error } = await supabase
    .from("match_callups")
    .delete()
    .eq("match_id", matchId)
    .eq("player_id", playerId);

  throwIfError(error, "No pudimos eliminar la convocatoria. Inténtalo de nuevo.");

  revalidatePath("/admin/matches");
  revalidatePath(`/admin/matches/${matchId}`);
}

export async function setMatchStatus(
  matchId: string,
  status: "scheduled" | "in_progress" | "played" | "cancelled" | "postponed",
  finalScoreUs: number | null = null,
  finalScoreThem: number | null = null,
): Promise<MatchRow> {
  const supabase = await createClient();
  const { data: match, error: matchError } = await supabase
    .from("matches")
    .select("team_id")
    .eq("id", matchId)
    .maybeSingle();

  throwIfError(matchError, "No pudimos cargar el partido.");
  if (!match) {
    throw new Error("El partido no existe.");
  }

  await requireCoachOf(match.team_id);

  const { data, error } = await supabase
    .from("matches")
    .update({
      status,
      final_score_us: finalScoreUs,
      final_score_them: finalScoreThem,
    })
    .eq("id", matchId)
    .select("*")
    .single();

  throwIfError(error, "No pudimos actualizar el estado del partido. Inténtalo de nuevo.");
  if (!data) {
    throw new Error("No pudimos actualizar el estado del partido. Inténtalo de nuevo.");
  }

  revalidatePath("/admin/matches");
  revalidatePath(`/admin/matches/${matchId}`);

  return data;
}

export async function recordMatchStat(input: {
  match_id: string;
  player_id: string;
  goals?: number;
  exclusions?: number;
  mvp?: boolean;
}): Promise<MatchStatRow> {
  const me = await loadCurrentUserProfile();

  const parsed = recordMatchStatSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Datos inválidos.");
  }

  const supabase = await createClient();
  const { data: match, error: matchError } = await supabase
    .from("matches")
    .select("id, team_id, opponent")
    .eq("id", parsed.data.match_id)
    .maybeSingle();

  throwIfError(matchError, "No pudimos cargar el partido.");
  if (!match) {
    throw new Error("El partido no existe.");
  }

  const { data: callup, error: callupError } = await supabase
    .from("match_callups")
    .select("player_id")
    .eq("match_id", parsed.data.match_id)
    .eq("player_id", parsed.data.player_id)
    .maybeSingle();

  throwIfError(callupError, "No pudimos comprobar la convocatoria.");
  if (!callup) {
    throw new Error("Solo puedes registrar estadísticas de jugadores que estaban convocados.");
  }

  const { data: existing, error: existingError } = await supabase
    .from("match_stats")
    .select("validated_by")
    .eq("match_id", parsed.data.match_id)
    .eq("player_id", parsed.data.player_id)
    .maybeSingle();

  throwIfError(existingError, "No pudimos comprobar la estadística existente.");

  if (existing?.validated_by != null && !me.isAdmin) {
    throw new Error("La estadística ya está validada y solo un administrador puede modificarla.");
  }

  const { data, error } = await supabase
    .from("match_stats")
    .upsert(
      {
        match_id: parsed.data.match_id,
        player_id: parsed.data.player_id,
        goals: parsed.data.goals ?? 0,
        exclusions: parsed.data.exclusions ?? 0,
        mvp: parsed.data.mvp ?? false,
        entered_by: me.id,
        entered_at: new Date().toISOString(),
      },
      { onConflict: "match_id,player_id" },
    )
    .select("*")
    .single();

  throwIfError(error, "No pudimos guardar la estadística. Inténtalo de nuevo.");
  if (!data) {
    throw new Error("No pudimos guardar la estadística. Inténtalo de nuevo.");
  }

  revalidatePath("/admin/matches");
  revalidatePath(`/admin/matches/${parsed.data.match_id}`);

  const { recomputeStreaksForMatch } = await import("./streaks");
  await recomputeStreaksForMatch(parsed.data.match_id).catch(() => undefined);

  return data;
}

export async function validateMatchStats(matchId: string): Promise<void> {
  const me = await loadCurrentUserProfile();

  const parsed = validateMatchStatsSchema.safeParse({ match_id: matchId });
  if (!parsed.success) {
    throw new Error("Identificador inválido.");
  }

  if (!me.isAdmin) {
    const supabase = await createClient();
    const { data: match } = await supabase
      .from("matches")
      .select("team_id")
      .eq("id", parsed.data.match_id)
      .maybeSingle();
    if (!match) {
      throw new Error("El partido no existe.");
    }
    const { data: role } = await supabase
      .from("user_roles")
      .select("role")
      .eq("profile_id", me.id)
      .eq("role", "coach")
      .eq("scope_team_id", match.team_id)
      .maybeSingle();
    if (!role) {
      throw new Error("Solo un entrenador o administrador puede validar las estadísticas.");
    }
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("match_stats")
    .update({
      validated_by: me.id,
      validated_at: new Date().toISOString(),
    })
    .eq("match_id", parsed.data.match_id)
    .is("validated_at", null);

  throwIfError(error, "No pudimos validar las estadísticas. Inténtalo de nuevo.");

  await recomputeRankingForMatchAll(parsed.data.match_id).catch(() => {
    // No bloqueamos la validación si el recompute falla.
  });

  revalidatePath("/admin/matches");
  revalidatePath(`/admin/matches/${parsed.data.match_id}`);
  revalidatePath("/rankings");
  revalidatePath("/profile");
}

export async function suggestCallupForMatch(matchId: string): Promise<CallupSuggestion[]> {
  const supabase = await createClient();

  const { data: match, error: matchError } = await supabase
    .from("matches")
    .select("id, scheduled_at, team_id, teams(id, category_code, label)")
    .eq("id", matchId)
    .maybeSingle();

  throwIfError(matchError, "No pudimos cargar el partido.");
  if (!match) {
    throw new Error("El partido no existe.");
  }

  await requireCoachOf(match.team_id);

  const targetTeamRow = (
    match as { teams?: { id: string; category_code: string; label: string } | null }
  ).teams;
  if (!targetTeamRow) {
    throw new Error("No pudimos cargar el equipo del partido.");
  }
  const targetTeam: TeamForCallup = {
    id: targetTeamRow.id,
    category_code: targetTeamRow.category_code as TeamForCallup["category_code"],
    label: targetTeamRow.label,
  };

  const [
    { data: allTeams, error: teamsError },
    { data: rosters, error: rostersError },
    { data: profiles, error: profilesError },
    { data: availability, error: availabilityError },
  ] = await Promise.all([
    supabase.from("teams").select("id, category_code, label"),
    supabase.from("team_rosters").select("team_id, player_id").is("left_at", null),
    supabase.from("profiles").select("id, full_name, birth_year, cap_number"),
    supabase
      .from("match_availability")
      .select("player_id, date, available, reason")
      .eq("date", localIsoDate(match.scheduled_at)),
  ]);

  throwIfError(teamsError, "No pudimos cargar los equipos.");
  throwIfError(rostersError, "No pudimos cargar las plantillas.");
  throwIfError(profilesError, "No pudimos cargar los perfiles.");
  throwIfError(availabilityError, "No pudimos cargar la disponibilidad.");

  const teamsForCallup: TeamForCallup[] = (allTeams ?? []).map((t) => ({
    id: t.id,
    category_code: t.category_code as TeamForCallup["category_code"],
    label: t.label,
  }));

  const currentTeamByPlayer = new Map<string, string>();
  for (const r of rosters ?? []) {
    if (!r.player_id || !r.team_id) continue;
    currentTeamByPlayer.set(r.player_id, r.team_id);
  }

  const currentYear = new Date().getFullYear();
  const players: PlayerForCallup[] = (profiles ?? []).map((p) => {
    const birth = p.birth_year;
    const category =
      birth != null
        ? (safeInferCategory(birth, currentYear) ?? targetTeam.category_code)
        : targetTeam.category_code;
    return {
      id: p.id,
      full_name: p.full_name,
      category_code: category as PlayerForCallup["category_code"],
      cap_number: p.cap_number,
      current_team_id: currentTeamByPlayer.get(p.id) ?? null,
    };
  });

  const availabilityRows: AvailabilityRow[] = (availability ?? []).map((a) => ({
    player_id: a.player_id,
    date: a.date,
    available: a.available,
    reason: a.reason,
  }));

  return suggestCallup({
    targetTeam,
    scheduledAt: match.scheduled_at,
    allTeams: teamsForCallup,
    allPlayers: players,
    allAvailability: availabilityRows,
  });
}
