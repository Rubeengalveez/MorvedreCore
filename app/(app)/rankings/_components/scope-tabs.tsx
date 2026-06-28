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
    <div
      role="tablist"
      aria-label="Filtrar por categoría o equipo"
      className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1"
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
        "inline-flex h-11 min-h-11 shrink-0 items-center rounded-full border px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2 focus-visible:ring-offset-paper",
        isActive
          ? "border-pool-deep bg-pool-deep text-paper"
          : "border-ink-300 bg-paper text-pool-deep hover:bg-pool-foam",
      )}
    >
      {label}
    </button>
  );
}
