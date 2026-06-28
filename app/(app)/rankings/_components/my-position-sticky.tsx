import { CapTile } from "@/components/ui/cap-tile";
import { Medal } from "@/components/ui/medal";
import { cn } from "@/lib/utils/cn";
import type { MyPositionInfo } from "@/lib/domain/rankings";

export interface MyPositionStickyProps {
  position: MyPositionInfo;
  metricLabel: string;
  metricSuffix: string;
  totalPlayers: number;
  href: string;
  className?: string;
}

export function MyPositionSticky({
  position,
  metricLabel,
  metricSuffix,
  totalPlayers,
  href,
  className,
}: MyPositionStickyProps) {
  const { row, delta_to_next } = position;
  const teamColor = row.team_color ?? "var(--pool-blue)";
  const rank = row.medal ? (row.medal === "gold" ? 1 : row.medal === "silver" ? 2 : 3) : null;
  return (
    <a
      href={href}
      className={cn(
        "sticky top-[56px] z-10 -mx-4 flex items-center gap-3 border-b border-ink-300 bg-paper/95 px-4 py-2 backdrop-blur transition-colors hover:bg-pool-foam/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pool-blue focus-visible:ring-offset-2 focus-visible:ring-offset-paper",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-pool-deep font-mono text-sm font-extrabold text-paper"
      >
        {row.position}
      </span>
      {rank ? (
        <Medal rank={rank} size="sm" />
      ) : (
        <span
          aria-hidden="true"
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-paper-sunk font-mono text-xs font-extrabold text-ink-600"
        >
          {row.position}
        </span>
      )}
      <CapTile
        number={row.cap_number ?? 0}
        teamColor={teamColor}
        size="sm"
        isMe
        aria-label={`Tu dorsal ${row.cap_number ?? 0}`}
      />
      <div className="min-w-0 flex-1">
        <p className="line-clamp-1 text-sm font-bold text-pool-deep">
          {row.full_name}
        </p>
        <p className="text-[10px] font-bold uppercase tracking-eyebrow text-ink-600">
          {row.position}º de {totalPlayers} · {row.team_label ?? "Sin equipo"}
        </p>
      </div>
      <div className="text-right">
        <p className="font-mono text-lg font-extrabold tabular-nums text-pool-deep">
          {row.primary_value}
          {metricSuffix}
        </p>
        <p className="text-[10px] font-bold uppercase tracking-eyebrow text-ink-600">
          {metricLabel}
        </p>
      </div>
      {delta_to_next != null ? (
        <span
          aria-hidden="true"
          className="hidden rounded-sm bg-pool-foam px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-eyebrow text-pool-deep sm:inline-flex"
        >
          A {delta_to_next} del 1º
        </span>
      ) : (
        <span
          aria-hidden="true"
          className="hidden rounded-sm bg-success/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-eyebrow text-success sm:inline-flex"
        >
          Líder
        </span>
      )}
    </a>
  );
}
