import Link from "next/link";
import type { Route } from "next";
import { ChevronRight } from "lucide-react";

import { PositionChip } from "@/components/ui/position-chip";
import { rankingPageForPosition, type RankingRow } from "@/lib/domain/rankings";

export interface RankingPositionJumpProps {
  rows: RankingRow[];
  ownProfileId: string;
  pageSize: number;
  baseHref: string;
  metricLabel: string;
  metricSuffix: string;
}

function positionHref(baseHref: string, row: RankingRow, pageSize: number): Route {
  const page = rankingPageForPosition(row.position, pageSize);
  const pageParam = page > 1 ? `${baseHref.includes("?") ? "&" : "?"}page=${page}` : "";
  return `${baseHref}${pageParam}#ranking-player-${row.player_id}` as Route;
}

export function RankingPositionJump({
  rows,
  ownProfileId,
  pageSize,
  baseHref,
  metricLabel,
  metricSuffix,
}: RankingPositionJumpProps) {
  if (rows.length === 0) return null;

  return (
    <aside
      aria-label={rows.length === 1 ? "Tu posición en el ranking" : "Posiciones de tu familia"}
      className="border-ink-200 bg-paper-card shadow-elev-1 divide-ink-200 divide-y overflow-hidden rounded-xl border"
      data-ranking-position-jump
    >
      {rows.map((row) => {
        const isOwn = row.player_id === ownProfileId;
        const label = isOwn ? (rows.length === 1 ? "Tu posición" : "Tú") : row.full_name;

        return (
          <Link
            key={row.player_id}
            href={positionHref(baseHref, row, pageSize)}
            aria-label={`Ir al puesto ${row.position} de ${isOwn ? "tu ranking" : row.full_name}`}
            className="hover:bg-pool-foam/50 focus-visible:ring-pool-blue group flex min-h-16 touch-manipulation items-center gap-3 px-3 py-2 transition-colors focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset"
          >
            <PositionChip position={row.position} tone="me" size="md" />
            <span className="min-w-0 flex-1">
              <span className="text-pool-deep block truncate text-sm font-extrabold">{label}</span>
              <span className="text-ink-500 mt-0.5 block truncate text-xs font-semibold">
                {row.primary_value}
                {metricSuffix} {metricLabel}
              </span>
            </span>
            <span className="text-pool-blue hidden text-xs font-extrabold min-[380px]:inline">
              Ver puesto
            </span>
            <ChevronRight
              className="text-pool-blue h-4 w-4 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none"
              aria-hidden="true"
            />
          </Link>
        );
      })}
    </aside>
  );
}
