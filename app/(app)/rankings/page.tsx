import type { Metadata } from "next";
import Link from "next/link";
import type { Route } from "next";
import { redirect } from "next/navigation";
import { ArrowRight, Flame } from "lucide-react";

import { Trofeo } from "@/components/brand/pictograms";
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
  const streakScope =
    scope.kind === "all"
      ? "all"
      : scope.kind === "category"
        ? `category:${scope.category_code}`
        : `team:${scope.team_id}`;
  const streakHref = `/rankings?scope=${encodeURIComponent(streakScope)}&metric=streak` as Route;

  return (
    <PageShell width="md" className="gap-5 pb-8">
      <header className="border-ink-300 border-b pb-4">
        <div>
          <p className="text-pool-blue text-xs font-extrabold tracking-[0.12em] uppercase">
            {meta.season.label} · {scopeLabel}
          </p>
          <h1 className="font-display text-pool-deep mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">
            Rankings
          </h1>
          <p className="text-ink-600 mt-1 text-sm">Rendimiento y constancia de la temporada.</p>
        </div>
      </header>

      <div className="grid grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] gap-2.5">
        <Link
          href={streakHref}
          aria-current={metric === "streak" ? "page" : undefined}
          className="border-ball-gold/70 bg-ball-gold/10 text-pool-deep hover:border-ball-gold focus-visible:ring-ball-gold group flex min-h-20 items-center gap-3 rounded-2xl border p-3 transition-[border-color,background-color,transform] focus-visible:ring-2 focus-visible:outline-none active:scale-[0.99] motion-reduce:transition-none"
        >
          <span className="bg-ball-gold/25 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl">
            <Flame className="text-action h-6 w-6" aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-extrabold">Rachas</span>
            <span className="text-ink-600 block text-xs leading-snug">
              Quién está encadenando éxitos
            </span>
          </span>
          <ArrowRight
            className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
            aria-hidden="true"
          />
        </Link>
        <Link
          href="/legends"
          className="border-ink-200 bg-paper-card text-pool-deep hover:border-pool-blue/40 focus-visible:ring-pool-blue group flex min-h-20 items-center gap-2 rounded-2xl border p-3 transition-[border-color,transform] focus-visible:ring-2 focus-visible:outline-none active:scale-[0.99] motion-reduce:transition-none"
        >
          <span className="min-w-0 flex-1">
            <span className="block font-extrabold">Leyendas</span>
            <span className="text-ink-500 block text-xs leading-snug">Historia del club</span>
          </span>
          <ArrowRight
            className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
            aria-hidden="true"
          />
        </Link>
      </div>

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
