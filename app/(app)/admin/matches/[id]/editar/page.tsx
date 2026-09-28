import { notFound } from "next/navigation";
import type { Route } from "next";

import { AdminPageShell } from "@/components/admin/admin-page";
import { PageBackLink } from "@/components/ui/page-back-link";
import { createClient } from "@/lib/supabase/server";
import { canManageTeam } from "@/lib/domain/permissions";
import { getRenderAdminAccess } from "@/server/actions/admin/_helpers";
import type { MatchRow, Team } from "@/server/actions/admin";

import { MatchDetailsForm } from "../_components/match-details-form";
import { MatchEditorHeader } from "../_components/match-editor-header";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const COMPETITION_LABELS: Record<string, string> = {
  league: "Liga",
  cup: "Copa",
  tournament: "Torneo",
  friendly: "Amistoso",
};

export default async function EditMatchPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const { id } = await params;
  const { from } = await searchParams;
  const supabase = await createClient();
  const { data, error } = await supabase.from("matches").select("*").eq("id", id).maybeSingle();
  if (error || !data) notFound();
  const access = await getRenderAdminAccess();
  if (!canManageTeam(access, "match_schedule", data.team_id)) notFound();
  const { data: team, error: teamError } = await supabase
    .from("teams")
    .select("id, label, color")
    .eq("id", data.team_id)
    .maybeSingle();
  if (teamError || !team) notFound();
  const match = data as MatchRow;
  const origin = from === "match" ? "match" : "admin";
  const backHref = origin === "match" ? (`/matches/${id}` as Route) : "/admin/matches";

  return (
    <AdminPageShell className="gap-3">
      <PageBackLink href={backHref}>
        {origin === "match" ? "Volver al partido" : "Volver a partidos"}
      </PageBackLink>
      <h1 className="sr-only">Editar partido contra {match.opponent}</h1>
      <MatchEditorHeader
        teamLabel={team.label}
        opponent={match.opponent}
        isHome={match.is_home}
        scheduledAt={match.scheduled_at}
        competitionLabel={COMPETITION_LABELS[match.competition_type] ?? match.competition_type}
        status={match.status}
        scoreUs={match.final_score_us}
        scoreThem={match.final_score_them}
      />
      <section>
        <div className="mb-4">
          <p className="text-pool-blue text-sm font-extrabold">{team.label}</p>
          <h2 className="font-display text-pool-deep text-xl font-extrabold">Editar partido</h2>
          <p className="text-ink-700 mt-1 text-sm">
            Cambia el rival, la fecha o la información que verá el equipo.
          </p>
        </div>
        <MatchDetailsForm match={match} team={team as Pick<Team, "id" | "label" | "color">} />
      </section>
    </AdminPageShell>
  );
}
