import type { Metadata, Route } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, CalendarDays, ChevronRight, ExternalLink, MapPin, UserRoundCog } from "lucide-react";

import { PageShell } from "@/components/ui/page-shell";
import { TeamHero } from "@/components/team/team-hero";
import { getActiveProfileContext } from "@/server/queries/active-profile";
import { getCurrentSeason } from "@/server/queries/seasons";
import { getTeamById, getTeamMatches, getTeamRoster, getTeamStaff } from "@/server/queries/teams";
import { cn } from "@/lib/utils/cn";
import { isSafeMapsUrl } from "@/lib/domain/maps";
import type { CategoryCode } from "@/lib/domain/categories";

import { TeamPlayersTab } from "./_components/team-players-tab";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type TeamTabId = "principal" | "jugadores" | "partidos";
type TeamMatch = Awaited<ReturnType<typeof getTeamMatches>>[number];

const TEAM_TABS: Array<{ id: TeamTabId; label: string }> = [
  { id: "principal", label: "Resumen" },
  { id: "jugadores", label: "Plantilla" },
  { id: "partidos", label: "Partidos" },
];

function parseTab(value: string | undefined): TeamTabId {
  if (value === "jugadores" || value === "partidos") return value;
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
  searchParams: Promise<{ tab?: string }>;
}) {
  const ctx = await getActiveProfileContext();
  if (!ctx) redirect("/login");

  const { teamId } = await params;
  const { tab } = await searchParams;
  const activeTab = parseTab(tab);
  const team = await getTeamById(teamId);
  if (!team) notFound();

  const [season, roster, staff, matches] = await Promise.all([
    getCurrentSeason(),
    getTeamRoster(team.id),
    getTeamStaff(team.id),
    getTeamMatches(team.id, 30),
  ]);

  const upcoming = matches
    .filter((match) => match.status !== "played")
    .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at));
  const played = matches
    .filter((match) => match.status === "played")
    .sort((a, b) => b.scheduled_at.localeCompare(a.scheduled_at));
  const nextMatch = upcoming[0] ?? null;
  const lastMatch = played[0] ?? null;
  const basePath = `/team/${team.id}` as Route;

  return (
    <PageShell width="md" className="gap-5 pb-8">
      <Link
        href="/team"
        className="text-pool-blue hover:bg-pool-foam focus-visible:ring-pool-blue -ml-2 inline-flex min-h-11 w-fit touch-manipulation items-center gap-2 rounded-xl px-2 text-sm font-extrabold transition-colors focus-visible:ring-2 focus-visible:outline-none"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Todos los equipos
      </Link>

      <TeamHero
        team={team}
        seasonLabel={season?.label ?? null}
        homePool={team.home_pool}
        playerCount={roster.length}
        staffCount={staff.length}
      />

      <TeamSectionNav active={activeTab} basePath={basePath} />

      <div>
        {activeTab === "principal" ? (
          <TeamOverview
            teamLabel={team.label}
            teamColor={team.color}
            staff={staff}
            nextMatch={nextMatch}
            lastMatch={lastMatch}
          />
        ) : null}

        {activeTab === "jugadores" ? (
          <TeamPlayersTab
            teamId={team.id}
            roster={roster}
            teamColor={team.color}
            teamCategory={team.category_code as CategoryCode}
            categoryYear={
              season ? new Date(season.end_date).getFullYear() : new Date().getFullYear()
            }
            staff={staff}
          />
        ) : null}

        {activeTab === "partidos" ? (
          <TeamMatchesTab
            teamLabel={team.label}
            teamColor={team.color}
            upcoming={upcoming}
            played={played}
          />
        ) : null}
      </div>
    </PageShell>
  );
}

