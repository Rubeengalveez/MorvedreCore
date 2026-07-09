import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { Trofeo } from "@/components/brand/pictograms";
import { LanePattern } from "@/components/ui/lane-pattern";
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
      <PageShell>
        <LanePattern className="border-ink-300 bg-paper rounded-md border p-6">
          <div className="flex flex-col items-center gap-3 text-center">
            <Trofeo className="h-12 w-12" accent="var(--ball-gold)" />
            <h1 className="font-display text-pool-deep text-2xl font-extrabold">Rankings</h1>
            <p className="text-ink-600 text-sm">
              Todavia no hay una temporada activa. Crea una desde el panel admin para empezar a
              registrar estadisticas.
            </p>
          </div>
        </LanePattern>
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
    <PageShell className="gap-3">
      <header data-rankings-header className="flex items-center justify-between gap-3 px-1">
        <div className="min-w-0">
          <p className="text-pool-blue text-xs font-extrabold tracking-[0.08em] uppercase">
            {meta.season.label} / {scopeLabel}
          </p>
          <h1 className="font-display text-pool-deep text-[1.65rem] leading-none font-extrabold">
            Rankings
          </h1>
        </div>
        <div className="border-ink-300 bg-paper-card shadow-elev-1 flex shrink-0 items-center gap-2 rounded-md border px-2.5 py-2">
          <Trofeo className="h-5 w-5" accent="var(--ball-gold)" />
          <span className="text-pool-deep font-mono text-sm font-extrabold">
            {ranking.rows.length}
          </span>
        </div>
      </header>

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
