import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { Balon, Trofeo } from "@/components/brand/pictograms";
import { Eyebrow } from "@/components/ui/eyebrow";
import { LanePattern } from "@/components/ui/lane-pattern";
import { getActiveProfileContext } from "@/server/queries/active-profile";
import {
  getOpponentHistory,
  getRankings,
  getRankingsMeta,
  type RankingsPageMeta,
  type RankingResult,
} from "@/server/queries/rankings";
import { CATEGORY_LABELS, type CategoryCode } from "@/lib/domain/categories";
import { type RankingMetric, type RankingScope } from "@/lib/domain/rankings";

import { RankingsContent } from "./_components/rankings-content";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Rankings — Morvedre Core",
  description: "Pichichi, MVP, asistencia y racha del club.",
};

const METRICS: ReadonlyArray<{ id: RankingMetric; label: string; suffix: string }> = [
  { id: "goals", label: "Goles", suffix: "" },
  { id: "exclusions", label: "Exclusiones", suffix: "" },
  { id: "mvp", label: "MVP", suffix: "" },
  { id: "attendance", label: "Asistencia", suffix: "%" },
  { id: "streak", label: "Racha", suffix: "" },
];

function parseScope(scopeStr: string | undefined): RankingScope {
  if (!scopeStr || scopeStr === "all") return { kind: "all" };
  if (scopeStr.startsWith("category:")) {
    return { kind: "category", category_code: scopeStr.slice("category:".length) as CategoryCode };
  }
  if (scopeStr.startsWith("team:")) {
    return { kind: "team", team_id: scopeStr.slice("team:".length) };
  }
  return { kind: "all" };
}

function parseMetric(metricStr: string | undefined): RankingMetric {
  if (metricStr === "exclusions" || metricStr === "mvp" || metricStr === "attendance" || metricStr === "streak") {
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

function scopeToParam(scope: RankingScope): string {
  if (scope.kind === "all") return "all";
  if (scope.kind === "category") return `category:${scope.category_code}`;
  return `team:${scope.team_id}`;
}

export default async function RankingsPage({
  searchParams,
}: {
  searchParams: Promise<{ scope?: string; metric?: string; page?: string; streak_type?: string; streak_order?: string }>;
}) {
  const ctx = await getActiveProfileContext();
  if (!ctx) redirect("/login");
  const { activeProfile } = ctx;

  const sp = await searchParams;
  const scope = parseScope(sp.scope);
  const metric = parseMetric(sp.metric);
  const page = parsePage(sp.page);

  const streakType = (sp.streak_type === "goals_consec" || sp.streak_type === "excl_consec" || sp.streak_type === "mvp_consec")
    ? sp.streak_type
    : "train_consec";
  const streakOrder = sp.streak_order === "best" ? "best" : "current";

  const meta = await getRankingsMeta();
  if (!meta.season.id) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-6">
        <LanePattern className="rounded-md border border-ink-300 bg-paper p-6">
          <div className="flex flex-col items-center gap-3 text-center">
            <Balon className="h-12 w-12" accent="var(--ball-gold)" />
            <h1 className="font-display text-2xl font-extrabold text-pool-deep">
              Rankings
            </h1>
            <p className="text-sm text-ink-600">
              Todavía no hay una temporada activa. Crea una desde el panel admin
              para empezar a registrar estadísticas.
            </p>
          </div>
        </LanePattern>
      </div>
    );
  }

  const [ranking, opponents] = await Promise.all([
    getRankings({
      season_id: meta.season.id,
      scope,
      metric,
      my_player_id: activeProfile.id,
      min_trainings_total: metric === "attendance" || metric === "streak" ? 3 : 0,
      streak_type: streakType,
      streak_order: streakOrder,
    }),
    getOpponentHistory({ season_id: meta.season.id, limit: 5 }),
  ]);

  const metricMeta = METRICS.find((m) => m.id === metric) ?? METRICS[0]!;
  const scopeLabel = scopeLabelOf(scope, meta);
  const baseParams = new URLSearchParams();
  baseParams.set("scope", scopeToParam(scope));
  if (metric !== "goals") baseParams.set("metric", metric);
  if (metric === "streak") {
    baseParams.set("streak_type", streakType);
    baseParams.set("streak_order", streakOrder);
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-3 px-4 py-4">
      <header className="flex items-center justify-between gap-2 pt-1">
        <div className="min-w-0">
          <Eyebrow className="text-ink-600">Temporada {meta.season.label}</Eyebrow>
          <h1 className="mt-0.5 font-display text-2xl font-extrabold leading-tight tracking-tight text-pool-deep truncate">
            Rankings
            <span className="ml-2 align-baseline text-sm font-semibold text-ink-600">
              {scopeLabel} · {metricMeta.label}
            </span>
          </h1>
        </div>
        <Trofeo className="h-7 w-7 shrink-0" accent="var(--ball-gold)" />
      </header>

      <RankingsContent
        meta={meta}
        ranking={ranking as RankingResult}
        opponents={opponents}
        activeScope={scope}
        activeMetric={metric}
        myPlayerId={activeProfile.id}
        page={page}
        baseParams={baseParams.toString()}
        activeStreakType={streakType}
        activeStreakOrder={streakOrder}
      />
    </div>
  );
}
