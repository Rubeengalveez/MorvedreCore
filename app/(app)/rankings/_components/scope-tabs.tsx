"use client";

import { useRouter } from "next/navigation";
import { ChevronDown, Users } from "lucide-react";

import { cn } from "@/lib/utils/cn";
import { CATEGORY_LABELS, type CategoryCode } from "@/lib/domain/categories";
import { type RankingScope } from "@/lib/domain/rankings";
import type { RankingsPageMeta } from "@/server/queries/rankings";

export interface ScopeTabsProps {
  meta: RankingsPageMeta;
  active: RankingScope;
  onChange: (scope: RankingScope) => void;
}

export function ScopeTabs({ meta, active, onChange }: ScopeTabsProps) {
  const router = useRouter();
  const activeKey = scopeKey(active);
  const currentLabel = labelFor(active, meta);

  function handleChange(value: string) {
    onChange(parseValue(value, meta));
  }

  return (
    <div
      data-scope-tabs
      className="sticky top-[60px] z-10 -mx-4 flex items-center gap-2 border-b border-ink-200 bg-paper/95 px-4 py-2 backdrop-blur supports-[backdrop-filter]:bg-paper/80"
    >
      <span className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-ink-300 bg-paper-card px-3 text-xs font-bold uppercase tracking-wider text-ink-700">
        <Users className="h-3.5 w-3.5" aria-hidden="true" />
        Club
      </span>
      <div className="relative min-w-0 flex-1">
        <select
          aria-label="Filtrar por categoría o equipo"
          data-scope-select
          value={activeKey}
          onChange={(e) => handleChange(e.target.value)}
          className={cn(
            "h-9 w-full appearance-none truncate rounded-full border border-ink-300 bg-paper pl-3 pr-8 text-xs font-bold text-pool-deep shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pool-blue",
          )}
        >
          <option value="all">Todo el club</option>
          <optgroup label="Por categoría">
            {meta.categories.map((c) => (
              <option key={c.code} value={`category:${c.code}`}>
                {c.label}
              </option>
            ))}
          </optgroup>
          <optgroup label="Por equipo">
            {meta.teams.map((t) => (
              <option key={t.id} value={`team:${t.id}`}>
                {t.label}
              </option>
            ))}
          </optgroup>
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-600"
          aria-hidden="true"
        />
      </div>
      <button
        type="button"
        onClick={() => router.refresh()}
        className="hidden shrink-0 rounded-full border border-ink-300 bg-paper-card px-2.5 text-[10px] font-bold uppercase tracking-wider text-ink-600 hover:bg-pool-foam sm:inline-flex h-9 items-center"
      >
        Recargar
      </button>
    </div>
  );
}

function scopeKey(scope: RankingScope): string {
  if (scope.kind === "all") return "all";
  if (scope.kind === "category") return `category:${scope.category_code}`;
  return `team:${scope.team_id}`;
}

function parseValue(value: string, meta: RankingsPageMeta): RankingScope {
  if (value === "all") return { kind: "all" };
  if (value.startsWith("category:")) {
    return { kind: "category", category_code: value.slice("category:".length) as CategoryCode };
  }
  if (value.startsWith("team:")) {
    return { kind: "team", team_id: value.slice("team:".length) };
  }
  return { kind: "all" };
}

function labelFor(scope: RankingScope, meta: RankingsPageMeta): string {
  if (scope.kind === "all") return "Todo el club";
  if (scope.kind === "category") {
    return CATEGORY_LABELS[scope.category_code] ?? scope.category_code;
  }
  const team = meta.teams.find((t) => t.id === scope.team_id);
  return team?.label ?? "Equipo";
}
