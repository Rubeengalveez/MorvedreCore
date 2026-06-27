import type { Metadata } from "next";
import Link from "next/link";
import type { Route } from "next";
import { notFound, redirect } from "next/navigation";
import { Trophy, Minus, TrendingDown, ChevronLeft } from "lucide-react";

import { Balon, ChevronDerecha, Gorro, Porteria } from "@/components/brand/pictograms";
import { RsvpButtons, type RsvpStatus } from "@/components/matches/rsvp-buttons";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { formatLongDate, formatTimeOfDay } from "@/lib/domain/calendar";
import { getActiveProfileContext } from "@/server/queries/active-profile";
import {
  getMatchById,
  getMatchMvp,
  getMatchTopScorers,
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

const STATUS_LABELS: Record<string, string> = {
  scheduled: "Programado",
  in_progress: "En juego",
  played: "Jugado",
  cancelled: "Cancelado",
  postponed: "Aplazado",
};

const CALLOUP_LABELS: Record<string, string> = {
  called: "Convocado",
  confirmed: "Confirmado",
  declined: "Rechazado",
  withdrawn: "Baja",
  no_show: "No se presentó",
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
    .select("match_id, player_id, cap_number, status, confirmed_at, source_team_id, profiles!match_callups_player_id_fkey(full_name, photo_url)")
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

export default async function MatchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await getActiveProfileContext();
  if (!ctx) redirect("/login");

  const { id } = await params;
  const match = await getMatchById(id);
  if (!match) notFound();

  const [callups, mvp, topScorers, isCoach] = await Promise.all([
    getCallupsWithPhotos(id).catch(() => [] as CallupDetailWithPhoto[]),
    getMatchMvp(id).catch(() => null as MatchScorer | null),
    getMatchTopScorers(id, 3).catch(() => [] as MatchScorer[]),
    isProfileCoachOfMatch(id, ctx.activeProfile.id),
  ]);

  const myCallup = callups.find((c) => c.player_id === ctx.activeProfile.id);
  const myStatus: RsvpStatus | null = myCallup
    ? (myCallup.status as RsvpStatus)
    : null;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-4">
      <div className="sticky top-[60px] z-10 -mx-4 flex items-center gap-1 border-b border-ink-300 bg-paper/95 px-4 py-2 backdrop-blur">
        <Link
          href={"/calendar" as Route}
          className="inline-flex items-center gap-1 text-sm font-semibold text-brand-blue hover:underline"
        >
          <ChevronLeft className="h-4 w-4" />
          Calendario
        </Link>
      </div>

      <MatchHero match={match} />

      {myStatus ? (
        <section
          aria-labelledby="my-rsvp-heading"
          className="flex flex-col gap-3 rounded-md border border-ink-300 bg-paper p-4"
        >
          <h2
            id="my-rsvp-heading"
            className="font-display text-lg font-bold text-brand-deep"
          >
            Tu convocatoria
          </h2>
          <CallupStatusBlock
            status={myStatus}
            cap={myCallup?.cap_number ?? null}
          />
          {match.status === "scheduled" || match.status === "in_progress" ? (
            <RsvpButtons matchId={match.id} currentStatus={myStatus} />
          ) : null}
        </section>
      ) : null}

      <CallupSection
        callups={callups}
        isCoach={isCoach}
        matchId={match.id}
      />

      {match.status === "played" ? (
        <ResultSection match={match} mvp={mvp} topScorers={topScorers} />
      ) : null}

      {match.notes ? (
        <section
          aria-labelledby="match-notes-heading"
          className="flex flex-col gap-2 rounded-md border border-ink-300 bg-paper p-4"
        >
          <h2
            id="match-notes-heading"
            className="font-display text-base font-bold text-brand-deep"
          >
            Notas
          </h2>
          <p className="text-sm leading-relaxed text-ink-900">{match.notes}</p>
        </section>
      ) : null}

      <section
        aria-labelledby="match-details-heading"
        className="flex flex-col gap-2 rounded-md border border-ink-300 bg-paper p-4"
      >
        <h2
          id="match-details-heading"
          className="font-display text-base font-bold text-brand-deep"
        >
          Detalles
        </h2>
        <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
          <DetailRow
            label="Competición"
            value={COMPETITION_LABELS[match.competition_type] ?? match.competition_type}
          />
          <DetailRow label="Sede" value={match.is_home ? "Local" : "Visitante"} />
          {match.location ? <DetailRow label="Lugar" value={match.location} /> : null}
          {match.pool_name ? <DetailRow label="Piscina" value={match.pool_name} /> : null}
          <DetailRow label="Estado" value={STATUS_LABELS[match.status] ?? match.status} />
        </dl>
      </section>

      <div className="flex justify-end">
        <Button asChild variant="secondary" size="md">
          <Link href={"/calendar" as Route}>
            <ChevronDerecha className="h-4 w-4 -scale-x-100" aria-hidden="true" />
            Volver al calendario
          </Link>
        </Button>
      </div>
    </div>
  );
}

