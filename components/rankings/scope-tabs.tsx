"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils/cn";
import { CATEGORY_LABELS, type CategoryCode } from "@/lib/domain/categories";
import { type RankingScope } from "@/lib/domain/rankings";
import type { RankingsPageMeta } from "@/server/queries/rankings";

export interface ScopeTabsProps {
  meta: RankingsPageMeta;
  active: RankingScope;
  extraParams?: Record<string, string>;
}

function scopeToParam(scope: RankingScope): string {
  if (scope.kind === "all") return "all";
  if (scope.kind === "category") return `category:${scope.category_code}`;
  return `team:${scope.team_id}`;
}

export function ScopeTabs({ meta, active, extraParams = {} }: ScopeTabsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const activeCategory = active.kind === "category" ? `category:${active.category_code}` : "";

  function navigate(scope: RankingScope) {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(extraParams)) {
      if (v) params.set(k, v);
    }
    params.set("scope", scopeToParam(scope));
    params.delete("page");
    startTransition(() => {
      router.push(`/rankings?${params.toString()}`);
    });
  }

  return (
    <div
      data-scope-tabs
      className={cn(
        "border-ink-300 bg-paper-card shadow-elev-1 grid grid-cols-[auto_1fr] items-center gap-2 rounded-md border p-1.5",
        isPending && "opacity-70",
      )}
    >
      <button
        type="button"
        onClick={() => navigate({ kind: "all" })}
        aria-pressed={active.kind === "all"}
        className={cn(
          "touch-target inline-flex h-11 items-center justify-center rounded-md px-4 text-sm font-extrabold",
          active.kind === "all"
            ? "bg-pool-deep text-paper shadow-elev-1"
            : "bg-paper text-pool-deep",
        )}
      >
        Club
      </button>

      <label className="relative block min-w-0">
        <span className="sr-only">Filtrar por categoria</span>
        <select
          value={activeCategory}
          onChange={(e) => {
            const value = e.target.value;
            if (!value) {
              navigate({ kind: "all" });
              return;
            }
            navigate({
              kind: "category",
              category_code: value.slice("category:".length) as CategoryCode,
            });
          }}
          className={cn(
            "touch-target h-11 w-full appearance-none truncate rounded-md border px-3 pr-9 text-sm font-extrabold outline-none",
            active.kind === "category"
              ? "border-pool-blue bg-pool-foam text-pool-deep"
              : "border-ink-200 bg-paper text-ink-700",
          )}
        >
          <option value="">Categoria</option>
          {meta.categories.map((c) => (
            <option key={c.code} value={`category:${c.code}`}>
              {CATEGORY_LABELS[c.code as CategoryCode] ?? c.label}
            </option>
          ))}
        </select>
        <ChevronDown className="text-ink-600 pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2" />
      </label>
    </div>
  );
}
