import Link from "next/link";
import { notFound } from "next/navigation";
import type { Route } from "next";
import { Plus, UsersRound } from "lucide-react";
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
import { MatchEditorHeader } from "./_components/match-editor-header";
import { sheetSchema, score } from "@/lib/domain/live-match";
import { PageBackLink } from "@/components/ui/page-back-link";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils/cn";
import type { CallupRow, MatchRow, MatchStatRow, Team } from "@/server/actions/admin";
import { getRenderAdminAccess } from "@/server/actions/admin/_helpers";
import { canManageTeam, getTeamScope, canUseLiveMatch } from "@/lib/domain/permissions";

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

type MatchWithTeam = MatchRow & {
  team: Pick<Team, "id" | "label" | "color"> | null;
};

async function loadMatch(
  id: string,
  teamScope: string[] | null,
): Promise<{
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
  if (teamScope?.length === 0) return null;

  let matchQuery = supabase
    .from("matches")
    .select(
      "id, season_id, team_id, opponent, competition_type, is_home, location, pool_name, scheduled_at, status, logistics_enabled, notes, final_score_us, final_score_them, created_at, updated_at",
    )
    .eq("id", id);
  if (teamScope) {
    matchQuery = matchQuery.in("team_id", teamScope);
  }
  const { data: matchData, error: matchError } = await matchQuery.maybeSingle();

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
      .eq("is_active", true)
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
  searchParams: Promise<{ tab?: string; from?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const requestedTab = sp.tab;
  const origin = sp.from === "match" ? "match" : "admin";
  const access = await getRenderAdminAccess();
  const teamScope = getTeamScope(access, "match_operations");

  const data = await loadMatch(id, teamScope);
  if (!data || !data.match) {
    notFound();
  }
  const { match, callups, stats, profileMeta, teamById, availability } = data;
  const tabs = match.logistics_enabled ? TABS : TABS.filter((item) => item.value !== "logistica");
  const tab: Tab = (tabs.find((item) => item.value === requestedTab)?.value ??
    "convocatoria") as Tab;
  const backHref = origin === "match" ? (`/matches/${match.id}` as Route) : "/admin/matches";
  const backLabel = origin === "match" ? "Volver al partido" : "Partidos";
  const { data: liveSheet } = await (
    await createClient()
  )
    .from("live_match_sheets")
    .select("match_id,document")
    .eq("match_id", match.id)
    .maybeSingle();
  const canEditMatch = canManageTeam(access, "match_schedule", match.team_id);
  const parsedSheet = sheetSchema.safeParse(liveSheet?.document);
  const regulationScore = parsedSheet.success && parsedSheet.data.shootout ? {
    home: score(parsedSheet.data, match.is_home ? "us" : "them"),
    away: score(parsedSheet.data, match.is_home ? "them" : "us"),
  } : null;

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
    <AdminPageShell className="gap-3">
      <PageBackLink href={backHref}>{backLabel}</PageBackLink>
      <h1 className="sr-only">
        Gestionar {match.team?.label ?? "Morvedre"} contra {match.opponent}
      </h1>

      <div className="flex flex-col gap-2">
        <MatchEditorHeader
          regulationScore={regulationScore}
          teamLabel={match.team?.label ?? "Morvedre"}
          opponent={match.opponent}
          isHome={match.is_home}
          scheduledAt={match.scheduled_at}
          competitionLabel={COMPETITION_LABELS[match.competition_type] ?? match.competition_type}
          status={match.status}
          scoreUs={match.final_score_us}
          scoreThem={match.final_score_them}
        />
        <nav
          aria-label="Secciones del partido"
          className="border-ink-200 bg-paper-card rounded-xl border p-1"
        >
          <ul className={cn("grid gap-1", tabs.length === 4 ? "grid-cols-4" : "grid-cols-3")}>
            {tabs.map((t) => {
              const isActive = tab === t.value;
              return (
                <li key={t.value} className="min-w-0">
                  <Link
                    href={`/admin/matches/${match.id}?tab=${t.value}&from=${origin}` as Route}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "focus-visible:outline-pool-blue flex min-h-11 items-center justify-center rounded-lg px-1 text-xs font-bold transition-colors focus-visible:outline-2 min-[360px]:text-sm",
                      isActive
                        ? "bg-pool-deep text-paper"
                        : "text-ink-600 hover:bg-pool-ice hover:text-pool-deep",
                    )}
                  >
                    {t.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>

      <section className="border-ink-200 bg-paper-card flex flex-col gap-4 rounded-2xl border p-3 sm:p-5">
        {tab === "convocatoria" ? (
          <>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <h2 className="font-display text-pool-deep text-lg font-extrabold sm:text-xl">
                  Convocatoria
                </h2>
                <span
                  className="bg-pool-foam text-pool-blue inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-extrabold"
                  aria-label={`${callups.length} convocados`}
                >
                  <UsersRound className="h-4 w-4" aria-hidden="true" />
                  {callups.length}
                </span>
              </div>
              <Sheet>
                <SheetTrigger asChild>
                  <Button
                    size="sm"
                    variant="deep"
                    className="shrink-0 gap-1.5 rounded-xl px-3"
                    aria-label="Añadir jugadores"
                  >
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    Añadir
                  </Button>
                </SheetTrigger>
                <SheetContent
                  size="full"
                  className="sm:right-0 sm:left-auto sm:w-[42rem] sm:rounded-tl-xl"
                >
                  <SheetHeader className="shrink-0 pr-14">
                    <SheetTitle>Añadir jugadores</SheetTitle>
                    <SheetDescription>Elige quién viene al partido.</SheetDescription>
                  </SheetHeader>
                  <SheetBody className="min-h-0 overflow-hidden px-0">
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
            <div>
              <h2 className="font-display text-pool-deep text-xl font-extrabold">
                Completa el acta
              </h2>
              <p className="text-ink-600 mt-0.5 text-sm">
                Resultado, goles y expulsiones con controles grandes.
              </p>
            </div>
            {liveSheet && canUseLiveMatch(access, match.team_id) ? (
              <a
                href={`/acta?match=${match.id}`}
                className="bg-pool-deep text-paper flex min-h-14 items-center justify-center rounded-xl p-4 text-lg font-bold"
              >
                Continuar o consultar el acta en directo →
              </a>
            ) : (
              <ActaManager
                match={{
                  id: match.id,
                  status: match.status,
                  final_score_us: match.final_score_us,
                  final_score_them: match.final_score_them,
                }}
                entries={actaEntries}
              />
            )}
          </>
        ) : null}

        {tab === "detalles" ? (
          <>
            <div>
              <p className="text-pool-blue text-xs font-extrabold tracking-[0.12em] uppercase">
                Configuración
              </p>
              <h2 className="font-display text-pool-deep text-xl font-extrabold">
                Detalles del partido
              </h2>
              <p className="text-ink-600 mt-0.5 text-sm">
                {canEditMatch
                  ? "Edita la información que verá el equipo."
                  : "La programación la gestiona el entrenador o la persona responsable de partidos."}
              </p>
            </div>
            {match.team && canEditMatch ? (
              <MatchDetailsForm match={match} team={match.team} />
            ) : (
              <Button asChild variant="outline">
                <Link href={`/matches/${match.id}` as Route}>Ver información del partido</Link>
              </Button>
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
                description={
                  canEditMatch
                    ? "Activa la logística en Detalles para empezar a organizar el viaje."
                    : "Pide al entrenador o a la persona responsable de partidos que active la logística."
                }
              />
            )}
          </>
        ) : null}
      </section>
    </AdminPageShell>
  );
}
