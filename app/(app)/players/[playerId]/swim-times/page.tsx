import Link from "next/link";
import type { Route } from "next";
import { notFound, redirect } from "next/navigation";
import { Plus } from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { PageBackLink } from "@/components/ui/page-back-link";
import { PageShell } from "@/components/ui/page-shell";
import { TeamHeading } from "@/components/team/team-ui";
import { AdaptivePlayerName } from "@/components/ui/adaptive-player-name";
import { SwimHistoryList } from "@/components/swim-times/swim-history-list";
import { formatSwimTime, type SwimTimeEntryInput } from "@/lib/domain/swim-times";
import { getActiveProfileContext } from "@/server/queries/active-profile";
import { getPlayerSwimHistory, getSwimCoachTeamIds } from "@/server/queries/swim-times";
import { teamAdminOrigin } from "@/lib/domain/team-navigation-origin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function PlayerSwimTimesPage({
  params,
  searchParams,
}: {
  params: Promise<{ playerId: string }>;
  searchParams: Promise<{
    from?: string;
    teamId?: string;
    distance?: string;
    teamFrom?: string;
    teamAdminTab?: string;
  }>;
}) {
  const ctx = await getActiveProfileContext();
  if (!ctx) redirect("/login");
  const { playerId } = await params;
  const origin = await searchParams;
  const [history, coachTeamIds] = await Promise.all([
    getPlayerSwimHistory(playerId),
    getSwimCoachTeamIds(ctx.ownProfile.id),
  ]);
  if (!history || !history.profile) notFound();
  const addTeamId =
    history.currentTeamIds.find((teamId) => coachTeamIds.includes(teamId)) ??
    history.entries.find((entry) => coachTeamIds.includes(entry.team_id))?.team_id ??
    null;
  const validTeamId =
    origin.teamId &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(origin.teamId)
      ? origin.teamId
      : null;
  const swimDistance = origin.distance === "100" ? "100" : "50";
  const teamOrigin = teamAdminOrigin(validTeamId ?? "", origin.teamFrom, origin.teamAdminTab);
  const context =
    validTeamId && (origin.from === "team" || origin.from === "times") ? teamOrigin.context : "";
  const back =
    origin.from === "times" && validTeamId
      ? { href: `/team/${validTeamId}/swim-times` as Route, label: "Volver a añadir tiempos" }
      : origin.from === "team" && validTeamId
        ? {
            href: `/team/${validTeamId}?tab=tiempos` as Route,
            label: "Volver a los tiempos del equipo",
          }
        : origin.from === "rankings"
          ? {
              href: `/rankings?metric=swim&distance=${swimDistance}` as Route,
              label: "Volver a Rankings",
            }
          : origin.from === "legends"
            ? {
                href: `/legends?metric=swim${swimDistance}` as Route,
                label: "Volver a Leyendas",
              }
            : origin.from === "family"
              ? { href: "/profile/family" as Route, label: "Mi familia" }
              : origin.from === "profile-activity"
                ? { href: "/profile/activity" as Route, label: "Mi actividad" }
                : { href: "/profile" as Route, label: "Volver a Perfil" };
  if (context) back.href = `${back.href}${back.href.includes("?") ? "&" : "?"}${context}` as Route;

  return (
    <PageShell width="md" className="gap-5 pb-8">
      <PageBackLink href={back.href}>{back.label}</PageBackLink>
      <TeamHeading
        title="Tiempos de nado"
        action={
          addTeamId ? (
            <Button asChild size="sm">
              <Link
                href={
                  `/team/${addTeamId}/swim-times${context && validTeamId === addTeamId ? `?${context}` : ""}` as Route
                }
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                Añadir tiempo
              </Link>
            </Button>
          ) : undefined
        }
      />

      <div className="border-pool-deep bg-pool-deep flex items-center gap-3 rounded-2xl border-2 p-4 text-white">
        <Avatar
          src={history.profile.photo_url}
          name={history.profile.full_name ?? "Jugador"}
          size={64}
        />
        <p className="min-w-0 flex-1 text-lg font-extrabold">
          <AdaptivePlayerName name={history.profile.full_name ?? "Jugador"} />
        </p>
      </div>

      <section aria-labelledby="swim-summary-heading" className="flex flex-col gap-3">
        <h2 id="swim-summary-heading" className="text-pool-deep text-xl font-extrabold">
          Tus marcas
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <SwimSummaryCard distance={50} latest={history.latest50} best={history.best50} />
          <SwimSummaryCard distance={100} latest={history.latest100} best={history.best100} />
        </div>
      </section>

      <section aria-labelledby="swim-history-heading" className="flex flex-col gap-3">
        <h2
          id="swim-history-heading"
          className="text-pool-deep flex items-center justify-between gap-3 text-xl font-extrabold"
        >
          Historial{" "}
          <span className="border-pool-deep/65 rounded-lg border bg-white px-2 py-1 text-base tabular-nums">
            {history.entries.length}
          </span>
        </h2>
        <SwimHistoryList initialEntries={history.entries} editableTeamIds={coachTeamIds} />
      </section>
    </PageShell>
  );
}

function SwimSummaryCard({
  distance,
  latest,
  best,
}: {
  distance: 50 | 100;
  latest: SwimTimeEntryInput | null;
  best: SwimTimeEntryInput | null;
}) {
  const value = (entry: SwimTimeEntryInput | null) =>
    entry ? (distance === 50 ? entry.time_50_cs : entry.time_100_cs) : null;
  return (
    <article className="border-pool-deep/65 bg-paper-card overflow-hidden rounded-2xl border-2 shadow-sm">
      <h2 className="bg-pool-deep text-paper px-4 py-2 font-mono text-lg font-extrabold">
        {distance} m
      </h2>
      <dl className="grid grid-cols-2 gap-2 p-3">
        <SummaryValue label="Último tiempo" entry={latest} value={value(latest)} />
        <SummaryValue label="Mejor tiempo" entry={best} value={value(best)} />
      </dl>
    </article>
  );
}

function SummaryValue({
  label,
  entry,
  value,
}: {
  label: string;
  entry: SwimTimeEntryInput | null;
  value: number | null;
}) {
  return (
    <div className="border-pool-deep/65 flex min-h-24 flex-col items-center justify-center gap-2 rounded-xl border bg-blue-50 px-2 py-3 text-center">
      <dt className="text-pool-deep text-base font-bold">
        {label}
        {entry ? (
          <span className="mt-1 block text-sm font-medium text-slate-700">
            {formatShortDate(entry.test_date)}
          </span>
        ) : null}
      </dt>
      <dd className="text-pool-deep shrink-0 font-mono text-lg font-extrabold whitespace-nowrap tabular-nums">
        {value ? formatSwimTime(value) : "—"}
      </dd>
    </div>
  );
}

function formatShortDate(value: string): string {
  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}
