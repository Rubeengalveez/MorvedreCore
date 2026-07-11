import Link from "next/link";
import { notFound } from "next/navigation";
import type { Route } from "next";
import { MdArrowBack, MdAutoAwesome } from "react-icons/md";
import { CarFront } from "lucide-react";

import { AdminPageShell } from "@/components/admin/admin-page";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { PoolScoreboard } from "@/components/ui/pool-scoreboard";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils/cn";
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
  scheduled: "bg-pool-teal/15 text-pool-deep",
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
  profileMeta: Map<
    string,
    {
      full_name: string;
      photo_url: string | null;
      birth_year: number | null;
      cap_number: number | null;
    }
  >;
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
      .select(
        "id, season_id, category_code, label, gender, team_type, color, home_pool, notes, created_at, updated_at",
      )
      .eq("id", match.team_id)
      .maybeSingle(),
    supabase
      .from("match_callups")
      .select(
        "match_id, player_id, cap_number, status, confirmed_at, source_team_id, created_at, updated_at",
      )
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
    supabase.from("teams").select("id, label"),
    supabase
      .from("match_availability")
      .select("player_id, date, available, reason")
      .eq("date", match.scheduled_at.slice(0, 10)),
  ]);

  if (callupsError || statsError || profilesError || availabilityError) return null;

  const profileMeta = new Map<
    string,
    {
      full_name: string;
      photo_url: string | null;
      birth_year: number | null;
      cap_number: number | null;
    }
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
  const teamInfo = team ? { id: team.id, label: team.label, color: team.color } : null;

  return {
    match: { ...match, team: teamInfo },
    callups: (callupsData ?? []) as CallupRow[],
    stats: (statsData ?? []) as MatchStatRow[],
    profileMeta,
    teamById,
    availability: (availabilityData ?? []) as Array<{
      player_id: string;
      date: string;
      available: boolean;
    }>,
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
  const tab: Tab = (TABS.find((t) => t.value === sp.tab)?.value ?? "convocatoria") as Tab;

  const data = await loadMatch(id);
  if (!data || !data.match) {
    notFound();
  }
  const { match, callups, stats, profileMeta, teamById, availability } = data;

  const conflicting = new Set(
    availability.filter((a) => a.available === false).map((a) => a.player_id),
  );

  const callupEntries: CallupEntry[] = callups
    .map((c) => {
      const profile = profileMeta.get(c.player_id);
      const source = c.source_team_id ? (teamById.get(c.source_team_id)?.label ?? null) : null;
      return {
        callup: c,
        player: profile
          ? {
              id: c.player_id,
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

  return (
    <AdminPageShell>
      <div className="text-ink-600 flex items-center gap-2 text-sm">
        <Link
          href={"/admin/matches" as Route}
          className="text-pool-blue hover:text-pool-deep focus-visible:ring-pool-blue inline-flex min-h-11 items-center gap-2 rounded-lg font-extrabold transition-colors focus-visible:ring-2 focus-visible:outline-none"
        >
          <MdArrowBack className="h-5 w-5" aria-hidden="true" />
          Partidos
        </Link>
      </div>

      <div className="relative">
        <PoolScoreboard
          mode={
            match.status === "played" &&
            match.final_score_us != null &&
            match.final_score_them != null
              ? "final"
              : "preview"
          }
          homeTeam={{
            label: match.is_home ? (match.team?.label ?? "Morvedre") : match.opponent,
            color: match.is_home ? (match.team?.color ?? "var(--pool-blue)") : "#64748B",
          }}
          awayTeam={{
            label: match.is_home ? match.opponent : (match.team?.label ?? "Morvedre"),
            color: match.is_home ? "#64748B" : (match.team?.color ?? "var(--pool-blue)"),
          }}
          homeScore={match.is_home ? match.final_score_us : match.final_score_them}
          awayScore={match.is_home ? match.final_score_them : match.final_score_us}
          scheduledAt={match.scheduled_at}
          competitionLabel={COMPETITION_LABELS[match.competition_type] ?? match.competition_type}
          isHome={match.is_home}
          location={match.pool_name ?? match.location}
        />
        <span
          className={cn(
            "absolute top-3 right-3 inline-flex min-h-7 items-center rounded-full px-2.5 text-xs font-extrabold",
            STATUS_BADGE[match.status] ?? "border-ink-300 text-ink-600 border",
          )}
        >
          {STATUS_LABELS[match.status] ?? match.status}
        </span>
      </div>

      <nav
        aria-label="Secciones del partido"
        className="border-ink-300 bg-paper sticky top-[var(--top-bar-height)] z-10 -mx-4 border-b px-4"
      >
        <ul role="tablist" className="no-scrollbar mx-auto flex max-w-2xl gap-1 overflow-x-auto">
          {TABS.map((t) => {
            const isActive = tab === t.value;
            return (
              <li key={t.value} className="shrink-0">
                <Link
                  href={`/admin/matches/${match.id}?tab=${t.value}` as Route}
                  role="tab"
                  aria-selected={isActive}
                  className={cn(
                    "font-display focus-visible:ring-pool-blue focus-visible:ring-offset-paper relative inline-flex h-12 min-h-12 items-center justify-center px-4 text-sm font-semibold whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
                    isActive ? "text-pool-blue" : "text-ink-600 hover:text-pool-deep",
                  )}
                >
                  {t.label}
                  {isActive ? (
                    <span
                      aria-hidden="true"
                      className="bg-pool-blue absolute inset-x-3 bottom-0 h-[3px] rounded-full"
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
                <h2 className="font-display text-pool-deep text-lg font-bold">
                  Jugadores convocados
                </h2>
                <p className="text-ink-600 text-xs">{callupEntries.length} en la convocatoria</p>
              </div>
              <Sheet>
                <SheetTrigger asChild>
                  <Button size="sm">
                    <MdAutoAwesome className="h-4 w-4" aria-hidden="true" />
                    Sugerir convocatoria
                  </Button>
                </SheetTrigger>
                <SheetContent size="lg">
                  <SheetHeader>
                    <SheetTitle>Sugerir convocatoria</SheetTitle>
                    <SheetDescription>
                      Te proponemos los jugadores disponibles. Marca y ajusta dorsales antes de
                      confirmar.
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
            <h2 className="font-display text-pool-deep text-lg font-bold">Acta del partido</h2>
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
            <h2 className="font-display text-pool-deep text-lg font-bold">Detalles del partido</h2>
            {match.team ? (
              <MatchDetailsForm match={match} team={match.team} />
            ) : (
              <p className="text-ink-600 text-sm italic">No se puede editar: falta el equipo.</p>
            )}
          </>
        ) : null}

        {tab === "logistica" ? (
          <>
            <h2 className="font-display text-pool-deep text-lg font-bold">Logística</h2>
            {match.logistics_enabled ? (
              <div className="border-ink-200 bg-paper-card shadow-elev-1 rounded-2xl border p-4">
                <p className="text-pool-deep text-base font-extrabold">Desplazamiento activo</p>
                <p className="text-ink-600 mt-1 text-sm leading-relaxed">
                  Gestiona coches, plazas, salida y compensación desde la pantalla del viaje.
                </p>
                <Button asChild size="md" className="mt-4 w-full">
                  <Link href={`/matches/${match.id}/travel` as Route}>
                    <CarFront className="h-5 w-5" aria-hidden="true" /> Gestionar desplazamiento
                  </Link>
                </Button>
              </div>
            ) : (
              <EmptyState
                icon={<CarFront className="h-6 w-6" aria-hidden="true" />}
                title="Logística desactivada"
                description="Activa la logística en Detalles para empezar a organizar el viaje."
              />
            )}
          </>
        ) : null}
      </section>
    </AdminPageShell>
  );
}
