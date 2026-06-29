"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ChevronDown, Users, X } from "lucide-react";

import { cn } from "@/lib/utils/cn";
import { CATEGORY_LABELS, type CategoryCode } from "@/lib/domain/categories";
import { type RankingScope } from "@/lib/domain/rankings";
import type { RankingsPageMeta } from "@/server/queries/rankings";

export interface ScopeTabsProps {
  meta: RankingsPageMeta;
  active: RankingScope;
  baseParams: string;
}

function scopeToParam(scope: RankingScope): string {
  if (scope.kind === "all") return "all";
  if (scope.kind === "category") return `category:${scope.category_code}`;
  return `team:${scope.team_id}`;
}

export function ScopeTabs({ meta, active, baseParams }: ScopeTabsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  const currentLabel =
    active.kind === "all"
      ? "Todo el club"
      : active.kind === "category"
        ? CATEGORY_LABELS[active.category_code] ?? active.category_code
        : meta.teams.find((t) => t.id === active.team_id)?.label ?? "Equipo";

  function navigate(scope: RankingScope) {
    setOpen(false);
    const params = new URLSearchParams(baseParams);
    params.set("scope", scopeToParam(scope));
    startTransition(() => {
      router.push(`/rankings?${params.toString()}`);
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        data-scope-trigger
        disabled={isPending}
        className={cn(
          "sticky top-[60px] z-30 -mx-4 flex w-full items-center gap-2 border-b border-ink-200 bg-paper/95 px-4 py-2 backdrop-blur supports-[backdrop-filter]:bg-paper/80",
          isPending && "opacity-70",
        )}
      >
        <span className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-ink-300 bg-paper-card px-3 text-xs font-bold uppercase tracking-wider text-ink-700">
          <Users className="h-3.5 w-3.5" aria-hidden="true" />
          Club
        </span>
        <span className="inline-flex h-9 min-w-0 flex-1 items-center justify-between gap-2 truncate rounded-full border border-ink-300 bg-paper px-3 text-xs font-bold text-pool-deep shadow-sm">
          <span className="truncate">{currentLabel}</span>
          <ChevronDown className="h-4 w-4 shrink-0 text-ink-600" aria-hidden="true" />
        </span>
        <span
          className="inline-flex h-9 shrink-0 items-center rounded-full border border-ink-300 bg-paper-card px-2.5 text-[10px] font-bold uppercase tracking-wider text-ink-600"
          aria-hidden="true"
        >
          Cambiar
        </span>
      </button>

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Cambiar filtro de rankings"
          data-scope-sheet
          className="fixed inset-0 z-50 flex flex-col justify-end"
        >
          <button
            type="button"
            aria-label="Cerrar"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-pool-deep/40 backdrop-blur-sm"
          />
          <div className="relative z-10 mx-auto flex w-full max-w-2xl flex-col rounded-t-2xl bg-paper shadow-2xl">
            <div className="flex items-center justify-between gap-2 border-b border-ink-300 px-4 py-3">
              <h2 className="font-display text-base font-extrabold text-pool-deep">
                Ver ranking por:
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Cerrar"
                className="flex h-9 w-9 items-center justify-center rounded text-ink-600 hover:bg-pool-foam"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <ul className="max-h-[70vh] overflow-y-auto p-2">
              <li>
                <ScopeOption
                  label="Todo el club"
                  count={meta.teams.reduce((acc, t) => acc + t.player_count, 0)}
                  isActive={active.kind === "all"}
                  onClick={() => navigate({ kind: "all" })}
                />
              </li>
              {meta.categories.length > 0 ? (
                <li className="mt-2 px-3 pt-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-ink-600">
                    Por categoría
                  </p>
                </li>
              ) : null}
              {meta.categories.map((c) => (
                <li key={c.code}>
                  <ScopeOption
                    label={c.label}
                    count={c.player_count}
                    isActive={
                      active.kind === "category" &&
                      active.category_code === c.code
                    }
                    onClick={() =>
                      navigate({
                        kind: "category",
                        category_code: c.code as CategoryCode,
                      })
                    }
                  />
                </li>
              ))}
              {meta.teams.length > 0 ? (
                <li className="mt-2 px-3 pt-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-ink-600">
                    Por equipo
                  </p>
                </li>
              ) : null}
              {meta.teams.map((t) => (
                <li key={t.id}>
                  <ScopeOption
                    label={t.label}
                    count={t.player_count}
                    isActive={active.kind === "team" && active.team_id === t.id}
                    onClick={() => navigate({ kind: "team", team_id: t.id })}
                  />
                </li>
              ))}
            </ul>
            <div className="border-t border-ink-300 px-4 py-3 pb-[max(env(safe-area-inset-bottom),0.75rem)]">
              <Link
                href="/rankings"
                className="inline-flex h-9 w-full items-center justify-center rounded border border-ink-300 bg-paper text-xs font-bold text-pool-deep hover:bg-pool-foam"
              >
                Restablecer filtros
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function ScopeOption({
  label,
  count,
  isActive,
  onClick,
}: {
  label: string;
  count: number;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-scope-option
      className={cn(
        "flex w-full items-center justify-between gap-2 rounded-md px-3 py-2.5 text-left text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pool-blue",
        isActive
          ? "bg-pool-deep text-paper"
          : "text-pool-deep hover:bg-pool-foam",
      )}
    >
      <span>{label}</span>
      <span
        className={cn(
          "rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums",
          isActive ? "bg-paper/20 text-paper" : "bg-ink-200 text-ink-700",
        )}
      >
        {count}
      </span>
    </button>
  );
}
