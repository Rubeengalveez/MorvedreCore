"use client";

import type { Route } from "next";
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
  basePath?: "/rankings" | "/streaks";
}

function scopeToParam(scope: RankingScope): string {
  if (scope.kind === "all") return "all";
  if (scope.kind === "category") return `category:${scope.category_code}`;
  return `team:${scope.team_id}`;
}

export function ScopeTabs({
  meta,
  active,
  extraParams = {},
  basePath = "/rankings",
}: ScopeTabsProps) {
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
      router.push(`${basePath}?${params.toString()}` as Route);
    });
  }

  return (
    <div
      data-scope-tabs
      aria-busy={isPending}
      className={cn(
        "border-ink-300 bg-paper-card shadow-elev-1 grid grid-cols-[auto_1fr] items-center gap-2 rounded-md border p-1.5",
        isPending && "opacity-70",
      )}
    >
      <button
        type="button"
        disabled={isPending}
        onClick={() => navigate({ kind: "all" })}
        aria-pressed={active.kind === "all"}
        className={cn(
          "focus-visible:ring-pool-blue inline-flex h-12 min-w-12 touch-manipulation items-center justify-center rounded-md px-4 text-sm font-extrabold transition-[background-color,color,transform] focus-visible:ring-2 focus-visible:outline-none active:scale-[0.97] motion-reduce:transition-none",
          active.kind === "all"
            ? "bg-pool-deep text-paper shadow-elev-1"
            : "bg-paper text-pool-deep",
        )}
      >
        Club
      </button>

      <label className="relative block min-w-0">
        <span className="sr-only">Filtrar por categoría</span>
        <select
          value={activeCategory}
          disabled={isPending}
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
            "focus-visible:ring-pool-blue h-12 w-full appearance-none truncate rounded-md border px-3 pr-9 text-sm font-extrabold focus-visible:ring-2 focus-visible:outline-none",
            active.kind === "category"
              ? "border-pool-blue bg-pool-foam text-pool-deep"
              : "border-ink-200 bg-paper text-ink-700",
          )}
        >
          <option value="">Categoría</option>
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
