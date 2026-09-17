import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { Trofeo } from "@/components/brand/pictograms";
import { RankingsSectionNav } from "@/components/rankings/rankings-section-nav";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader, PageShell } from "@/components/ui/page-shell";
import { getActiveProfileContext } from "@/server/queries/active-profile";
import {
  getRankings,
  getRankingsMeta,
  type RankingsPageMeta,
  type RankingResult,
} from "@/server/queries/rankings";
import { CATEGORY_LABELS, type CategoryCode } from "@/lib/domain/categories";
import { type RankingMetric, type RankingScope } from "@/lib/domain/rankings";

import { RankingsContent } from "@/components/rankings/rankings-content";
import { SwimRankingsContent } from "@/components/rankings/swim-rankings-content";
import type { RankingPageMetric } from "@/components/rankings/metric-tabs";
import { getSwimRanking } from "@/server/queries/swim-times";
import type { SwimDistance, SwimRankingMode } from "@/lib/domain/swim-times";

import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Rankings - Morvedre Core",
  description: "Goles, MVP, expulsiones y asistencia de la temporada.",
};

async function loadCoachOrAdmin(profileId: string): Promise<boolean> {
  const supabase = await createClient();
  const [{ data: roles }, { data: staff }] = await Promise.all([
    supabase
      .from("user_roles")
      .select("role")
      .eq("profile_id", profileId)
      .in("role", ["admin", "coach"]),
    supabase
      .from("team_staff")
      .select("role")
      .eq("profile_id", profileId)
      .in("role", ["head_coach", "assistant_coach"]),
  ]);
  return (roles?.length ?? 0) > 0 || (staff?.length ?? 0) > 0;
}

function parseScope(scopeStr: string | undefined): RankingScope {
  if (!scopeStr || scopeStr === "all") return { kind: "all" };
  if (scopeStr.startsWith("category:")) {
    return {
      kind: "category",
      category_code: scopeStr.slice("category:".length) as CategoryCode,
    };
  }
  if (scopeStr.startsWith("team:")) {
    return { kind: "team", team_id: scopeStr.slice("team:".length) };
  }
  return { kind: "all" };
}

function parseMetric(metricStr: string | undefined): RankingPageMetric {
  if (metricStr === "swim") return "swim";
  if (metricStr === "exclusions" || metricStr === "mvp" || metricStr === "attendance") {
    return metricStr;
  }
  return "goals";
}

function parsePage(pageStr: string | undefined): number {
  if (!pageStr) return 1;
  const parsed = Number.parseInt(pageStr, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return parsed;
}

function scopeLabelOf(scope: RankingScope, meta: RankingsPageMeta): string {
  if (scope.kind === "all") return "Club";
  if (scope.kind === "category") {
    return CATEGORY_LABELS[scope.category_code] ?? scope.category_code;
  }
  const team = meta.teams.find((t) => t.id === scope.team_id);
  return team?.label ?? "Equipo";
}

export default async function RankingsPage({
  searchParams,
}: {
  searchParams: Promise<{
    scope?: string;
    metric?: string;
    page?: string;
    distance?: string;
    mode?: string;
  }>;
}) {
  const ctx = await getActiveProfileContext();
  if (!ctx) redirect("/login");
  const { activeProfile, ownProfile, linkedProfiles } = ctx;

  const [isCoachOrAdminOwn, isCoachOrAdminActive] = await Promise.all([
    loadCoachOrAdmin(ownProfile.id),
    ownProfile.id === activeProfile.id ? Promise.resolve(false) : loadCoachOrAdmin(activeProfile.id),
  ]);
  const canViewAttendance = isCoachOrAdminOwn || isCoachOrAdminActive;

  const sp = await searchParams;
  const scope = parseScope(sp.scope);
  const requestedMetric = parseMetric(sp.metric);
  const metric = !canViewAttendance && requestedMetric === "attendance" ? "goals" : requestedMetric;
  const page = parsePage(sp.page);
  const distance: SwimDistance = sp.distance === "100" ? 100 : 50;
  const mode: SwimRankingMode = sp.mode === "best" ? "best" : "latest";

  const meta = await getRankingsMeta();
  if (!meta.season.id) {
    return (
      <PageShell width="md">
        <EmptyState
          icon={<Trofeo className="h-7 w-7" accent="currentColor" />}
          title="Los rankings todavía no han empezado"
          description="Cuando haya una temporada activa y resultados registrados, aparecerán aquí."
        />
      </PageShell>
    );
  }

  const ranking =
    metric === "swim"
      ? null
      : await getRankings({
          season_id: meta.season.id,
          scope,
          metric: metric as RankingMetric,
          my_player_id: activeProfile.id,
          min_trainings_total: metric === "attendance" ? 3 : 0,
        });
  const swimRows =
    metric === "swim"
      ? await getSwimRanking({
          seasonId: meta.season.id,
          distance,
          mode,
          category: scope.kind === "category" ? scope.category_code : null,
          teamId: scope.kind === "team" ? scope.team_id : null,
        })
      : null;

  const scopeLabel = scopeLabelOf(scope, meta);

  return (
    <PageShell width="md" className="gap-5 pb-8">
      <PageHeader
        eyebrow={`${meta.season.label} · ${scopeLabel}`}
        title="Rankings"
        description="Rendimiento y constancia de la temporada."
        icon={<Trofeo className="h-5 w-5" accent="currentColor" />}
      />

      <RankingsSectionNav active="season" />

      {metric === "swim" && swimRows ? (
        <SwimRankingsContent
          meta={meta}
          rows={swimRows}
          scope={scope}
          distance={distance}
          mode={mode}
          page={page}
          myPlayerId={activeProfile.id}
          canViewAttendance={canViewAttendance}
        />
      ) : ranking ? (
        <RankingsContent
          meta={meta}
          ranking={ranking as RankingResult}
          activeScope={scope}
          activeMetric={metric as RankingMetric}
          myPlayerId={activeProfile.id}
          ownProfileId={ownProfile.id}
          trackedPlayerIds={Array.from(
            new Set([ownProfile.id, ...linkedProfiles.map((profile) => profile.id)]),
          )}
          page={page}
          canViewAttendance={canViewAttendance}
        />
      ) : null}
    </PageShell>
  );
}
