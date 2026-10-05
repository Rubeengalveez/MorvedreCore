import { notFound } from "next/navigation";
import type { Route } from "next";

import { AdminPageShell } from "@/components/admin/admin-page";
import { createClient } from "@/lib/supabase/server";
import { adminMatchesReturnPath } from "@/lib/domain/admin-matches";
import { canManageTeam } from "@/lib/domain/permissions";
import { getRenderAdminAccess } from "@/server/actions/admin/_helpers";
import type { MatchRow } from "@/server/actions/admin";

import { MatchDetailsForm } from "../_components/match-details-form";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = { title: "Editar partido — Admin — Morvedre Core" };

export default async function EditMatchPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string; returnTo?: string }>;
}) {
  const { id } = await params;
  const { from, returnTo } = await searchParams;
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
  const backHref =
    origin === "match" ? (`/matches/${id}` as Route) : (adminMatchesReturnPath(returnTo) as Route);

  return (
    <AdminPageShell className="gap-3">
      <MatchDetailsForm
        match={match}
        teamLabel={team.label}
        backHref={backHref}
        backLabel={origin === "match" ? "Volver al partido" : "Volver a partidos"}
      />
    </AdminPageShell>
  );
}