function TeamSectionNav({ active, basePath }: { active: TeamTabId; basePath: Route }) {
  return (
    <nav
      aria-label="Secciones del equipo"
      className="border-ink-200 bg-paper-card grid grid-cols-3 gap-1 rounded-2xl border p-1.5 shadow-sm"
    >
      {TEAM_TABS.map((tab) => {
        const isActive = tab.id === active;
        const href = tab.id === "principal" ? basePath : (`${basePath}?tab=${tab.id}` as Route);
        return (
          <Link
            key={tab.id}
            href={href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "focus-visible:ring-pool-blue inline-flex min-h-11 touch-manipulation items-center justify-center rounded-xl px-2 text-sm font-extrabold transition-[background-color,color,transform] duration-200 focus-visible:ring-2 focus-visible:outline-none active:scale-[0.98] motion-reduce:transition-none",
              isActive
                ? "bg-pool-deep text-paper"
                : "text-ink-500 hover:bg-pool-foam hover:text-pool-deep",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}

function TeamOverview({
  teamLabel,
  teamColor,
  staff,
  nextMatch,
  lastMatch,
}: {
  teamLabel: string;
  teamColor: string;
  staff: Awaited<ReturnType<typeof getTeamStaff>>;
  nextMatch: TeamMatch | null;
  lastMatch: TeamMatch | null;
}) {
  const leadStaff = staff.find((member) => member.role === "head_coach") ?? staff[0] ?? null;

  return (
    <div className="flex flex-col gap-7">
      <section aria-labelledby="team-agenda-heading">
        <SectionHeading eyebrow="Agenda" title="Lo próximo" id="team-agenda-heading" />
        <div className="mt-3">
          {nextMatch ? (
            <MatchLedger teamLabel={teamLabel} teamColor={teamColor} matches={[nextMatch]} />
          ) : (
            <EmptyPanel icon={CalendarDays} text="No hay partidos programados." />
          )}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-7 md:grid-cols-2">
        <section aria-labelledby="team-last-result-heading">
          <SectionHeading
            eyebrow="Competición"
            title="Último resultado"
            id="team-last-result-heading"
          />
          <div className="mt-3">
            {lastMatch ? (
              <MatchLedger teamLabel={teamLabel} teamColor={teamColor} matches={[lastMatch]} />
            ) : (
              <EmptyPanel icon={CalendarDays} text="Todavía no hay resultados." />
            )}
          </div>
        </section>

        <section aria-labelledby="team-lead-heading">
          <SectionHeading
            eyebrow="Referencia"
            title="Responsable del equipo"
            id="team-lead-heading"
          />
          <div className="border-ink-200 bg-paper-card mt-3 flex min-h-[112px] items-center gap-4 rounded-2xl border px-4 py-4 shadow-sm">
            <span className="bg-pool-foam text-pool-deep flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl">
              <UserRoundCog className="h-6 w-6" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="font-display text-pool-deep truncate text-base font-extrabold">
                {leadStaff?.full_name ?? "Sin asignar"}
              </p>
              <p className="text-ink-500 mt-1 text-sm">
                {leadStaff ? staffRoleLabel(leadStaff.role) : "El cuerpo técnico aparecerá aquí."}
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function TeamMatchesTab({
  teamLabel,
  teamColor,
  upcoming,
  played,
}: {
  teamLabel: string;
  teamColor: string;
  upcoming: TeamMatch[];
  played: TeamMatch[];
}) {
  return (
    <div className="flex flex-col gap-8">
      <section aria-labelledby="upcoming-matches-heading">
        <SectionHeading
          eyebrow="Agenda"
          title="Próximos partidos"
          id="upcoming-matches-heading"
          count={upcoming.length}
        />
        <div className="mt-3">
          {upcoming.length > 0 ? (
            <MatchLedger teamLabel={teamLabel} teamColor={teamColor} matches={upcoming} />
          ) : (
            <EmptyPanel icon={CalendarDays} text="No hay partidos programados." />
          )}
        </div>
      </section>

      <section aria-labelledby="played-matches-heading">
        <SectionHeading
          eyebrow="Historial"
          title="Resultados"
          id="played-matches-heading"
          count={played.length}
        />
        <div className="mt-3">
          {played.length > 0 ? (
            <MatchLedger teamLabel={teamLabel} teamColor={teamColor} matches={played} />
          ) : (
            <EmptyPanel icon={CalendarDays} text="Todavía no hay resultados." />
          )}
        </div>
      </section>
    </div>
  );
}

function MatchLedger({
  teamLabel,
  teamColor,
  matches,
}: {
  teamLabel: string;
  teamColor: string;
  matches: TeamMatch[];
}) {
  return (
    <ul className="flex flex-col gap-3">
      {matches.map((match) => (
        <li key={match.id}>
          <MatchLedgerRow match={match} teamLabel={teamLabel} teamColor={teamColor} />
        </li>
      ))}
    </ul>
  );
}

function MatchLedgerRow({
  match,
  teamLabel,
  teamColor,
}: {
  match: TeamMatch;
  teamLabel: string;
  teamColor: string;
}) {
  const isPlayed = match.status === "played";
  const localTeam = match.is_home ? teamLabel : match.opponent;
  const visitorTeam = match.is_home ? match.opponent : teamLabel;
  const localScore = match.is_home ? match.final_score_us : match.final_score_them;
  const visitorScore = match.is_home ? match.final_score_them : match.final_score_us;
  const outcome = matchOutcome(match.final_score_us, match.final_score_them);
  const date = new Date(match.scheduled_at);
  const dateLabel = new Intl.DateTimeFormat("es-ES", {
    weekday: "short",
    day: "numeric",
    month: "long",
  }).format(date);
  const displayDate = `${dateLabel.charAt(0).toUpperCase()}${dateLabel.slice(1)}`;
  const time = new Intl.DateTimeFormat("es-ES", { hour: "2-digit", minute: "2-digit" }).format(
    date,
  );
  const location = match.location ?? match.pool_name;
  const hasMaps = isSafeMapsUrl(match.maps_url);
  const locationText = location ?? (match.is_home ? "Partido en casa" : "Partido como visitante");

  return (
    <article className="group border-ink-200 bg-paper-card hover:border-pool-blue/35 hover:shadow-elev-2 overflow-hidden rounded-2xl border shadow-sm transition-[border-color,box-shadow,transform]">
      <Link
        href={`/matches/${match.id}` as Route}
        className="focus-visible:ring-pool-blue block touch-manipulation focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
      >
        <div className="border-ink-200 bg-paper-sunk flex min-h-16 items-center justify-between gap-3 border-b px-4 py-3">
          <div className="min-w-0">
            <p className="text-pool-deep truncate text-sm font-extrabold">{displayDate}</p>
            <p className="text-ink-500 mt-0.5 text-xs font-bold tracking-wide uppercase">
              {competitionLabel(match.competition_type)}
            </p>
          </div>
          {isPlayed && outcome ? (
            <OutcomeLabel outcome={outcome} />
          ) : (
            <span className="bg-pool-deep text-paper shrink-0 rounded-xl px-3 py-2 font-mono text-base font-extrabold tabular-nums">
              {time}
            </span>
          )}
        </div>

        <div className="grid min-h-36 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 px-4 py-5 sm:gap-5 sm:px-5">
          <MatchTeam
            label={localTeam}
            venue="Local"
            score={localScore}
            showScore={isPlayed}
            isOwn={match.is_home}
            align="left"
            color={teamColor}
          />
          <div className="text-ink-300 flex min-w-9 items-center justify-center font-mono text-xl font-extrabold">
            {isPlayed ? ":" : "vs"}
          </div>
          <MatchTeam
            label={visitorTeam}
            venue="Visitante"
            score={visitorScore}
            showScore={isPlayed}
            isOwn={!match.is_home}
            align="right"
            color={teamColor}
          />
        </div>
      </Link>

      <div className="border-ink-200 text-ink-500 flex min-h-12 min-w-0 items-center gap-2 border-t text-sm">
        {hasMaps ? (
          <a
            href={match.maps_url ?? "#"}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Abrir ${locationText} en Google Maps`}
            className="focus-visible:ring-pool-blue flex min-h-12 min-w-0 flex-1 touch-manipulation items-center gap-2 px-4 py-3 transition-colors hover:text-pool-blue focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="truncate font-semibold underline decoration-2 underline-offset-4">
              {locationText}
            </span>
            <ExternalLink
              className="ml-auto h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
              aria-hidden="true"
            />
          </a>
        ) : (
          <div className="flex min-h-12 min-w-0 flex-1 items-center gap-2 px-4 py-3">
            <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="truncate">{locationText}</span>
          </div>
        )}
        <Link
          href={`/matches/${match.id}` as Route}
          aria-label="Ver detalle del partido"
          className="focus-visible:ring-pool-blue flex h-12 w-12 shrink-0 touch-manipulation items-center justify-center border-l border-ink-200 transition-colors hover:bg-pool-foam/40 hover:text-pool-blue focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          <ChevronRight className="h-5 w-5" aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}

function MatchTeam({
  label,
  venue,
  score,
  showScore,
  isOwn,
  align,
  color,
}: {
  label: string;
  venue: "Local" | "Visitante";
  score: number | null;
  showScore: boolean;
  isOwn: boolean;
  align: "left" | "right";
  color: string;
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col",
        align === "right" ? "items-end text-right" : "items-start text-left",
      )}
    >
      <span className="text-ink-500 text-xs font-extrabold tracking-wide uppercase">{venue}</span>
      <p
        className={cn(
          "mt-1 line-clamp-2 min-h-10 text-base leading-tight",
          isOwn ? "text-pool-deep font-extrabold" : "text-ink-700 font-bold",
        )}
      >
        {isOwn ? (
          <span
            aria-hidden="true"
            className="mr-1.5 inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: color }}
          />
        ) : null}
        {label}
      </p>
      {showScore ? (
        <span className="text-pool-deep mt-3 font-mono text-4xl leading-none font-extrabold tabular-nums sm:text-5xl">
          {score ?? "–"}
        </span>
      ) : null}
    </div>
  );
}

function OutcomeLabel({ outcome }: { outcome: "win" | "draw" | "loss" }) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-1 text-xs font-extrabold tracking-wide uppercase",
        outcome === "win" && "bg-success/12 text-success",
        outcome === "draw" && "bg-ink-100 text-ink-600",
        outcome === "loss" && "bg-goggle-red/10 text-goggle-red",
      )}
    >
      {outcome === "win" ? "Victoria" : outcome === "loss" ? "Derrota" : "Empate"}
    </span>
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
    <div className="flex items-end justify-between gap-3 px-1">
      <div>
        <p className="text-pool-blue text-xs font-extrabold tracking-[0.12em] uppercase">
          {eyebrow}
        </p>
        <h2 id={id} className="font-display text-pool-deep text-xl font-extrabold">
          {title}
        </h2>
      </div>
      {count != null ? (
        <span className="text-ink-500 text-sm font-semibold tabular-nums">{count}</span>
      ) : null}
    </div>
  );
}

function EmptyPanel({ icon: Icon, text }: { icon: typeof CalendarDays; text: string }) {
  return (
    <div className="border-ink-200 bg-paper-card text-ink-500 flex min-h-28 flex-col items-center justify-center rounded-2xl border border-dashed px-5 text-center text-sm">
      <Icon className="mb-2 h-5 w-5" aria-hidden="true" />
      {text}
    </div>
  );
}

function competitionLabel(type: string | null | undefined): string {
  if (type === "tournament") return "Torneo";
  if (type === "friendly") return "Amistoso";
  if (type === "cup") return "Copa";
  return "Liga";
}

function matchOutcome(us: number | null, them: number | null): "win" | "draw" | "loss" | null {
  if (us == null || them == null) return null;
  if (us > them) return "win";
  if (us < them) return "loss";
  return "draw";
}

function staffRoleLabel(role: string): string {
  if (role === "head_coach") return "Entrenador principal";
  if (role === "assistant_coach") return "Entrenador asistente";
  if (role === "delegate") return "Delegado";
  if (role === "physical_trainer") return "Preparador físico";
  return role;
}
