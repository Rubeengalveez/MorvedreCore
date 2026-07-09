import type { Metadata } from "next";
import Link from "next/link";
import type { Route } from "next";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft, MapPin, Clock, Trophy, Award, FileText, UserCheck } from "lucide-react";

import { Balon, Porteria } from "@/components/brand/pictograms";
import { RsvpButtons, type RsvpStatus } from "@/components/matches/rsvp-buttons";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { formatLongDate, formatTimeOfDay } from "@/lib/domain/calendar";
import { getActiveProfileContext } from "@/server/queries/active-profile";
import {
  getMatchById,
  getMatchMvp,
  isProfileCoachOfMatch,
  type CallupDetail,
  type MatchDetail,
  type MatchScorer,
} from "@/server/queries/matches";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils/cn";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const COMPETITION_LABELS: Record<string, string> = {
  league: "Liga",
  cup: "Copa",
  tournament: "Torneo",
  friendly: "Amistoso",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const match = await getMatchById(id).catch(() => null);
  if (!match) {
    return { title: "Partido — Morvedre Core" };
  }
  return {
    title: `${match.team_label} vs ${match.opponent} — Morvedre Core`,
    description: `${COMPETITION_LABELS[match.competition_type] ?? match.competition_type} · ${formatLongDate(match.scheduled_at)}`,
  };
}

interface CallupDetailWithPhoto extends CallupDetail {
  photo_url: string | null;
}

async function getCallupsWithPhotos(matchId: string): Promise<CallupDetailWithPhoto[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("match_callups")
    .select(
      "match_id, player_id, cap_number, status, confirmed_at, source_team_id, profiles!match_callups_player_id_fkey(full_name, photo_url)",
    )
    .eq("match_id", matchId)
    .order("cap_number", { ascending: true });
  const out: CallupDetailWithPhoto[] = [];
  for (const row of (data ?? []) as Array<{
    match_id: string;
    player_id: string;
    cap_number: number | null;
    status: string;
    confirmed_at: string | null;
    source_team_id: string | null;
    profiles: unknown;
  }>) {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    const profileObj = profile as { full_name?: string; photo_url?: string | null } | null;
    out.push({
      match_id: row.match_id,
      player_id: row.player_id,
      full_name: profileObj?.full_name ?? "Sin nombre",
      photo_url: profileObj?.photo_url ?? null,
      cap_number: row.cap_number,
      status: row.status,
      confirmed_at: row.confirmed_at,
      source_team_id: row.source_team_id,
    });
  }
  return out;
}

async function getMatchStatsList(
  matchId: string,
): Promise<Array<{ player_id: string; goals: number; exclusions: number; mvp: boolean }>> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("match_stats")
    .select("player_id, goals, exclusions, mvp")
    .eq("match_id", matchId);
  return (data ?? []) as Array<{
    player_id: string;
    goals: number;
    exclusions: number;
    mvp: boolean;
  }>;
}

