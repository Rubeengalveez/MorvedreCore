import { Avatar } from "@/components/ui/avatar";
import { CapTile } from "@/components/ui/cap-tile";
import { Medal } from "@/components/ui/medal";
import { cn } from "@/lib/utils/cn";
import { CATEGORY_LABELS, type CategoryCode } from "@/lib/domain/categories";
import type { RankingRow } from "@/lib/domain/rankings";

export interface TopThreeCardsProps {
  items: RankingRow[];
  metricLabel: string;
  metricSuffix: string;
  myPlayerId: string;
}

export function TopThreeCards({
  items,
  metricLabel,
  metricSuffix,
  myPlayerId,
}: TopThreeCardsProps) {
  if (items.length === 0) return null;
  const first = items.find((i) => i.position === 1) ?? null;
  const second = items.find((i) => i.position === 2) ?? null;
  const third = items.find((i) => i.position === 3) ?? null;

  return (
    <section aria-labelledby="top3-heading" className="flex flex-col gap-2.5">
      <h2 id="top3-heading" className="sr-only">
        Top 3
      </h2>
      {first ? (
        <TopOneHighlight
          row={first}
          metricLabel={metricLabel}
          metricSuffix={metricSuffix}
          isMe={first.player_id === myPlayerId}
        />
      ) : null}
      {(second || third) ? (
        <div className="grid grid-cols-2 gap-2.5">
          {second ? (
            <RunnerCard
              row={second}
              rank={2}
              metricLabel={metricLabel}
              metricSuffix={metricSuffix}
              isMe={second.player_id === myPlayerId}
            />
          ) : (
            <div aria-hidden="true" />
          )}
          {third ? (
            <RunnerCard
              row={third}
              rank={3}
              metricLabel={metricLabel}
              metricSuffix={metricSuffix}
              isMe={third.player_id === myPlayerId}
            />
          ) : (
            <div aria-hidden="true" />
          )}
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

function TopOneHighlight({
  row,
  metricLabel,
  metricSuffix,
  isMe,
}: {
  row: RankingRow;
  metricLabel: string;
  metricSuffix: string;
  isMe: boolean;
}) {
  const teamColor = row.team_color ?? "var(--pool-blue)";
  const displayValue = `${row.primary_value}${metricSuffix}`;
  return (
    <article
      data-top-one
      className={cn(
        "relative overflow-hidden rounded-md border-2 shadow-elev-2",
        isMe ? "border-ball-gold" : "border-pool-deep",
      )}
      style={{
        background: `linear-gradient(135deg, color-mix(in oklab, ${teamColor} 18%, var(--paper-card)) 0%, var(--paper-card) 100%)`,
      }}
    >
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-1.5"
        style={{ backgroundColor: teamColor }}
      />
      <div className="flex items-center gap-3 p-4">
        <div className="flex shrink-0 flex-col items-center gap-1">
          <Medal rank={1} size="md" />
          {isMe ? (
            <span
              data-top-one-self
              className="inline-flex h-5 items-center rounded-sm bg-ball-gold px-1.5 text-[9px] font-extrabold uppercase tracking-wider text-pool-deep"
            >
              Tú
            </span>
          ) : null}
        </div>
        <Avatar
          src={row.photo_url}
          name={row.full_name}
          size={64}
          className="shrink-0"
        />
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-ink-600">
            Líder de {metricLabel.toLowerCase()}
          </p>
          <h3
            className="break-words font-display text-lg font-extrabold leading-tight text-pool-deep"
            title={row.full_name}
          >
            {row.full_name}
          </h3>
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-semibold text-ink-700">
              {categoryLabel(row)}
            </span>
            {row.cap_number != null ? (
              <>
                <span className="text-ink-300">·</span>
                <CapTile
                  number={row.cap_number}
                  teamColor={teamColor}
                  size="sm"
                  aria-label={`Dorsal ${row.cap_number}`}
                />
              </>
            ) : null}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p
            className="font-mono text-5xl font-extrabold leading-none tabular-nums text-pool-deep"
            aria-label={`${row.primary_value} ${metricLabel.toLowerCase()}`}
          >
            {displayValue}
          </p>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-ink-600">
            {metricLabel}
          </p>
        </div>
      </div>
    </article>
  );
}

function RunnerCard({
  row,
  rank,
  metricLabel,
  metricSuffix,
  isMe,
}: {
  row: RankingRow;
  rank: 2 | 3;
  metricLabel: string;
  metricSuffix: string;
  isMe: boolean;
}) {
  void row.team_color;
  return (
    <article
      data-runner-card={rank}
      className={cn(
        "flex items-center gap-2.5 overflow-hidden rounded-md border border-ink-300 bg-paper-card p-2.5 shadow-elev-1",
        isMe && "ring-2 ring-ball-gold/40",
      )}
    >
      <Avatar
        src={row.photo_url}
        name={row.full_name}
        size={40}
        className="shrink-0"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <Medal rank={rank} size="sm" />
          {isMe ? (
            <span className="inline-flex h-4 items-center rounded-sm bg-ball-gold px-1 text-[9px] font-extrabold uppercase tracking-wider text-pool-deep">
              Tú
            </span>
          ) : null}
        </div>
        <p
          className="break-words font-display text-sm font-extrabold leading-tight text-pool-deep"
          title={row.full_name}
        >
          {row.full_name}
        </p>
        <p className="truncate text-[10px] text-ink-600">
          {categoryLabel(row)}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className="font-mono text-xl font-extrabold tabular-nums text-pool-deep">
          {row.primary_value}
          {metricSuffix}
        </p>
        <p className="text-[9px] font-bold uppercase tracking-wider text-ink-600">
          {metricLabel}
        </p>
      </div>
    </article>
  );
}
