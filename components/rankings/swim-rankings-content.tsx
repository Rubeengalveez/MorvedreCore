"use client";

import Link from "next/link";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { ChevronDown, Waves } from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import { PositionChip } from "@/components/ui/position-chip";
import { MetricTabs } from "@/components/rankings/metric-tabs";
import { Pagination } from "@/components/rankings/pagination";
import { ScopeTabs } from "@/components/rankings/scope-tabs";
import { CATEGORY_COLORS, CATEGORY_LABELS } from "@/lib/domain/categories";
import {
  formatSwimTime,
  type SwimDistance,
  type SwimRankingMode,
  type SwimRankingRow,
  type SwimStartType,
} from "@/lib/domain/swim-times";
import type { RankingScope } from "@/lib/domain/rankings";
import type { RankingsPageMeta } from "@/server/queries/rankings";

export function SwimRankingsContent({
  meta,
  rows,
  scope,
  distance,
  mode,
  startType,
  page,
}: {
  meta: RankingsPageMeta;
  rows: SwimRankingRow[];
  scope: RankingScope;
  distance: SwimDistance;
  mode: SwimRankingMode;
  startType: SwimStartType;
  page: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const activePage = Math.min(page, totalPages);
  const visible = rows.slice((activePage - 1) * pageSize, activePage * pageSize);
  const scopeParam =
    scope.kind === "all"
      ? "all"
      : scope.kind === "category"
        ? `category:${scope.category_code}`
        : `team:${scope.team_id}`;
  const params = { metric: "swim", distance: String(distance), mode, start: startType };

  function navigate(changes: Partial<Record<"distance" | "mode" | "start", string>>) {
    const next = new URLSearchParams({ scope: scopeParam, ...params, ...changes });
    startTransition(() => router.push(`/rankings?${next.toString()}`));
  }

  const baseParams = new URLSearchParams({ scope: scopeParam, ...params });
  const baseHref = `/rankings?${baseParams.toString()}`;

  return (
    <div className="flex flex-col gap-3" aria-busy={pending}>
      <MetricTabs active="swim" extraParams={{ scope: scopeParam }} />
      <ScopeTabs meta={meta} active={scope} extraParams={params} />

      <div className="border-ink-200 bg-paper-card grid grid-cols-2 gap-1 rounded-xl border p-1">
        {[50, 100].map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={distance === value}
            onClick={() => navigate({ distance: String(value) })}
            className={`min-h-12 rounded-lg px-3 text-sm font-extrabold ${distance === value ? "bg-pool-deep text-paper" : "text-pool-deep hover:bg-pool-foam"}`}
          >
            {value} metros
          </button>
        ))}
      </div>

      <div className="border-ink-200 bg-paper-card grid grid-cols-2 gap-1 rounded-xl border p-1">
        <ModeButton active={mode === "latest"} onClick={() => navigate({ mode: "latest" })}>
          Tiempo actual
        </ModeButton>
        <ModeButton active={mode === "best"} onClick={() => navigate({ mode: "best" })}>
          Mejor tiempo
        </ModeButton>
      </div>

      <SelectField
        label="Tipo de salida"
        value={startType}
        onChange={(value) => navigate({ start: value })}
        options={[
          { value: "water", label: "Desde el agua" },
          { value: "block", label: "Desde el poyete" },
        ]}
      />

      <p className="bg-pool-foam/60 text-pool-deep rounded-xl px-4 py-3 text-sm font-bold">
        {mode === "latest"
          ? "Se ordena la última medición de cada jugador esta temporada."
          : "Se ordena la mejor marca de cada jugador esta temporada."}
      </p>

      {rows.length === 0 ? (
        <div className="border-ink-200 bg-paper-card flex flex-col items-center gap-3 rounded-2xl border border-dashed p-7 text-center">
          <Waves className="text-pool-blue h-7 w-7" aria-hidden="true" />
          <p className="text-pool-deep font-extrabold">Todavía no hay tiempos con estos filtros</p>
          <p className="text-ink-600 text-sm">Prueba otra distancia o tipo de salida.</p>
        </div>
      ) : (
        <ol className="flex flex-col gap-2">
          {visible.map((row) => (
            <li key={row.player_id}>
              <Link
                href={
                  `/players/${row.player_id}/swim-times?from=rankings&distance=${distance}` as Route
                }
                className="border-ink-200 bg-paper-card hover:border-pool-blue focus-visible:ring-pool-blue flex min-h-[76px] items-center gap-3 rounded-xl border px-3 py-2.5 shadow-sm focus-visible:ring-2 focus-visible:outline-none"
                style={{
                  borderLeftWidth: 5,
                  borderLeftColor: row.category_code
                    ? CATEGORY_COLORS[row.category_code]
                    : (row.team_color ?? "var(--pool-blue)"),
                }}
              >
                <PositionChip
                  position={row.position}
                  tone={row.position <= 10 ? "top" : "default"}
                  size="md"
                />
                <Avatar src={row.photo_url} name={row.full_name} size={44} />
                <span className="min-w-0 flex-1">
                  <span className="text-pool-deep block truncate font-extrabold">
                    {row.full_name}
                  </span>
                  <span className="text-ink-600 mt-1 block text-xs font-semibold">
                    {row.category_code ? CATEGORY_LABELS[row.category_code] : "Sin categoría"} ·{" "}
                    {formatDate(row.test_date)}
                  </span>
                </span>
                <span className="text-pool-deep shrink-0 text-right font-mono text-xl font-extrabold tabular-nums">
                  {formatSwimTime(row.time_cs)}
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}

      {totalPages > 1 ? (
        <Pagination
          page={activePage}
          totalPages={totalPages}
          totalPlayers={rows.length}
          pageSize={pageSize}
          baseHref={baseHref}
        />
      ) : null}
    </div>
  );
}

function ModeButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`min-h-12 rounded-lg px-2 text-sm font-extrabold ${active ? "bg-pool-deep text-paper" : "text-pool-deep hover:bg-pool-foam"}`}
    >
      {children}
    </button>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="text-pool-deep relative flex flex-col gap-1.5 text-sm font-extrabold">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="border-ink-300 bg-paper-card h-12 appearance-none rounded-xl border px-3 pr-9 text-base"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown
        className="text-ink-500 pointer-events-none absolute right-3 bottom-4 h-4 w-4"
        aria-hidden="true"
      />
    </label>
  );
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}
