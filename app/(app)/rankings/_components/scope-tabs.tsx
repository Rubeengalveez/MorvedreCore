"use client";

import { cn } from "@/lib/utils/cn";
import { type CategoryCode } from "@/lib/domain/categories";
import { type RankingScope } from "@/lib/domain/rankings";
import type { RankingsPageMeta } from "@/server/queries/rankings";

export interface ScopeTabsProps {
  meta: RankingsPageMeta;
  active: RankingScope;
  onChange: (scope: RankingScope) => void;
}

export function ScopeTabs({ meta, active, onChange }: ScopeTabsProps) {
  return (
    <div className="relative">
      <div
        role="tablist"
        aria-label="Filtrar por categoría o equipo"
        data-scope-tabs
        className="sticky top-[60px] z-10 -mx-4 flex gap-2 overflow-x-auto bg-paper/95 px-4 py-2 pr-8 backdrop-blur supports-[backdrop-filter]:bg-paper/80 border-b border-ink-200 [&::-webkit-scrollbar]:hidden"
        style={{ scrollbarWidth: "none" }}
      >
      <ScopePill
        label="Club"
        isActive={active.kind === "all"}
        onClick={() => onChange({ kind: "all" })}
      />
      {meta.categories.map((c) => (
        <ScopePill
          key={c.code}
          label={c.label}
          isActive={active.kind === "category" && active.category_code === c.code}
          onClick={() => onChange({ kind: "category", category_code: c.code as CategoryCode })}
        />
      ))}
      {meta.teams.length > 0 ? (
        <div className="ml-1 mr-1 self-stretch border-l border-ink-300" aria-hidden="true" />
      ) : null}
      {meta.teams.map((t) => (
        <ScopePill
          key={t.id}
          label={t.label}
          isActive={active.kind === "team" && active.team_id === t.id}
          onClick={() => onChange({ kind: "team", team_id: t.id })}
        />
      ))}
      <div className="shrink-0 pr-2" aria-hidden="true" />
    </div>
    <div
      aria-hidden="true"
      className="pointer-events-none absolute right-0 top-0 z-20 h-full w-8 bg-gradient-to-l from-paper to-transparent"
    />
    </div>
  );
}

function ScopePill({
  label,
  isActive,
  onClick,
}: {
  label: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      onClick={onClick}
      className={cn(
        "inline-flex h-9 min-h-9 shrink-0 items-center rounded-full px-3.5 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pool-blue",
        isActive
          ? "bg-pool-deep text-paper shadow-sm"
          : "border border-ink-300 bg-paper text-pool-deep hover:bg-pool-foam",
      )}
    >
      {label}
    </button>
  );
}
