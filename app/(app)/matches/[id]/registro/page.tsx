import { notFound, redirect } from "next/navigation";
import type { Route } from "next";
import { createClient } from "@/lib/supabase/server";
import { getRenderAdminAccess } from "@/server/actions/admin/_helpers";
import { canUseLiveMatch } from "@/lib/domain/permissions";
import { PageShell } from "@/components/ui/page-shell";
import { PageBackLink } from "@/components/ui/page-back-link";
import { ActaManager } from "@/app/(app)/admin/matches/[id]/_components/acta-manager";

export default async function SimpleMatchSheet({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await createClient();
  const access = await getRenderAdminAccess();
  const { data: match, error } = await db.from("matches").select("*").eq("id", id).single();
  if (error || !match) notFound();
  if (!canUseLiveMatch(access, match.team_id)) redirect(`/matches/${id}`);
  const [sheet, callups, stats] = await Promise.all([
    db.from("live_match_sheets").select("match_id").eq("match_id", id).maybeSingle(),
    db
      .from("match_callups")
      .select("*,profiles!match_callups_player_id_fkey(id,full_name,photo_url)")
      .eq("match_id", id)
      .in("status", ["called", "confirmed"]),
    db.from("match_stats").select("*").eq("match_id", id),
  ]);
  if (sheet.error || callups.error || stats.error)
    throw new Error("No pudimos cargar el acta. Vuelve al partido y reinténtalo.");
  if (sheet.data) redirect(`/acta?match=${id}`);
  const entries = callups.data.flatMap((callup) =>
    callup.profiles
      ? [
          {
            callup,
            player: callup.profiles,
            stat: stats.data.find((stat) => stat.player_id === callup.player_id) ?? null,
          },
        ]
      : [],
  );
  return (
    <PageShell width="md" className="gap-5 pb-8">
      <PageBackLink href={`/matches/${id}` as Route}>Volver al partido</PageBackLink>
      <div>
        <p className="text-base text-slate-600">Morvedre · {match.opponent}</p>
        <h1 className="mt-1 text-2xl font-extrabold">Goles y expulsiones</h1>
      </div>
      {entries.length ? (
        <ActaManager match={match} entries={entries} />
      ) : (
        <p className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-base">
          Todavía no hay jugadores convocados. Pide al entrenador que complete la convocatoria.
        </p>
      )}
    </PageShell>
  );
}