export default async function MatchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [ctx, match] = await Promise.all([getActiveProfileContext(), getMatchById(id)]);
  if (!ctx) redirect("/login");
  if (!match) notFound();

  const hasScore = match.final_score_us != null && match.final_score_them != null;

  const [callups, mvp, statsList, isCoach] = await Promise.all([
    getCallupsWithPhotos(id).catch(() => [] as CallupDetailWithPhoto[]),
    getMatchMvp(id).catch(() => null as MatchScorer | null),
    getMatchStatsList(id).catch(() => []),
    isProfileCoachOfMatch(id, ctx.activeProfile.id).catch(() => false),
  ]);

  const statsMap = new Map(statsList.map((s) => [s.player_id, s]));

  const myCallup = callups.find((c) => c.player_id === ctx.activeProfile.id);
  const myStatus: RsvpStatus | null = myCallup ? (myCallup.status as RsvpStatus) : null;

  const isPlayed = match.status === "played";

  return (
    <div className="mx-auto flex w-full max-w-2xl animate-[fadeIn_0.15s_ease-out] flex-col gap-0">
      {/* Back button */}
      <div className="bg-paper/95 sticky top-[var(--top-bar-height)] z-10 flex items-center px-4 py-2.5 backdrop-blur select-none">
        <Link
          href={"/calendar" as Route}
          className="text-pool-blue hover:text-pool-deep inline-flex items-center gap-1 text-sm font-bold transition-colors active:scale-95"
        >
          <ChevronLeft className="h-5 w-5" />
          <span>Calendario</span>
        </Link>
      </div>

      {/* ─── HERO SCOREBOARD ─── */}
      <div className="bg-pool-deep flex flex-col items-center gap-5 px-5 pt-6 pb-7 select-none">
        {/* Category pill */}
        <span className="text-xs font-bold tracking-widest text-white/60 uppercase">
          {match.team_label} ·{" "}
          {COMPETITION_LABELS[match.competition_type] ?? match.competition_type}
        </span>

        {/* Teams & Score row */}
        <div className="flex w-full max-w-md items-center justify-center gap-5">
          {/* Home */}
          <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
            <div
              className="flex h-14 w-14 items-center justify-center rounded-full text-lg font-black text-white"
              style={{ backgroundColor: match.is_home ? match.team_color : "#64748B" }}
            >
              {match.is_home ? "MOR" : match.opponent.slice(0, 3).toUpperCase()}
            </div>
            <span className="w-full truncate text-center text-sm font-bold text-white">
              {match.is_home ? "Morvedre" : match.opponent}
            </span>
          </div>

          {/* Score / Time */}
          <div className="shrink-0">
            {hasScore ? (
              <div className="flex items-center gap-2">
                <span className="font-mono text-4xl font-black text-white tabular-nums">
                  {match.is_home ? match.final_score_us : match.final_score_them}
                </span>
                <span className="font-mono text-2xl font-bold text-white/40">-</span>
                <span className="font-mono text-4xl font-black text-white tabular-nums">
                  {match.is_home ? match.final_score_them : match.final_score_us}
                </span>
              </div>
            ) : (
              <span className="font-mono text-3xl font-black text-white">
                {formatTimeOfDay(match.scheduled_at)}
              </span>
            )}
          </div>

          {/* Away */}
          <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
            <div
              className="flex h-14 w-14 items-center justify-center rounded-full text-lg font-black text-white"
              style={{ backgroundColor: match.is_home ? "#64748B" : match.team_color }}
            >
              {match.is_home ? match.opponent.slice(0, 3).toUpperCase() : "MOR"}
            </div>
            <span className="w-full truncate text-center text-sm font-bold text-white">
              {match.is_home ? match.opponent : "Morvedre"}
            </span>
          </div>
        </div>

        {/* Date & Location */}
        <div className="flex flex-col items-center gap-1 text-center">
          <p className="text-sm font-semibold text-white/80">
            {formatLongDate(match.scheduled_at)}
          </p>
          {match.pool_name && (
            <p className="flex items-center gap-1.5 text-sm font-medium text-white/50">
              <MapPin className="h-4 w-4" />
              {match.pool_name}
            </p>
          )}
        </div>
      </div>

      {/* ─── CONTENT ─── */}
      <div className="flex flex-col gap-5 px-4 pt-5 pb-6">
        {/* RSVP (only upcoming matches) */}
        {myStatus && (match.status === "scheduled" || match.status === "in_progress") && (
          <section className="bg-paper-card border-ink-200 flex flex-col gap-3 rounded-2xl border p-5 shadow-sm">
            <h2 className="text-ink-900 flex items-center gap-2 text-sm font-black">
              <UserCheck className="text-pool-blue h-5 w-5" />
              Confirmar asistencia
              {myCallup?.cap_number != null && (
                <span className="text-pool-deep bg-pool-foam ml-auto rounded-lg px-2.5 py-0.5 font-mono text-sm font-bold">
                  #{myCallup.cap_number}
                </span>
              )}
            </h2>
            <RsvpButtons matchId={match.id} currentStatus={myStatus} />
          </section>
        )}

        {/* MVP (only played matches) */}
        {isPlayed && mvp && (
          <section className="flex items-center gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm select-none">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-200">
              <Award className="h-6 w-6 text-amber-800" />
            </div>
            <div className="flex min-w-0 flex-col">
              <span className="text-xs font-bold tracking-wider text-amber-700 uppercase">
                MVP del partido
              </span>
              <span className="truncate text-lg font-black text-amber-900">{mvp.full_name}</span>
              {mvp.goals > 0 && (
                <span className="text-sm font-semibold text-amber-700">
                  {mvp.goals} {mvp.goals === 1 ? "gol" : "goles"}
                </span>
              )}
            </div>
          </section>
        )}

        {/* ROSTER */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-ink-900 text-lg font-black">
              Convocatoria
              <span className="text-ink-500 ml-1.5 text-base font-semibold">
                ({callups.length})
              </span>
            </h2>
            {isCoach && (
              <Button
                asChild
                size="sm"
                variant="secondary"
                className="h-9 cursor-pointer rounded-xl text-xs font-bold"
              >
                <Link href={`/admin/matches/${match.id}` as Route}>Editar</Link>
              </Button>
            )}
          </div>

          {callups.length === 0 ? (
            <div className="border-ink-200 text-ink-500 rounded-2xl border-2 border-dashed p-10 text-center text-base font-medium select-none">
              Aún no se ha publicado la convocatoria.
            </div>
          ) : (
            <ul className="flex flex-col gap-2">
              {callups.map((c) => {
                const stats = statsMap.get(c.player_id);
                const isConfirmed = c.status === "confirmed" || c.status === "called";
                const isDeclined =
                  c.status === "declined" || c.status === "withdrawn" || c.status === "no_show";

                return (
                  <li
                    key={c.player_id}
                    className="bg-paper-card border-ink-200 flex items-center gap-3 rounded-xl border px-4 py-3 select-none"
                  >
                    {/* Avatar with status dot */}
                    <div className="relative shrink-0">
                      <Avatar src={c.photo_url} name={c.full_name} size={44} />
                      {/* Status dot overlay (bottom-right) */}
                      {!isPlayed && (
                        <span
                          className={cn(
                            "border-paper-card absolute -right-0.5 -bottom-0.5 h-3.5 w-3.5 rounded-full border-2",
                            isConfirmed
                              ? "bg-emerald-500"
                              : isDeclined
                                ? "bg-red-500"
                                : "bg-ink-300",
                          )}
                        />
                      )}
                    </div>

                    {/* Name & Cap */}
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="text-ink-900 truncate text-sm font-bold">{c.full_name}</span>
                      {c.cap_number != null && (
                        <span className="text-ink-500 text-xs font-semibold">
                          Gorro #{c.cap_number}
                        </span>
                      )}
                    </div>

                    {/* Stats badges (only played matches) */}
                    {isPlayed &&
                      stats &&
                      (stats.goals > 0 || stats.exclusions > 0 || stats.mvp) && (
                        <div className="flex shrink-0 items-center gap-1.5">
                          {stats.mvp && (
                            <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-900">
                              <Award className="h-3.5 w-3.5" />
                              MVP
                            </span>
                          )}
                          {stats.goals > 0 && (
                            <span className="bg-pool-foam text-pool-deep rounded-full px-2.5 py-1 text-xs font-bold">
                              {stats.goals} {stats.goals === 1 ? "gol" : "goles"}
                            </span>
                          )}
                          {stats.exclusions > 0 && (
                            <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-bold text-red-700">
                              {stats.exclusions} {stats.exclusions === 1 ? "excl." : "excl."}
                            </span>
                          )}
                        </div>
                      )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Notes */}
        {match.notes && (
          <section className="bg-paper-card border-ink-200 flex flex-col gap-3 rounded-2xl border p-5 shadow-sm">
            <h2 className="text-ink-900 flex items-center gap-2 text-sm font-bold">
              <FileText className="text-ink-400 h-4 w-4" />
              Notas
            </h2>
            <p className="text-ink-700 text-sm leading-relaxed whitespace-pre-line">
              {match.notes}
            </p>
          </section>
        )}
      </div>
    </div>
  );
}
