import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Flame } from "lucide-react";

import { RankingsSectionNav } from "@/components/rankings/rankings-section-nav";
import { StreaksContent, type PersonalStreak } from "@/components/rankings/streaks-content";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader, PageShell } from "@/components/ui/page-shell";
import { CATEGORY_COLORS, safeInferCategory, type CategoryCode } from "@/lib/domain/categories";
import { type RankingScope } from "@/lib/domain/rankings";
import {
  isMotivationalStreakType,
  type MotivationalStreakType,
  type StreakOrder,
} from "@/lib/domain/streak-presentation";
import { getActiveProfileContext } from "@/server/queries/active-profile";
import { getRankings, getRankingsMeta } from "@/server/queries/rankings";
import { getStreaksForPlayers } from "@/server/queries/streaks";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Rachas - Morvedre Core",
  description: "Constancia, retos y mejores marcas de los jugadores del club.",
};

function parseScope(value?: string): RankingScope {
  if (!value || value === "all") return { kind: "all" };
  if (value.startsWith("category:")) {
    return {
      kind: "category",
      category_code: value.slice("category:".length) as CategoryCode,
    };
  }
  if (value.startsWith("team:")) {
    return { kind: "team", team_id: value.slice("team:".length) };
  }
  return { kind: "all" };
}

function parseType(value?: string): MotivationalStreakType {
  return isMotivationalStreakType(value) ? value : "train_consec";
}

function parseOrder(value?: string): StreakOrder {
  return value === "best" ? "best" : "current";
}

function parsePage(value?: string): number {
  const page = Number.parseInt(value ?? "1", 10);
  return Number.isFinite(page) && page > 0 ? page : 1;
}

export default async function StreaksPage({
  searchParams,
}: {
  searchParams: Promise<{
    scope?: string;
    type?: string;
    order?: string;
    page?: string;
  }>;
}) {
  const [ctx, params, meta] = await Promise.all([
    getActiveProfileContext(),
    searchParams,
    getRankingsMeta(),
  ]);
  if (!ctx) redirect("/login");

  if (!meta.season.id) {
    return (
      <PageShell width="md">
        <EmptyState
          icon={<Flame className="h-7 w-7" aria-hidden="true" />}
          title="Las rachas todavía no han empezado"
          description="Aparecerán cuando se registren entrenamientos y partidos de la temporada."
        />
      </PageShell>
    );
  }

  const scope = parseScope(params.scope);
  const type = parseType(params.type);
  const order = parseOrder(params.order);
  const page = parsePage(params.page);
  const trackedProfiles = [
    ctx.ownProfile,
    ...ctx.linkedProfiles.filter((profile) => profile.id !== ctx.ownProfile.id),
  ];
  const trackedPlayerIds = trackedProfiles.map((profile) => profile.id);

  const [ranking, personalRecords] = await Promise.all([
    getRankings({
      season_id: meta.season.id,
      scope,
      metric: "streak",
      my_player_id: ctx.ownProfile.id,
      min_trainings_total: 0,
      streak_type: type,
      streak_order: order,
    }),
    getStreaksForPlayers(meta.season.id, trackedPlayerIds),
  ]);

  const profileById = new Map(trackedProfiles.map((profile) => [profile.id, profile]));
  const personalStreaks: PersonalStreak[] = personalRecords
    .filter((record) => record.type === type)
    .map((record) => {
      const profile = profileById.get(record.subject_id);
      if (!profile) return null;
      const category =
        profile.birth_year == null
          ? null
          : safeInferCategory(profile.birth_year, new Date().getFullYear());
      return {
        playerId: profile.id,
        name: profile.full_name,
        photoUrl: profile.photo_url,
        teamColor: category ? CATEGORY_COLORS[category] : profile.team_color,
        currentValue: record.current_value,
        bestValue: record.best_value,
      };
    })
    .filter((record): record is PersonalStreak => record != null);

  return (
    <PageShell width="md" className="gap-4 pb-8">
      <PageHeader
        eyebrow={meta.season.label}
        title="Rachas"
        description="Convierte la constancia en un reto y supera tu propia marca."
        icon={<Flame className="h-5 w-5" aria-hidden="true" />}
        teamColor="var(--ball-gold)"
      />

      <RankingsSectionNav active="streaks" />

      <StreaksContent
        meta={meta}
        ranking={ranking}
        activeScope={scope}
        activeType={type}
        activeOrder={order}
        ownProfileId={ctx.ownProfile.id}
        trackedPlayerIds={trackedPlayerIds}
        personalStreaks={personalStreaks}
        page={page}
      />
    </PageShell>
  );
}
