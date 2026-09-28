import { notFound } from "next/navigation";
import type { Route } from "next";

import { AdminPageShell } from "@/components/admin/admin-page";
import { createClient } from "@/lib/supabase/server";
import { getTeamScope } from "@/lib/domain/permissions";
import { getRenderAdminAccess } from "@/server/actions/admin/_helpers";
import { suggestCallupForMatch } from "@/server/actions/admin/matches";

import { CallupEditor, type CallupCandidate, type CallupPick } from "./_components/callup-editor";
import { MatchEditorHeader } from "./_components/match-editor-header";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const COMPETITION_LABELS: Record<string, string> = {
  league: "Liga",
  cup: "Copa",
  tournament: "Torneo",
  friendly: "Amistoso",
};

export default async function MatchCallupPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const { id } = await params;
  const { from } = await searchParams;
  const access = await getRenderAdminAccess();
  const scope = getTeamScope(access, "match_operations");
  if (scope?.length === 0) notFound();
  const supabase = await createClient();
  let matchQuery = supabase
    .from("matches")
    .select(
      "id, team_id, opponent, competition_type, is_home, scheduled_at, status, final_score_us, final_score_them, teams!matches_team_id_fkey(label)",
    )
    .eq("id", id);
  if (scope) matchQuery = matchQuery.in("team_id", scope);
  const { data: match, error: matchError } = await matchQuery.maybeSingle();
  if (matchError || !match) notFound();

  const teamJoin = match.teams;
  const teamLabel = (Array.isArray(teamJoin) ? teamJoin[0]?.label : teamJoin?.label) ?? "Morvedre";
  const [callupsResult, templateResult, earlierResult, sheetResult, statsResult, suggestions] =
    await Promise.all([
      supabase
        .from("match_callups")
        .select("player_id, cap_number, status, profiles!match_callups_player_id_fkey(full_name)")
        .eq("match_id", id),
      supabase
        .from("team_callup_templates")
        .select("player_id, cap_number")
        .eq("team_id", match.team_id)
        .order("cap_number"),
      supabase
        .from("matches")
        .select("id, scheduled_at")
        .eq("team_id", match.team_id)
        .lt("scheduled_at", match.scheduled_at)
        .neq("status", "cancelled")
        .order("scheduled_at", { ascending: false })
        .limit(30),
      supabase.from("live_match_sheets").select("match_id").eq("match_id", id).maybeSingle(),
      supabase.from("match_stats").select("player_id").eq("match_id", id).limit(1),
      suggestCallupForMatch(id, false),
    ]);
  if (
    callupsResult.error ||
    templateResult.error ||
    earlierResult.error ||
    sheetResult.error ||
    statsResult.error
  ) {
    throw new Error("No pudimos cargar la convocatoria. Inténtalo de nuevo.");
  }

  let previous: CallupPick[] = [];
  let previousLabel: string | null = null;
  for (const oldMatch of earlierResult.data ?? []) {
    const { data, error } = await supabase
      .from("match_callups")
      .select("player_id, cap_number, status")
      .eq("match_id", oldMatch.id);
    if (error) throw new Error("No pudimos revisar la convocatoria anterior.");
    const players = (data ?? [])
      .filter(
        (player) =>
          (player.status === "called" || player.status === "confirmed") &&
          player.cap_number != null,
      )
      .map((player) => ({ player_id: player.player_id, cap_number: player.cap_number }));
    if (players.length === 0) continue;
    previous = players;
    previousLabel = new Intl.DateTimeFormat("es-ES", {
      day: "numeric",
      month: "short",
      timeZone: "Europe/Madrid",
    }).format(new Date(oldMatch.scheduled_at));
    break;
  }

  const callups = callupsResult.data ?? [];
  const initial: CallupPick[] = callups
    .filter((player) => player.status === "called" || player.status === "confirmed")
    .map((player) => ({ player_id: player.player_id, cap_number: player.cap_number }));
  const byId = new Map<string, CallupCandidate>(
    suggestions.map((player) => [
      player.player_id,
      {
        player_id: player.player_id,
        full_name: player.full_name,
        cap_number: player.cap_number,
        has_conflict: player.has_conflict,
        is_current_team: player.source_team_id === null,
      },
    ]),
  );
  for (const callup of callups) {
    if (byId.has(callup.player_id)) continue;
    const profile = Array.isArray(callup.profiles) ? callup.profiles[0] : callup.profiles;
    byId.set(callup.player_id, {
      player_id: callup.player_id,
      full_name: profile?.full_name ?? "Jugador del equipo",
      cap_number: callup.cap_number,
      has_conflict: false,
      is_current_team: true,
    });
  }

  const origin = from === "match" ? "match" : "admin";
  const backHref = origin === "match" ? (`/matches/${id}` as Route) : "/admin/matches";
  const backLabel = origin === "match" ? "Volver al partido" : "Volver a partidos";
  const editable =
    (match.status === "scheduled" || match.status === "postponed") &&
    !sheetResult.data &&
    (statsResult.data ?? []).length === 0;

  return (
    <AdminPageShell className="gap-3">
      <h1 className="sr-only">
        Editar convocatoria: {teamLabel} contra {match.opponent}
      </h1>
      <CallupEditor
        key={id}
        matchId={id}
        teamLabel={teamLabel}
        initial={initial}
        candidates={[...byId.values()]}
        template={(templateResult.data ?? []).map((player) => ({
          player_id: player.player_id,
          cap_number: player.cap_number,
        }))}
        previous={previous}
        previousLabel={previousLabel}
        editable={editable}
        backHref={backHref}
        backLabel={backLabel}
        matchHeader={
          <MatchEditorHeader
            teamLabel={teamLabel}
            opponent={match.opponent}
            isHome={match.is_home}
            scheduledAt={match.scheduled_at}
            competitionLabel={COMPETITION_LABELS[match.competition_type] ?? match.competition_type}
            status={match.status}
            scoreUs={match.final_score_us}
            scoreThem={match.final_score_them}
          />
        }
      />
    </AdminPageShell>
  );
}