function MatchHero({ match }: { match: MatchDetail }) {
  const isHome = match.is_home;
  const dateLabel = formatLongDate(match.scheduled_at);
  const timeLabel = formatTimeOfDay(match.scheduled_at);
  const hasScore =
    match.final_score_us != null && match.final_score_them != null;
  const isCancelled = match.status === "cancelled";
  const isPlayed = match.status === "played";

  return (
    <header
      className="relative overflow-hidden rounded-md border border-ink-300 bg-paper"
      style={{
        borderTopWidth: "4px",
        borderTopColor: match.team_color,
        borderLeftWidth: "4px",
        borderLeftColor: match.team_color,
      }}
    >
      <div className="flex flex-col gap-4 p-5">
        <div className="flex items-center gap-2 text-xs text-ink-600">
          <span className="font-mono font-bold uppercase tracking-wider text-brand-deep">
            {dateLabel}
          </span>
          <span
            className={cn(
              "ml-auto inline-flex h-6 items-center rounded-full px-2 text-[11px] font-semibold",
              isCancelled
                ? "bg-danger/15 text-danger"
                : isPlayed
                  ? "bg-success/15 text-success"
                  : "bg-brand-aqua/15 text-brand-deep",
            )}
          >
            {STATUS_LABELS[match.status] ?? match.status}
          </span>
        </div>
        <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-[1fr_auto_1fr]">
          <div className="flex flex-col items-center gap-1 text-center sm:items-end sm:text-right">
            <span className="text-[10px] font-bold uppercase tracking-wider text-ink-600">
              {isHome ? "Local" : "Visitante"}
            </span>
            <span className="font-display text-2xl font-extrabold leading-tight text-brand-deep sm:text-3xl">
              {match.team_label}
            </span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="font-mono text-sm font-bold text-ink-600">
              {timeLabel}
            </span>
            {hasScore ? (
              <span
                className="font-mono font-extrabold leading-none text-brand-deep"
                style={{ fontSize: "72px" }}
              >
                {match.final_score_us} - {match.final_score_them}
              </span>
            ) : (
              <span className="font-display text-3xl font-extrabold text-ink-600">
                vs
              </span>
            )}
          </div>
          <div className="flex flex-col items-center gap-1 text-center sm:items-start sm:text-left">
            <span className="text-[10px] font-bold uppercase tracking-wider text-ink-600">
              {isHome ? "Visitante" : "Local"}
            </span>
            <span className="font-display text-2xl font-extrabold leading-tight text-brand-deep sm:text-3xl">
              {match.opponent}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-1.5 text-sm text-ink-600">
          <span className="inline-flex h-6 items-center rounded-full border border-ink-300 px-2 text-[11px] font-semibold text-ink-600">
            {COMPETITION_LABELS[match.competition_type] ?? match.competition_type}
          </span>
          {isHome ? (
            <span className="inline-flex h-6 items-center rounded-full bg-brand-foam px-2 text-[11px] font-semibold text-brand-deep">
              Local
            </span>
          ) : (
            <span className="inline-flex h-6 items-center rounded-full bg-ink-300/40 px-2 text-[11px] font-semibold text-ink-600">
              Visitante
            </span>
          )}
          {(match.pool_name || match.location) ? (
            <span className="text-xs text-ink-600">
              {match.pool_name ?? match.location}
            </span>
          ) : null}
        </div>
      </div>
    </header>
  );
}

function CallupStatusBlock({
  status,
  cap,
}: {
  status: RsvpStatus;
  cap: number | null;
}) {
  const tone = callupTone(status);
  const label = CALLOUP_LABELS[status] ?? status;
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-md border p-3",
        tone.bgClass,
        tone.borderClass,
      )}
    >
      <Gorro
        className="h-9 w-9 shrink-0"
        accent={cap != null ? "var(--brand-blue)" : "var(--brand-aqua)"}
      />
      <div className="flex flex-1 flex-col">
        <span className="text-xs font-semibold uppercase tracking-wider text-ink-600">
          {cap != null ? `Tu gorro: #${cap}` : "Convocatoria"}
        </span>
        <span className={cn("font-display text-lg font-extrabold", tone.textClass)}>
          {label}
        </span>
      </div>
    </div>
  );
}

function callupTone(status: string): {
  bgClass: string;
  borderClass: string;
  textClass: string;
} {
  switch (status) {
    case "confirmed":
      return {
        bgClass: "bg-success/10",
        borderClass: "border-success/30",
        textClass: "text-success",
      };
    case "declined":
    case "no_show":
    case "withdrawn":
      return {
        bgClass: "bg-danger/10",
        borderClass: "border-danger/30",
        textClass: "text-danger",
      };
    default:
      return {
        bgClass: "bg-brand-foam",
        borderClass: "border-brand-aqua/30",
        textClass: "text-brand-deep",
      };
  }
}

