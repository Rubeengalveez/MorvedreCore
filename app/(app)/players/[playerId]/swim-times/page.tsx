import Link from "next/link";
import type { Route } from "next";
import { notFound, redirect } from "next/navigation";
import { Plus, Waves } from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { PageBackLink } from "@/components/ui/page-back-link";
import { PageHeader, PageShell, SectionHeader } from "@/components/ui/page-shell";
import { SwimHistoryList } from "@/components/swim-times/swim-history-list";
import { formatSwimTime, type SwimTimeEntryInput } from "@/lib/domain/swim-times";
import { getActiveProfileContext } from "@/server/queries/active-profile";
import { getPlayerSwimHistory, getSwimCoachTeamIds } from "@/server/queries/swim-times";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function PlayerSwimTimesPage({
  params,
  searchParams,
}: {
  params: Promise<{ playerId: string }>;
  searchParams: Promise<{ from?: string; teamId?: string; distance?: string }>;
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
  const back =
    origin.from === "times" && validTeamId
      ? { href: `/team/${validTeamId}/swim-times` as Route, label: "Volver a añadir tiempos" }
      : origin.from === "team" && validTeamId
        ? {
            href: `/team/${validTeamId}/players/${playerId}` as Route,
            label: "Volver a la ficha",
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
            : { href: "/profile" as Route, label: "Volver a Perfil" };

  return (
    <PageShell width="md" className="gap-5 pb-8">
      <PageBackLink href={back.href}>{back.label}</PageBackLink>
      <PageHeader
        title="Tiempos de nado"
        eyebrow={history.profile.full_name ?? "Jugador"}
        description="Consulta su tiempo actual, su mejor marca y todo el historial."
        icon={<Waves className="h-5 w-5" aria-hidden="true" />}
        action={
          addTeamId ? (
            <Button asChild size="sm">
              <Link href={`/team/${addTeamId}/swim-times` as Route}>
                <Plus className="h-4 w-4" aria-hidden="true" />
                Añadir tiempo
              </Link>
            </Button>
          ) : undefined
        }
      />

      <div className="flex items-center gap-3 px-1">
        <Avatar
          src={history.profile.photo_url}
          name={history.profile.full_name ?? "Jugador"}
          size={56}
        />
        <p className="text-pool-deep text-lg font-extrabold">{history.profile.full_name}</p>
      </div>

      <section aria-labelledby="swim-summary-heading" className="flex flex-col gap-3">
        <SectionHeader
          id="swim-summary-heading"
          eyebrow="Comparación"
          title="Tiempo actual y mejor tiempo"
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <SwimSummaryCard distance={50} latest={history.latest50} best={history.best50} />
          <SwimSummaryCard distance={100} latest={history.latest100} best={history.best100} />
        </div>
      </section>

      <section aria-labelledby="swim-history-heading" className="flex flex-col gap-3">
        <SectionHeader
          id="swim-history-heading"
          eyebrow={`${history.entries.length} ${history.entries.length === 1 ? "anotación" : "anotaciones"}`}
          title="Historial completo"
        />
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
    <article className="border-ink-200 bg-paper-card overflow-hidden rounded-2xl border shadow-sm">
      <h2 className="bg-pool-deep text-paper px-4 py-2 font-mono text-lg font-extrabold">
        {distance} m
      </h2>
      <dl className="divide-ink-200 divide-y">
        <SummaryValue label="Tiempo actual" entry={latest} value={value(latest)} />
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
    <div className="flex min-h-20 items-center justify-between gap-3 px-4 py-3">
      <div>
        <dt className="text-ink-600 text-sm font-bold">{label}</dt>
        {entry ? (
          <p className="text-ink-500 mt-1 text-xs">{formatShortDate(entry.test_date)}</p>
        ) : null}
      </div>
      <dd className="text-pool-deep font-mono text-xl font-extrabold tabular-nums">
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
