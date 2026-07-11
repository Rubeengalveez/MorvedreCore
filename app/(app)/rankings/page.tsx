import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { Trofeo } from "@/components/brand/pictograms";
import { AppPageHero } from "@/components/ui/app-page-hero";
import { EmptyState } from "@/components/ui/empty-state";
import { PageShell } from "@/components/ui/page-shell";
import { createClient } from "@/lib/supabase/server";
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

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Rankings - Morvedre Core",
  description: "Pichichi, MVP, asistencia y racha del club.",
};

const STREAK_TYPES = ["goals_consec", "excl_consec", "train_consec", "mvp_consec"] as const;

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

function parseMetric(metricStr: string | undefined): RankingMetric {
  if (
    metricStr === "exclusions" ||
    metricStr === "mvp" ||
    metricStr === "attendance" ||
    metricStr === "streak"
  ) {
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
    streak_type?: string;
    streak_order?: string;
  }>;
}) {
  const ctx = await getActiveProfileContext();
  if (!ctx) redirect("/login");
  const { activeProfile, ownProfile } = ctx;

  const sp = await searchParams;
  const scope = parseScope(sp.scope);
  const metric = parseMetric(sp.metric);
  const page = parsePage(sp.page);

  const streakType = (STREAK_TYPES as readonly string[]).includes(sp.streak_type ?? "")
    ? (sp.streak_type as (typeof STREAK_TYPES)[number])
    : "train_consec";
  const streakOrder = sp.streak_order === "best" ? "best" : "current";

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

  const isAdmin = ownProfile
    ? await createClient()
        .then((supabase) =>
          supabase
            .from("user_roles")
            .select("role")
            .eq("profile_id", ownProfile.id)
            .eq("role", "admin")
            .is("scope_team_id", null)
            .maybeSingle(),
        )
        .then((r) => !!r.data)
        .catch(() => false)
    : false;

  const ranking = await getRankings({
    season_id: meta.season.id,
    scope,
    metric,
    my_player_id: activeProfile.id,
    min_trainings_total: metric === "attendance" || metric === "streak" ? 3 : 0,
    streak_type: streakType,
    streak_order: streakOrder,
  });

  const scopeLabel = scopeLabelOf(scope, meta);

  return (
    <PageShell width="md" className="gap-5 pb-8">
      <AppPageHero
        eyebrow={`${meta.season.label} · ${scopeLabel}`}
        title="Rankings"
        description="Goles, asistencia, MVP y rachas de la temporada."
        icon={<Trofeo className="h-7 w-7" accent="currentColor" />}
      />

      <RankingsContent
        meta={meta}
        ranking={ranking as RankingResult}
        activeScope={scope}
        activeMetric={metric}
        myPlayerId={activeProfile.id}
        page={page}
        activeStreakType={streakType}
        activeStreakOrder={streakOrder}
        isAdmin={isAdmin}
      />
    </PageShell>
  );
}
