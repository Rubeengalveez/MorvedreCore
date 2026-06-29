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
    <section aria-labelledby="top3-heading" className="flex flex-col gap-3">
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
        <div className="grid grid-cols-2 gap-3">
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
      className={cn(
        "relative overflow-hidden rounded-md border-2 shadow-elev-2 transition-transform",
        isMe ? "border-ball-gold cap-tile-ring" : "border-ink-200",
      )}
      style={{
        background: `linear-gradient(135deg, color-mix(in oklab, ${teamColor} 22%, var(--paper-card)) 0%, color-mix(in oklab, ${teamColor} 8%, var(--paper-card)) 100%)`,
        ["--cap-ring" as string]: "var(--ball-gold)",
      }}
    >
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-1.5"
        style={{ backgroundColor: teamColor }}
      />
      <div className="flex flex-col items-center gap-2 p-4 text-center">
        <div className="flex items-center gap-2">
          <Medal rank={1} size="sm" />
          <Eyebrow className="text-ink-700">Líder de {metricLabel.toLowerCase()}</Eyebrow>
          {isMe ? (
            <span
              data-top-one-self
              className="inline-flex h-5 items-center rounded-sm bg-ball-gold px-1.5 text-[10px] font-extrabold uppercase tracking-eyebrow text-pool-deep"
            >
              Eres el #1
            </span>
          ) : null}
        </div>

        <div className="flex flex-col items-center gap-1">
          {row.photo_url ? (
            <Image
              src={row.photo_url}
              alt={row.full_name}
              width={80}
              height={80}
              className="h-20 w-20 rounded-full border-2 object-cover"
              style={{ borderColor: teamColor }}
            />
          ) : (
            <div
              aria-hidden="true"
              className="flex h-20 w-20 items-center justify-center rounded-full border-2 font-display text-2xl font-extrabold text-paper"
              style={{ backgroundColor: teamColor, borderColor: "var(--ball-gold)" }}
            >
              {row.full_name
                .split(/\s+/)
                .filter(Boolean)
                .slice(0, 2)
                .map((p) => p[0]?.toUpperCase() ?? "")
                .join("") || "?"}
            </div>
          )}
          <CapTile
            number={row.cap_number ?? 0}
            teamColor={teamColor}
            size="sm"
            isMe={isMe}
            aria-label={`Dorsal ${row.cap_number ?? 0} del líder`}
          />
        </div>

        <h3 className="font-display text-xl font-extrabold leading-tight text-pool-deep line-clamp-1">
          {row.full_name}
        </h3>
        <p className="line-clamp-1 text-xs font-semibold text-ink-700">
          {row.team_label ?? "Sin equipo"}
        </p>

        <div
          className="flex flex-col items-center gap-0.5 pt-1"
          aria-label={`${row.primary_value} ${metricLabel.toLowerCase()}`}
        >
          <p
            className="font-mono text-6xl font-extrabold leading-[0.9] tabular-nums text-pool-deep"
            style={{ fontSize: "clamp(56px, 18vw, 72px)" }}
          >
            {displayValue}
          </p>
          <p className="text-[10px] font-bold uppercase tracking-eyebrow text-ink-600">
            {metricLabel}
            {metricSuffix ? ` (${metricSuffix})` : ""} · temporada
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
  return (
    <article
      data-runner-card={rank}
      className={cn(
        "relative flex items-center gap-2.5 overflow-hidden rounded-md border border-ink-300 bg-paper-card p-3 shadow-elev-1",
        isMe && "ring-2 ring-ball-gold/40",
      )}
    >
      <Medal rank={rank} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="line-clamp-1 text-sm font-bold text-pool-deep">
          {row.full_name}
          {isMe ? (
            <span className="ml-1 text-[10px] font-bold uppercase tracking-eyebrow text-pool-deep">
              · Tú
            </span>
          ) : null}
        </p>
        <p className="line-clamp-1 text-[10px] text-ink-600">
          {row.team_label ?? "Sin equipo"}
        </p>
      </div>
      <div className="text-right">
        <p className="font-mono text-xl font-extrabold tabular-nums text-pool-deep">
          {row.primary_value}
          {metricSuffix}
        </p>
        <p className="text-[9px] font-bold uppercase tracking-eyebrow text-ink-600">
          {metricLabel}
        </p>
      </div>
    </article>
  );
}

void Trofeo;
