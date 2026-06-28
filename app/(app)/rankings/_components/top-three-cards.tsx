import Image from "next/image";
import { Trofeo } from "@/components/brand/pictograms";
import { CapTile } from "@/components/ui/cap-tile";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Medal } from "@/components/ui/medal";
import { cn } from "@/lib/utils/cn";
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
    <section
      aria-labelledby="top3-heading"
      className="flex flex-col gap-3"
    >
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
        <div className="grid grid-cols-2 gap-2">
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
      className="relative overflow-hidden rounded-md border-2 border-ball-gold shadow-lg shadow-ball-gold/15 transition-transform hover:-translate-y-0.5"
      style={{
        background: `radial-gradient(circle at top right, rgba(244, 196, 48, 0.2), transparent 75%), color-mix(in oklab, ${teamColor} 14%, var(--paper-card))`,
      }}
    >
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-1.5"
        style={{ backgroundColor: teamColor }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-y-0 left-0 w-1.5"
        style={{ backgroundColor: teamColor }}
      />
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-4 sm:p-5">
        <div className="flex items-center gap-3 sm:flex-col sm:items-center sm:gap-2">
          <CapTile
            number={row.cap_number ?? 0}
            teamColor={teamColor}
            size="lg"
            isMe={isMe}
            aria-label={`Dorsal ${row.cap_number ?? 0} del líder`}
          />
          {row.photo_url ? (
            <Image
              src={row.photo_url}
              alt={row.full_name}
              width={56}
              height={56}
              className="hidden h-14 w-14 rounded-full border-2 object-cover sm:block"
              style={{ borderColor: teamColor }}
            />
          ) : null}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <Medal rank={1} size="sm" />
            <Eyebrow className="text-ink-700">Líder de {metricLabel.toLowerCase()}</Eyebrow>
            {isMe ? (
              <span
                data-top-one-self
                className="inline-flex h-5 items-center rounded-sm bg-ball-gold px-1.5 text-[10px] font-extrabold uppercase tracking-eyebrow text-pool-deep"
              >
                Tú, el mejor
              </span>
            ) : null}
          </div>
          <h3 className="font-display text-2xl font-extrabold leading-tight text-pool-deep sm:text-3xl">
            {row.full_name}
          </h3>
          <p className="line-clamp-1 text-sm font-semibold text-ink-700">
            {row.team_label ?? "Sin equipo"}
          </p>
          <p
            className="font-mono text-5xl font-extrabold leading-none tabular-nums text-pool-deep sm:text-6xl"
            aria-label={`${row.primary_value} ${metricLabel.toLowerCase()}`}
          >
            {displayValue}
          </p>
          <p className="text-[10px] font-bold uppercase tracking-eyebrow text-ink-600">
            {metricLabel}{metricSuffix ? ` (${metricSuffix})` : ""} esta temporada
          </p>
        </div>
        <div
          aria-hidden="true"
          className="hidden h-20 w-20 shrink-0 items-center justify-center rounded-full sm:flex shadow-inner border-2 border-paper"
          style={{ backgroundColor: "var(--ball-gold)", color: "var(--pool-deep)" }}
        >
          <Trofeo className="h-10 w-10 animate-bounce" />
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
  const teamColor = row.team_color ?? "var(--pool-blue)";
  return (
    <article
      data-runner-card={rank}
      className={cn(
        "relative flex items-center gap-3 overflow-hidden rounded-md border border-ink-300 bg-paper-card p-3 shadow-elev-1",
        isMe && "ring-2 ring-ball-gold/40",
      )}
    >
      <Medal rank={rank} size="sm" />
      <CapTile
        number={row.cap_number ?? 0}
        teamColor={teamColor}
        size="md"
        isMe={isMe}
        aria-label={`Dorsal ${row.cap_number ?? 0}`}
      />
      <div className="min-w-0 flex-1">
        <p className="line-clamp-1 text-sm font-bold text-pool-deep">
          {row.full_name}
          {isMe ? (
            <span className="ml-1 text-[10px] font-bold uppercase tracking-eyebrow text-pool-deep">
              · Tú
            </span>
          ) : null}
        </p>
        <p className="line-clamp-1 text-[11px] text-ink-600">
          {row.team_label ?? "Sin equipo"}
        </p>
      </div>
      <div className="text-right">
        <p className="font-mono text-2xl font-extrabold tabular-nums text-pool-deep">
          {row.primary_value}
          {metricSuffix}
        </p>
        <p className="text-[10px] font-bold uppercase tracking-eyebrow text-ink-600">
          {metricLabel}
        </p>
      </div>
    </article>
  );
}
