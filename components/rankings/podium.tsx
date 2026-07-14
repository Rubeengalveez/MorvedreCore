import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils/cn";
import { CATEGORY_LABELS, type CategoryCode } from "@/lib/domain/categories";
import { type RankingMetric, type RankingRow } from "@/lib/domain/rankings";
import { metricContext } from "./ranking-row";

export interface PodiumProps {
  items: RankingRow[];
  metricLabel: string;
  metricSuffix: string;
  metric: RankingMetric;
  myPlayerId: string;
}

export function Podium({ items, metricLabel, metricSuffix, metric, myPlayerId }: PodiumProps) {
  const first = items.find((i) => i.position === 1) ?? null;
  const rest = items.filter((i) => i.position === 2 || i.position === 3);

  if (!first && rest.length === 0) return null;

  return (
    <section aria-labelledby="podium-heading" className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <h2 id="podium-heading" className="text-pool-deep text-base font-extrabold">
          Podio de {metricLabel.toLowerCase()}
        </h2>
        <span className="bg-paper-sunk text-ink-600 rounded-sm px-2 py-1 text-xs font-extrabold tracking-[0.08em] uppercase">
          Top 3
        </span>
      </div>

      {first ? (
        <PodiumLeader
          row={first}
          metricLabel={metricLabel}
          metricSuffix={metricSuffix}
          metric={metric}
          isMe={first.player_id === myPlayerId}
        />
      ) : null}

      {rest.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          {rest.map((row) => (
            <PodiumRunner
              key={row.player_id}
              row={row}
              metricLabel={metricLabel}
              metricSuffix={metricSuffix}
              metric={metric}
              isMe={row.player_id === myPlayerId}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}

function categoryLabel(row: RankingRow): string {
  if (row.team_label) return row.team_label;
  const code = row.category_code as CategoryCode;
  return CATEGORY_LABELS[code] ?? code;
}

function PodiumLeader({
  row,
  metricLabel,
  metricSuffix,
  metric,
  isMe,
}: {
  row: RankingRow;
  metricLabel: string;
  metricSuffix: string;
  metric: RankingMetric;
  isMe: boolean;
}) {
  const teamColor = row.team_color ?? "var(--pool-blue)";

  return (
    <article
      data-podium-first
      className={cn(
        "bg-pool-deep text-paper shadow-elev-3 relative overflow-hidden rounded-md p-3.5",
        isMe && "ring-ball-gold ring-2",
      )}
    >
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-1"
        style={{ backgroundColor: teamColor }}
      />
      <div className="flex items-start gap-3">
        <div className="relative shrink-0">
          <Avatar
            src={row.photo_url}
            name={row.full_name}
            size={56}
            style={{ boxShadow: `0 0 0 2px ${teamColor}` }}
          />
          <span className="bg-ball-gold text-pool-deep shadow-elev-2 absolute -top-1 -right-1 flex h-7 w-7 items-center justify-center rounded-sm font-mono text-sm font-extrabold">
            1
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-ball-gold text-xs font-extrabold tracking-[0.08em] uppercase">Lider</p>
          <h3 className="font-display text-paper mt-1 text-xl leading-tight font-extrabold text-balance">
            {row.full_name}
            {isMe ? (
              <span className="text-ball-gold ml-1 align-middle text-xs font-extrabold uppercase">
                Tu
              </span>
            ) : null}
          </h3>
          <p className="text-paper/70 mt-1 text-sm font-semibold">{categoryLabel(row)}</p>
          <p className="text-paper/55 mt-1 text-xs">{metricContext(row, metric)}</p>
        </div>

        <div className="shrink-0 text-right">
          <p
            className="text-paper font-mono text-[2.45rem] leading-none font-extrabold tabular-nums"
            aria-label={`${row.primary_value} ${metricLabel.toLowerCase()}`}
          >
            {row.primary_value}
            <span className="text-2xl">{metricSuffix}</span>
          </p>
          <p className="text-paper/55 mt-1 text-xs font-extrabold tracking-[0.08em] uppercase">
            {metricLabel}
          </p>
        </div>
      </div>
    </article>
  );
}

function PodiumRunner({
  row,
  metricLabel,
  metricSuffix,
  metric,
  isMe,
}: {
  row: RankingRow;
  metricLabel: string;
  metricSuffix: string;
  metric: RankingMetric;
  isMe: boolean;
}) {
  const teamColor = row.team_color ?? "var(--pool-blue)";

  return (
    <article
      data-podium-step={row.position}
      className={cn(
        "border-ink-300 bg-paper-card shadow-elev-1 flex min-h-[66px] items-center gap-3 rounded-md border px-3 py-2.5",
        isMe && "border-ball-gold/70 bg-ball-gold/10 ring-ball-gold/35 ring-2",
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
        <p className="text-pool-deep line-clamp-2 text-base leading-tight font-extrabold">
          {row.full_name}
          {isMe ? (
            <span className="text-action ml-1 text-xs font-extrabold uppercase">Tu</span>
          ) : null}
        </p>
        <p className="text-ink-600 mt-1 line-clamp-1 text-sm font-semibold">{categoryLabel(row)}</p>
        <p className="text-ink-500 mt-1 text-xs">{metricContext(row, metric)}</p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-pool-deep font-mono text-2xl leading-none font-extrabold tabular-nums">
          {row.primary_value}
          <span className="text-base">{metricSuffix}</span>
        </p>
        <p className="text-ink-500 mt-1 text-xs font-extrabold tracking-[0.08em] uppercase">
          {metricLabel}
        </p>
      </div>
    </article>
  );
}
