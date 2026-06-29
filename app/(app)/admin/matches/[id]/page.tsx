import Link from "next/link";
import { notFound } from "next/navigation";
import type { Route } from "next";
import { ArrowLeft, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils/cn";
import {
  formatLongDate,
  formatTime,
} from "@/lib/utils/format";
import type { CallupRow, MatchRow, MatchStatRow, Team } from "@/server/actions/admin";

import { ActaManager, type ActaEntry } from "./_components/acta-manager";
import { CallupList, type CallupEntry } from "./_components/callup-list";
import { MatchDetailsForm } from "./_components/match-details-form";
import { SuggestCallupSheet } from "./_components/suggest-callup-sheet";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Tab = "convocatoria" | "acta" | "detalles" | "logistica";

const TABS: Array<{ value: Tab; label: string }> = [
  { value: "convocatoria", label: "Convocatoria" },
  { value: "acta", label: "Acta" },
  { value: "detalles", label: "Detalles" },
  { value: "logistica", label: "Logística" },
];

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

const STATUS_BADGE: Record<string, string> = {
  scheduled: "bg-brand-aqua/15 text-brand-deep",
  in_progress: "bg-warning/15 text-warning",
  played: "bg-success/15 text-success",
  cancelled: "bg-danger/15 text-danger",
  postponed: "bg-ink-300/40 text-ink-600",
};

type MatchWithTeam = MatchRow & {
  team: Pick<Team, "id" | "label" | "color"> | null;
};

async function loadMatch(id: string): Promise<{
  match: MatchWithTeam | null;
  callups: CallupRow[];
  stats: MatchStatRow[];
  profileMeta: Map<string, { full_name: string; photo_url: string | null; birth_year: number | null; cap_number: number | null }>;
  teamById: Map<string, { id: string; label: string }>;
  availability: Array<{ player_id: string; date: string; available: boolean }>;
} | null> {
  const supabase = await createClient();

  const { data: matchData, error: matchError } = await supabase
    .from("matches")
    .select(
      "id, season_id, team_id, opponent, competition_type, is_home, location, pool_name, scheduled_at, status, logistics_enabled, notes, final_score_us, final_score_them, created_at, updated_at",
    )
    .eq("id", id)
    .maybeSingle();

  if (matchError) return null;
  if (!matchData) return null;

  const match = matchData as MatchRow;

  const [
    { data: teamData },
    { data: callupsData, error: callupsError },
    { data: statsData, error: statsError },
    { data: profilesData, error: profilesError },
    { data: teamsData },
    { data: availabilityData, error: availabilityError },
  ] = await Promise.all([
    supabase
      .from("teams")
      .select("id, season_id, category_code, label, gender, team_type, color, home_pool, notes, created_at, updated_at")
      .eq("id", match.team_id)
      .maybeSingle(),
    supabase
      .from("match_callups")
      .select("match_id, player_id, cap_number, status, confirmed_at, source_team_id, created_at, updated_at")
      .eq("match_id", match.id),
    supabase
      .from("match_stats")
      .select(
        "match_id, player_id, goals, exclusions, mvp, entered_by, entered_at, validated_by, validated_at, created_at, updated_at",
      )
      .eq("match_id", match.id),
    supabase
      .from("profiles")
      .select("id, full_name, photo_url, birth_year, cap_number")
      .order("full_name", { ascending: true })
      .limit(1000),
    supabase
      .from("teams")
      .select("id, label"),
    supabase
      .from("match_availability")
      .select("player_id, date, available, reason")
      .eq("date", match.scheduled_at.slice(0, 10)),
  ]);

  if (callupsError || statsError || profilesError || availabilityError) return null;

  const profileMeta = new Map<
    string,
    { full_name: string; photo_url: string | null; birth_year: number | null; cap_number: number | null }
  >();
  for (const p of profilesData ?? []) {
    profileMeta.set(p.id, {
      full_name: p.full_name,
      photo_url: p.photo_url,
      birth_year: p.birth_year,
      cap_number: p.cap_number,
    });
  }

  const teamById = new Map<string, { id: string; label: string }>();
  for (const t of teamsData ?? []) {
    teamById.set(t.id, { id: t.id, label: t.label });
  }

  const team = (teamData ?? null) as Team | null;
  const teamInfo = team
    ? { id: team.id, label: team.label, color: team.color }
    : null;

  return {
    match: { ...match, team: teamInfo },
    callups: (callupsData ?? []) as CallupRow[],
    stats: (statsData ?? []) as MatchStatRow[],
    profileMeta,
    teamById,
    availability: (availabilityData ?? []) as Array<{ player_id: string; date: string; available: boolean }>,
  };
}

export default async function MatchDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const tab: Tab = (TABS.find((t) => t.value === sp.tab)?.value ??
    "convocatoria") as Tab;

  const data = await loadMatch(id);
  if (!data || !data.match) {
    notFound();
  }
  const { match, callups, stats, profileMeta, teamById, availability } = data;

  const conflicting = new Set(
    availability
      .filter((a) => a.available === false)
      .map((a) => a.player_id),
  );

  const callupEntries: CallupEntry[] = callups
    .map((c) => {
      const profile = profileMeta.get(c.player_id);
      const source = c.source_team_id
        ? teamById.get(c.source_team_id)?.label ?? null
        : null;
      return {
        callup: c,
        player: profile
          ? {
              id: profileMeta.get(c.player_id)!.full_name.length > 0 ? c.player_id : c.player_id,
              full_name: profile.full_name,
              photo_url: profile.photo_url,
              birth_year: profile.birth_year,
              category_code: null,
            }
          : null,
        sourceTeamLabel: source,
        hasConflict: conflicting.has(c.player_id),
      };
    })
    .sort((a, b) => {
      const aCap = a.callup.cap_number ?? 999;
      const bCap = b.callup.cap_number ?? 999;
      if (aCap !== bCap) return aCap - bCap;
      const aName = a.player?.full_name ?? "";
      const bName = b.player?.full_name ?? "";
      return aName.localeCompare(bName, "es");
    });

  const actaEntries: ActaEntry[] = callupEntries
    .filter((e) => e.player != null)
    .map((e) => {
      const stat = stats.find((s) => s.player_id === e.callup.player_id) ?? null;
      return {
        callup: e.callup,
        player: {
          id: e.callup.player_id,
          full_name: e.player!.full_name,
          photo_url: e.player!.photo_url,
        },
        stat,
      };
    });

  const scheduledDate = new Date(match.scheduled_at);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 py-4">
      <div className="flex items-center gap-2 text-sm text-ink-600">
        <Link
          href={"/admin/matches" as Route}
          className="inline-flex items-center gap-1 font-semibold text-brand-blue hover:underline focus-visible:underline"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Partidos
        </Link>
      </div>

      <header
        className="relative overflow-hidden rounded-md border border-ink-300 bg-paper"
        style={{
          borderTopWidth: "4px",
          borderTopColor: match.team?.color ?? "var(--brand-blue)",
          borderLeftWidth: "4px",
          borderLeftColor: match.team?.color ?? "var(--brand-blue)",
        }}
      >
        <div className="flex flex-col gap-4 p-5">
          <div className="flex items-center gap-2 text-xs text-ink-600">
            <span className="font-mono font-bold uppercase tracking-wider text-brand-deep">
              {formatLongDate(scheduledDate)}
            </span>
            <span
              className={cn(
                "ml-auto inline-flex h-6 items-center rounded-full px-2 text-[11px] font-semibold",
                STATUS_BADGE[match.status] ?? "border border-ink-300 text-ink-600",
              )}
            >
              {STATUS_LABELS[match.status] ?? match.status}
            </span>
          </div>
          <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-[1fr_auto_1fr]">
            <div className="flex flex-col items-center gap-1 text-center sm:items-end sm:text-right">
              <span className="text-[10px] font-bold uppercase tracking-wider text-ink-600">
                {match.is_home ? "Local" : "Visitante"}
              </span>
              <span className="font-display text-2xl font-extrabold leading-tight text-brand-deep sm:text-3xl">
                {match.team?.label ?? "Equipo"}
              </span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <span className="font-mono text-sm font-bold text-ink-600">
                {formatTime(scheduledDate)}
              </span>
              {match.status === "played" &&
              match.final_score_us != null &&
              match.final_score_them != null ? (
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
                {match.is_home ? "Visitante" : "Local"}
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
            {match.is_home ? (
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

      <nav
        aria-label="Secciones del partido"
        className="sticky top-[60px] z-10 -mx-4 border-b border-ink-300 bg-paper px-4"
      >
        <ul
          role="tablist"
          className="no-scrollbar mx-auto flex max-w-2xl gap-1 overflow-x-auto"
        >
          {TABS.map((t) => {
            const isActive = tab === t.value;
            return (
              <li key={t.value} className="shrink-0">
                <Link
                  href={`/admin/matches/${match.id}?tab=${t.value}` as Route}
                  role="tab"
                  aria-selected={isActive}
                  className={cn(
                    "relative inline-flex h-12 min-h-12 items-center justify-center whitespace-nowrap px-4 font-display text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2 focus-visible:ring-offset-paper",
                    isActive
                      ? "text-brand-blue"
                      : "text-ink-600 hover:text-brand-deep",
                  )}
                >
                  {t.label}
                  {isActive ? (
                    <span
                      aria-hidden="true"
                      className="absolute inset-x-3 bottom-0 h-[3px] rounded-full bg-brand-blue"
                    />
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <section className="flex flex-col gap-4">
        {tab === "convocatoria" ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-col">
                <h2 className="font-display text-lg font-bold text-brand-deep">
                  Jugadores convocados
                </h2>
                <p className="text-xs text-ink-600">
                  {callupEntries.length} en la convocatoria
                </p>
              </div>
              <Sheet>
                <SheetTrigger asChild>
                  <Button size="sm">
                    <Sparkles className="h-4 w-4" aria-hidden="true" />
                    Sugerir convocatoria
                  </Button>
                </SheetTrigger>
                <SheetContent size="lg">
                  <SheetHeader>
                    <SheetTitle>Sugerir convocatoria</SheetTitle>
                    <SheetDescription>
                      Te proponemos los jugadores disponibles. Marca y ajusta
                      dorsales antes de confirmar.
                    </SheetDescription>
                  </SheetHeader>
                  <SheetBody>
                    <SuggestCallupSheet matchId={match.id} />
                  </SheetBody>
                </SheetContent>
              </Sheet>
            </div>
            <CallupList entries={callupEntries} />
          </>
        ) : null}

        {tab === "acta" ? (
          <>
            <h2 className="font-display text-lg font-bold text-brand-deep">
              Acta del partido
            </h2>
            <ActaManager
              match={{
                id: match.id,
                status: match.status,
                final_score_us: match.final_score_us,
                final_score_them: match.final_score_them,
              }}
              entries={actaEntries}
            />
          </>
        ) : null}

        {tab === "detalles" ? (
          <>
            <h2 className="font-display text-lg font-bold text-brand-deep">
              Detalles del partido
            </h2>
            {match.team ? (
              <MatchDetailsForm match={match} team={match.team} />
            ) : (
              <p className="text-sm italic text-ink-600">
                No se puede editar: falta el equipo.
              </p>
            )}
          </>
        ) : null}

        {tab === "logistica" ? (
          <>
            <h2 className="font-display text-lg font-bold text-brand-deep">
              Logística
            </h2>
            {match.logistics_enabled ? (
              <div className="rounded-md border border-dashed border-ink-300 bg-paper p-6 text-center">
                <p className="text-base font-semibold text-brand-deep">
                  Próximamente.
                </p>
                <p className="mt-1 text-sm text-ink-600">
                  La gestión de coches y viajes se activa en una fase posterior
                  (Fase 7).
                </p>
              </div>
            ) : (
              <div className="rounded-md border border-dashed border-ink-300 bg-paper p-6 text-center">
                <p className="text-base font-semibold text-brand-deep">
                  Logística desactivada.
                </p>
                <p className="mt-1 text-sm text-ink-600">
                  Activa el interruptor de logística en la pestaña &ldquo;Detalles&rdquo;
                  para empezar a planificar el viaje.
                </p>
              </div>
            )}
          </>
        ) : null}
      </section>
    </div>
  );
}
