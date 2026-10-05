import type { Metadata, Route } from "next";
import { notFound, redirect } from "next/navigation";
import { CalendarDays } from "lucide-react";

import { PageShell } from "@/components/ui/page-shell";
import { PageBackLink } from "@/components/ui/page-back-link";
import { TeamMatches } from "@/components/team/team-matches";
import { TeamMatchCard } from "@/components/team/team-match-card";
import { TeamHero } from "@/components/team/team-hero";
import { getActiveProfileContext } from "@/server/queries/active-profile";
import { createClient } from "@/lib/supabase/server";
import { teamAdminOrigin } from "@/lib/domain/team-navigation-origin";
import { TeamNav } from "@/components/team/team-ui";
import { teamSeasonYear } from "@/lib/domain/team-presentation";
import { getTeamById, getTeamMatches, getTeamRoster, getTeamStaff } from "@/server/queries/teams";
import type { CategoryCode } from "@/lib/domain/categories";
import { getSwimCoachTeamIds } from "@/server/queries/swim-times";

import { TeamPlayersTab } from "./_components/team-players-tab";
import { TeamSwimTimesTab } from "./_components/team-swim-times-tab";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type TeamTabId = "principal" | "jugadores" | "partidos" | "tiempos";
type TeamMatch = Awaited<ReturnType<typeof getTeamMatches>>[number];

const TEAM_TABS: Array<{ id: TeamTabId; label: string }> = [
  { id: "principal", label: "Resumen" },
  { id: "jugadores", label: "Plantilla" },
  { id: "partidos", label: "Partidos" },
  { id: "tiempos", label: "Tiempos" },
];

function parseTab(value: string | undefined): TeamTabId {
  if (value === "jugadores" || value === "partidos" || value === "tiempos") return value;
  return "principal";
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ teamId: string }>;
}): Promise<Metadata> {
  const { teamId } = await params;
  const team = await getTeamById(teamId);
  if (!team) return { title: "Equipo — Morvedre Core" };
  return {
    title: `${team.label} — Morvedre Core`,
    description: `Plantilla y partidos de ${team.label}.`,
  };
}

export default async function TeamDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ teamId: string }>;
  searchParams: Promise<{
    tab?: string;
    list?: string;
    count?: string;
    from?: string;
    adminTab?: string;
  }>;
}) {
  const ctx = await getActiveProfileContext();
  if (!ctx) redirect("/login");

  const { teamId } = await params;
  const { tab, list, count, from, adminTab } = await searchParams;
  const activeTab = parseTab(tab);
  const origin = teamAdminOrigin(teamId, from, adminTab);
  const team = await getTeamById(teamId);
  if (!team) notFound();

  const supabase = await createClient();
  const [
    { data: season, error: seasonError },
    roster,
    staff,
    matches,
    swimCoachTeamIds,
    categoryTeams,
  ] = await Promise.all([
    supabase
      .from("seasons")
      .select("label,start_date,end_date")
      .eq("id", team.season_id)
      .maybeSingle(),
    getTeamRoster(team.id),
    getTeamStaff(team.id),
    getTeamMatches(team.id, 1000),
    getSwimCoachTeamIds(ctx.ownProfile.id),
    supabase
      .from("teams")
      .select("category_code,color")
      .eq("season_id", team.season_id)
      .order("label"),
  ]);
  if (seasonError || categoryTeams.error || !season)
    throw new Error("No pudimos cargar la temporada del equipo.");

  const upcoming = matches
    .filter((match) => match.status !== "played" && match.status !== "cancelled")
    .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at));
  const played = matches
    .filter((match) => match.status === "played")
    .sort((a, b) => b.scheduled_at.localeCompare(a.scheduled_at));
  const nextMatch = upcoming[0] ?? null;
  const lastMatch = played[0] ?? null;
  const basePath = `/team/${team.id}` as Route;

  return (
    <PageShell width="md" className="gap-4 pb-8">
      <div className="flex flex-col gap-2">
        <PageBackLink href={origin.href as Route}>{origin.label}</PageBackLink>

        <TeamHero team={team} homePool={team.home_pool} playerCount={roster.length} staff={staff} />
      </div>

      <TeamSectionNav active={activeTab} basePath={basePath} context={origin.context} />

      <div>
        {activeTab === "principal" ? (
          <TeamOverview
            teamId={team.id}
            nextMatch={nextMatch}
            lastMatch={lastMatch}
            context={origin.context}
          />
        ) : null}

        {activeTab === "jugadores" ? (
          <TeamPlayersTab
            teamId={team.id}
            context={origin.context}
            roster={roster}
            teamColor={team.color}
            teamCategory={team.category_code as CategoryCode}
            categoryYear={teamSeasonYear(season.start_date)}
            staff={staff}
            categoryColors={Object.fromEntries(
              (categoryTeams.data ?? []).map((t) => [t.category_code, t.color]),
            )}
          />
        ) : null}

        {activeTab === "partidos" ? (
          <TeamMatches
            teamId={team.id}
            context={origin.context}
            initialList={list}
            upcoming={upcoming}
            played={played}
            initialCount={
              Number.isInteger(Number(count)) && Number(count) > 5 && Number(count) <= 1000
                ? Number(count)
                : 5
            }
          />
        ) : null}

        {activeTab === "tiempos" ? (
          <TeamSwimTimesTab
            teamId={team.id}
            context={origin.context}
            teamLabel={team.label}
            teamColor={team.color}
            isCoach={swimCoachTeamIds.includes(team.id)}
            roster={roster}
          />
        ) : null}
      </div>
    </PageShell>
  );
}

