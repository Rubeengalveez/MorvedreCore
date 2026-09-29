import { notFound } from "next/navigation";
import type { Route } from "next";

import { AdminPageShell } from "@/components/admin/admin-page";
import { PageBackLink } from "@/components/ui/page-back-link";
import { createClient } from "@/lib/supabase/server";
import { canManageTeam } from "@/lib/domain/permissions";
import { getRenderAdminAccess } from "@/server/actions/admin/_helpers";
import type { MatchRow } from "@/server/actions/admin";

import { MatchDetailsForm } from "../_components/match-details-form";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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
      <header className="bg-pool-deep text-paper shadow-elev-2 rounded-2xl px-4 py-4">
        <h1 className="font-display text-xl font-extrabold">Editar partido</h1>
        <p className="mt-1 text-sm font-semibold text-blue-100">
          {team.label} · {match.opponent}
        </p>
      </header>
      <section>
        <MatchDetailsForm match={match} />
      </section>
    </AdminPageShell>
  );
}
