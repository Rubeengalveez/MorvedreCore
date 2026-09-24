import Link from "next/link";
import type { Route } from "next";
import { ChartNoAxesColumn, Crown } from "lucide-react";
import { AdaptivePlayerName } from "@/components/ui/adaptive-player-name";
import { cn } from "@/lib/utils/cn";
import { mixHexWithWhite } from "@/lib/utils/color";

export interface RankingEntryCardProps {
  position: number;
  playerId: string;
  fullName: string;
  photoUrl: string | null;
  categoryLabel: string;
  categoryColor: string;
  value: string;
  valueLabel: string;
  details: string[];
  isMe: boolean;
  isJumpTarget?: boolean;
  href?: Route;
  variant?: "list" | "podium";
}

function Medal({ position, compact = false }: { position: number; compact?: boolean }) {
  const tone =
    position === 1
      ? "border-amber-100 bg-gradient-to-br from-amber-100 via-ball-gold to-amber-500 text-pool-deep"
      : position === 2
        ? "border-slate-100 bg-gradient-to-br from-white via-slate-200 to-slate-400 text-pool-deep"
        : "border-orange-100 bg-gradient-to-br from-orange-100 via-orange-300 to-amber-700 text-pool-deep";
  return (
    <span
      aria-label={`Puesto ${position}`}
      className={cn(
        "shadow-elev-2 relative z-0 flex shrink-0 items-center justify-center rounded-full border-[3px] font-mono font-extrabold tabular-nums",
        compact ? "h-10 w-10 text-lg" : "h-11 w-11 text-xl",
        tone,
      )}
    >
      {position}
    </span>
  );
}

export function RankingEntryCard({
  position,
  playerId,
  fullName,
  categoryLabel,
  categoryColor,
  value,
  valueLabel,
  details,
  isMe,
  isJumpTarget = false,
  href,
  variant = "list",
}: RankingEntryCardProps) {
  const podium = variant === "podium";
  const leader = podium && position === 1;
  const longValue = value.length > 6;
  const detailText = details.join(" · ");
  const name = <AdaptivePlayerName name={fullName} />;
  const className = cn(
    "relative block min-w-0 scroll-mt-[calc(var(--top-bar-height)+1rem)] overflow-hidden rounded-2xl border shadow-elev-1",
    leader
      ? "border-ball-gold/70 bg-pool-deep p-3 text-paper shadow-elev-3"
      : "border-ink-200 bg-paper-card text-pool-deep",
    podium && !leader && "p-2.5",
    !podium && "border-l-2 px-3 py-2.5",
    isMe && "ring-ball-gold ring-2 ring-offset-1",
    isJumpTarget && "ring-action ring-2 ring-offset-1",
    href &&
      "focus-visible:ring-pool-blue touch-manipulation focus-visible:ring-2 focus-visible:outline-none",
  );
  const content = podium ? (
    leader ? (
      <>
        <Crown
          aria-hidden="true"
          className="text-pool-blue pointer-events-none absolute -top-4 -right-2 h-28 w-28 rotate-[-12deg] opacity-25"
        />
        <div className="relative flex min-w-0 items-center gap-3">
          <Medal position={position} />
          <div className="min-w-0 flex-1">
            <p className="text-ball-gold flex items-center gap-1 text-xs font-extrabold uppercase">
              <Crown className="h-3.5 w-3.5" aria-hidden="true" /> Líder
            </p>
            <div className="font-display mt-0.5 text-lg leading-tight font-extrabold">{name}</div>
          </div>
          <div className="border-paper/30 shrink-0 border-l pl-3 text-center">
            <p
              className={cn(
                "text-ball-gold font-mono leading-none font-extrabold tabular-nums",
                longValue ? "text-3xl" : "text-4xl",
              )}
            >
              {value}
            </p>
            <p className="text-paper mt-0.5 text-xs font-semibold">{valueLabel}</p>
          </div>
        </div>
        <p className="text-paper/85 relative mt-1.5 pl-14 text-xs leading-snug font-semibold">
          {categoryLabel}
          {isMe ? " · Tú" : ""}
          {detailText ? ` · ${detailText}` : ""}
        </p>
      </>
    ) : (
      <div className="flex min-w-0 items-center gap-2.5">
        <Medal position={position} compact />
        <div className="min-w-0 flex-1">
          <div className="font-display text-base leading-tight font-extrabold">{name}</div>
          <p className="text-ink-700 mt-0.5 text-xs leading-snug">
            <span className="font-semibold">
              {categoryLabel}
              {isMe ? " · Tú" : ""}
            </span>
            {detailText ? ` · ${detailText}` : ""}
          </p>
        </div>
        <div className="border-ink-200 shrink-0 border-l pl-2.5 text-center">
          <p
            className={cn(
              "font-mono leading-none font-extrabold tabular-nums",
              longValue ? "text-xl" : "text-3xl",
            )}
          >
            {value}
          </p>
          <p className="text-ink-600 mt-0.5 text-xs font-semibold">{valueLabel}</p>
        </div>
      </div>
    )
  ) : (
    <div className="flex min-w-0 items-center gap-2.5">
      <span
        aria-label={`Puesto ${position}`}
        className="text-pool-blue flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-mono text-xl font-extrabold tabular-nums"
        style={{ backgroundColor: mixHexWithWhite(categoryColor, 0.12) }}
      >
        {position}
      </span>
      <div className="min-w-0 flex-1">
        <div className="font-display text-base leading-tight font-extrabold">{name}</div>
        <p className="text-ink-600 mt-0.5 truncate text-xs font-semibold">
          {categoryLabel}
          {isMe ? " · Tú" : ""}
        </p>
        {detailText ? (
          <p
            className="text-ink-700 mt-1 flex min-w-0 items-center gap-1 truncate text-xs font-medium"
            title={detailText}
          >
            <ChartNoAxesColumn aria-hidden="true" className="h-3 w-3 shrink-0" />
            <span className="truncate">{detailText}</span>
          </p>
        ) : null}
      </div>
      <div className="border-ink-200 shrink-0 border-l pl-2.5 text-center">
        <p
          className={cn(
            "font-mono leading-none font-extrabold tabular-nums",
            longValue ? "text-2xl" : "text-3xl",
          )}
        >
          {value}
        </p>
        <p className="text-ink-600 mt-0.5 text-xs font-semibold">{valueLabel}</p>
      </div>
    </div>
  );
  const props = {
    id: `ranking-player-${playerId}`,
    className,
    style: {
      borderLeftColor: categoryColor,
      backgroundImage: !podium
        ? `linear-gradient(105deg, ${mixHexWithWhite(categoryColor, 0.12)}, white 38%)`
        : undefined,
    },
    "data-podium-first": leader ? "" : undefined,
  };
  return href ? (
    <Link
      {...props}
      href={href}
      aria-label={`${fullName}, puesto ${position}, ${value} ${valueLabel}. ${detailText}`}
    >
      {content}
    </Link>
  ) : (
    <article {...props}>{content}</article>
  );
}