function TeamSectionNav({
  active,
  basePath,
  context,
}: {
  active: TeamTabId;
  basePath: Route;
  context: string;
}) {
  return (
    <TeamNav
      label="Secciones del equipo"
      items={TEAM_TABS.map((tab) => ({
        label: tab.label,
        active: tab.id === active,
        href: `${basePath}?${new URLSearchParams({ ...(tab.id === "principal" ? {} : { tab: tab.id }), ...Object.fromEntries(new URLSearchParams(context)) })}`,
      }))}
    />
  );
}

function TeamOverview({
  teamId,
  nextMatch,
  lastMatch,
  context,
}: {
  teamId: string;
  nextMatch: TeamMatch | null;
  lastMatch: TeamMatch | null;
  context: string;
}) {
  return (
    <div className="space-y-5">
      <section aria-labelledby="team-agenda-heading">
        <SectionHeading eyebrow="Agenda" title="Por jugar" id="team-agenda-heading" />
        <div className="mt-3">
          {nextMatch ? (
            <TeamMatchCard match={nextMatch} teamId={teamId} tab="principal" context={context} />
          ) : (
            <EmptyPanel icon={CalendarDays} text="No hay partidos programados." />
          )}
        </div>
      </section>
      <section aria-labelledby="team-last-result-heading">
        <SectionHeading
          eyebrow="Historial"
          title="Último resultado"
          id="team-last-result-heading"
        />
        <div className="mt-3">
          {lastMatch ? (
            <TeamMatchCard match={lastMatch} teamId={teamId} tab="principal" context={context} />
          ) : (
            <EmptyPanel icon={CalendarDays} text="Todavía no hay resultados." />
          )}
        </div>
      </section>
    </div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  id,
  count,
}: {
  eyebrow: string;
  title: string;
  id: string;
  count?: number;
}) {
  return (
    <div className="border-pool-deep/65 bg-pool-deep flex items-end justify-between gap-3 rounded-xl border-2 px-4 py-3 text-white">
      <div>
        <p className="sr-only">{eyebrow}</p>
        <h2 id={id} className="font-display text-xl font-extrabold text-white">
          {title}
        </h2>
      </div>
      {count != null ? (
        <span className="border-pool-deep/65 bg-paper-card text-pool-deep inline-flex min-h-7 min-w-7 items-center justify-center rounded-full border px-2 text-sm font-extrabold tabular-nums">
          {count}
        </span>
      ) : null}
    </div>
  );
}

function EmptyPanel({ icon: Icon, text }: { icon: typeof CalendarDays; text: string }) {
  return (
    <div className="border-pool-deep/65 bg-paper-card flex min-h-28 flex-col items-center justify-center rounded-2xl border-2 px-5 text-center text-sm text-slate-700">
      <Icon className="mb-2 h-5 w-5" aria-hidden="true" />
      {text}
    </div>
  );
}