function CallupSection({
  callups,
  isCoach,
  matchId,
}: {
  callups: CallupDetailWithPhoto[];
  isCoach: boolean;
  matchId: string;
}) {
  return (
    <section aria-labelledby="callup-heading" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <h2
          id="callup-heading"
          className="font-display text-lg font-bold text-brand-deep"
        >
          Convocatoria
        </h2>
        {isCoach ? (
          <Button asChild size="sm" variant="secondary">
            <Link href={`/admin/matches/${matchId}` as Route}>
              Editar convocatoria
            </Link>
          </Button>
        ) : null}
      </div>
      {callups.length === 0 ? (
        <div className="rounded-md border border-dashed border-ink-300 bg-paper p-5 text-center text-sm text-ink-600">
          Aún no hay jugadores convocados.
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {callups.map((c) => (
            <CallupRow key={c.player_id} callup={c} />
          ))}
        </ul>
      )}
    </section>
  );
}

function CallupRow({ callup }: { callup: CallupDetailWithPhoto }) {
  const tone = callupTone(callup.status);
  const isWin = callup.status === "confirmed";
  const isDraw = callup.status === "called";
  const Icon = isWin ? Trophy : isDraw ? Minus : TrendingDown;
  return (
    <li className="flex items-center gap-3 rounded-md border border-ink-300 bg-paper px-4 py-3">
      <Avatar src={callup.photo_url} name={callup.full_name} size={40} />
      <div className="flex flex-1 flex-col">
        <span className="font-display text-base font-bold text-brand-deep">
          {callup.full_name}
        </span>
        <span className={cn("inline-flex items-center gap-1 text-xs font-semibold", tone.textClass)}>
          <Icon className="h-3 w-3" />
          {CALLOUP_LABELS[callup.status] ?? callup.status}
        </span>
      </div>
      {callup.cap_number != null ? (
        <span className="font-mono text-xl font-bold text-brand-deep">
          #{callup.cap_number}
        </span>
      ) : null}
    </li>
  );
}

function ResultSection({
  match,
  mvp,
  topScorers,
}: {
  match: MatchDetail;
  mvp: MatchScorer | null;
  topScorers: MatchScorer[];
}) {
  return (
    <section
      aria-labelledby="result-heading"
      className="flex flex-col gap-4 rounded-md border border-ink-300 bg-paper p-4"
    >
      <h2
        id="result-heading"
        className="font-display text-lg font-bold text-brand-deep"
      >
        Resultado
      </h2>
      <div className="flex items-center justify-center gap-4">
        <span className="font-display text-2xl font-extrabold text-brand-deep">
          {match.team_label}
        </span>
        <span className="font-mono text-4xl font-extrabold text-brand-deep">
          {match.final_score_us} - {match.final_score_them}
        </span>
        <span className="font-display text-2xl font-extrabold text-brand-deep">
          {match.opponent}
        </span>
      </div>
      {mvp ? (
        <div className="flex items-center gap-3 rounded-md bg-brand-foam p-3">
          <Porteria className="h-7 w-7 shrink-0" />
          <div className="flex flex-1 flex-col">
            <span className="text-xs font-semibold uppercase tracking-wider text-ink-600">
              MVP del partido
            </span>
            <span className="font-display text-base font-extrabold text-brand-deep">
              {mvp.full_name}
              {mvp.goals > 0 ? ` · ${mvp.goals} goles` : ""}
            </span>
          </div>
        </div>
      ) : null}
      {topScorers.length > 0 ? (
        <div className="flex flex-col gap-2">
          <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink-600">
            <Balon className="h-4 w-4" accent="var(--brand-ball)" />
            Goleadores
          </h3>
          <ul className="flex flex-col gap-1">
            {topScorers.map((s, i) => (
              <li
                key={s.player_id}
                className="flex items-center gap-3 rounded-md border border-ink-300 bg-paper px-3 py-2"
              >
                <span className="w-5 font-mono text-sm font-bold text-ink-600">
                  {i + 1}.
                </span>
                <span className="font-display text-sm font-bold text-brand-deep">
                  {s.full_name}
                </span>
                {s.cap_number != null ? (
                  <span className="font-mono text-xs text-ink-600">
                    #{s.cap_number}
                  </span>
                ) : null}
                <span className="ml-auto font-mono text-base font-bold text-brand-deep">
                  {s.goals} {s.goals === 1 ? "gol" : "goles"}
                </span>
                {s.mvp ? <Porteria className="h-4 w-4" /> : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {topScorers.length === 0 && !mvp ? (
        <p className="text-sm text-ink-600">Aún no se han registrado estadísticas.</p>
      ) : null}
    </section>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <dt className="text-[10px] font-semibold uppercase tracking-wider text-ink-600">
        {label}
      </dt>
      <dd className="text-sm text-ink-900">{value}</dd>
    </div>
  );
}
