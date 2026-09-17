import Link from "next/link";
import type { Route } from "next";

import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils/cn";
import { CATEGORY_COLORS, CATEGORY_LABELS, type CategoryCode } from "@/lib/domain/categories";
import {
  formatSwimTime,
  type SwimDistance,
  type SwimRankingMode,
  type SwimRankingRow,
} from "@/lib/domain/swim-times";

export interface SwimPodiumProps {
  items: SwimRankingRow[];
  distance: SwimDistance;
  mode: SwimRankingMode;
  myPlayerId?: string;
  jumpTargetPlayerId?: string | null;
}

export function SwimPodium({
  items,
  distance,
  mode,
  myPlayerId,
  jumpTargetPlayerId = null,
}: SwimPodiumProps) {
  const first = items.find((i) => i.position === 1) ?? null;
  const rest = items.filter((i) => i.position === 2 || i.position === 3);

  if (!first && rest.length === 0) return null;

  const modeLabel = mode === "latest" ? "Actual" : "Mejor";

  return (
    <section aria-labelledby="swim-podium-heading" className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <h2 id="swim-podium-heading" className="text-pool-deep text-base font-extrabold">
          Podio de nado
        </h2>
        <span className="bg-paper-sunk text-ink-600 rounded-sm px-2 py-1 text-xs font-extrabold tracking-[0.08em] uppercase">
          Top 3
        </span>
      </div>

      {first ? (
        <SwimPodiumLeader
          row={first}
          distance={distance}
          modeLabel={modeLabel}
          isMe={first.player_id === myPlayerId}
          isJumpTarget={first.player_id === jumpTargetPlayerId}
        />
      ) : null}

      {rest.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          {rest.map((row) => (
            <SwimPodiumRunner
              key={row.player_id}
              row={row}
              distance={distance}
              modeLabel={modeLabel}
              isMe={row.player_id === myPlayerId}
              isJumpTarget={row.player_id === jumpTargetPlayerId}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}

function categoryLabel(row: SwimRankingRow): string {
  if (!row.category_code) return "Sin categoría";
  const code = row.category_code as CategoryCode;
  return CATEGORY_LABELS[code] ?? code;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

function SwimPodiumLeader({
  row,
  distance,
  modeLabel,
  isMe,
  isJumpTarget,
}: {
  row: SwimRankingRow;
  distance: SwimDistance;
  modeLabel: string;
  isMe: boolean;
  isJumpTarget: boolean;
}) {
  const rawColor = row.category_code
    ? CATEGORY_COLORS[row.category_code]
    : (row.team_color ?? "var(--pool-blue)");
  const accentColor = rawColor === "#0F172A" ? "#38BDF8" : rawColor;

  return (
    <Link
      href={`/players/${row.player_id}/swim-times?from=rankings&distance=${distance}` as Route}
      id={`ranking-player-${row.player_id}`}
      data-podium-first
      className={cn(
        "group bg-pool-deep text-paper shadow-elev-3 relative block scroll-mt-[calc(var(--top-bar-height)+1rem)] overflow-hidden rounded-md p-3 transition-transform active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pool-blue",
        isMe && "ring-ball-gold ring-2",
        isJumpTarget && "ring-action ring-2 ring-offset-2",
      )}
    >
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-1"
        style={{ backgroundColor: accentColor }}
      />
      <div className="flex items-center gap-3">
        <div className="relative shrink-0">
          <Avatar
            src={row.photo_url}
            name={row.full_name}
            size={50}
            teamColor={accentColor}
            style={{ boxShadow: `0 0 0 2px ${accentColor}` }}
          />
          <span className="bg-ball-gold text-pool-deep shadow-elev-2 absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-sm font-mono text-xs font-extrabold">
            1
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-ball-gold text-[11px] font-extrabold tracking-[0.08em] uppercase">
            Líder
          </p>
          <h3 className="font-display text-paper text-base sm:text-lg leading-tight font-extrabold truncate group-hover:underline">
            {row.full_name}
            {isMe ? (
              <span className="text-ball-gold ml-1 align-middle text-xs font-extrabold uppercase">
                Tú
              </span>
            ) : null}
          </h3>
          <p className="text-paper/70 text-xs sm:text-sm font-semibold truncate mt-0.5">
            {categoryLabel(row)} · {formatDate(row.test_date)}
          </p>
        </div>

        <div className="shrink-0 text-right self-center">
          <p
            className="text-paper font-mono text-2xl sm:text-[1.75rem] leading-none font-extrabold tabular-nums"
            aria-label={`${formatSwimTime(row.time_cs)} en ${distance} metros`}
          >
            {formatSwimTime(row.time_cs)}
          </p>
          <p className="text-paper/75 mt-1 text-[10px] font-extrabold tracking-[0.08em] uppercase">
            {modeLabel}
          </p>
        </div>
      </div>
    </Link>
  );
}

function SwimPodiumRunner({
  row,
  distance,
  modeLabel,
  isMe,
  isJumpTarget,
}: {
  row: SwimRankingRow;
  distance: SwimDistance;
  modeLabel: string;
  isMe: boolean;
  isJumpTarget: boolean;
}) {
  const teamColor = row.category_code
    ? CATEGORY_COLORS[row.category_code]
    : (row.team_color ?? "var(--pool-blue)");

  return (
    <Link
      href={`/players/${row.player_id}/swim-times?from=rankings&distance=${distance}` as Route}
      id={`ranking-player-${row.player_id}`}
      data-podium-step={row.position}
      className={cn(
        "group border-ink-300 bg-paper-card shadow-elev-1 flex min-h-[66px] scroll-mt-[calc(var(--top-bar-height)+1rem)] items-center gap-3 rounded-md border px-3 py-2.5 transition-colors group-hover:border-pool-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pool-blue",
        isMe && "border-ball-gold/70 bg-ball-gold/10 ring-ball-gold/35 ring-2",
        isJumpTarget && "border-action bg-action/5 ring-action ring-2 ring-offset-2",
      )}
      style={{ borderLeftWidth: "4px", borderLeftColor: teamColor }}
    >
      <span
        aria-hidden="true"
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-sm font-mono text-base font-extrabold",
          row.position === 2 ? "bg-ink-200 text-ink-800" : "bg-ball-gold/30 text-pool-deep",
        )}
      >
        {row.position}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-pool-deep group-hover:text-pool-blue line-clamp-1 text-base leading-tight font-extrabold">
          {row.full_name}
          {isMe ? (
            <span className="text-action ml-1 text-xs font-extrabold uppercase">Tú</span>
          ) : null}
        </p>
        <p className="text-ink-600 mt-0.5 line-clamp-1 text-sm font-semibold">
          {categoryLabel(row)} · {formatDate(row.test_date)}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-pool-deep font-mono text-2xl leading-none font-extrabold tabular-nums">
          {formatSwimTime(row.time_cs)}
        </p>
        <p className="text-ink-500 mt-1 text-xs font-extrabold tracking-[0.08em] uppercase">
          {modeLabel}
        </p>
      </div>
    </Link>
  );
}

