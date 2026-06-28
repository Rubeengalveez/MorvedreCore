import Image from "next/image";

import { cn } from "@/lib/utils/cn";

export interface PichichiPodiumItem {
  id: string;
  name: string;
  value: number;
  photoUrl?: string | null;
  teamColor: string;
  capNumber?: number | null;
  isMine?: boolean;
}

export interface PichichiPodiumProps {
  items: Array<PichichiPodiumItem & { position: 1 | 2 | 3 }>;
  metric: string;
  className?: string;
}

const rankPalette: Record<1 | 2 | 3, { bg: string; ring: string }> = {
  1: { bg: "var(--ball-gold)", ring: "var(--ball-gold)" },
  2: { bg: "#CBD5E1", ring: "#94A3B8" },
  3: { bg: "#A16207", ring: "#92400E" },
};

export function PichichiPodium({ items, metric, className }: PichichiPodiumProps) {
  const first = items.find((i) => i.position === 1) ?? null;
  const second = items.find((i) => i.position === 2) ?? null;
  const third = items.find((i) => i.position === 3) ?? null;
  if (!first && !second && !third) return null;
  return (
    <div
      data-pichichi-podium
      aria-label={`Podio de ${metric}`}
      className={cn(
        "relative grid grid-cols-3 items-end gap-3 px-1 pb-1",
        className,
      )}
    >
      {second ? (
        <PodiumStep
          item={second}
          rank={2}
          metric={metric}
          delay={120}
          align="center"
        />
      ) : (
        <Placeholder />
      )}
      {first ? (
        <PodiumStep item={first} rank={1} metric={metric} delay={0} align="center" />
      ) : (
        <Placeholder />
      )}
      {third ? (
        <PodiumStep
          item={third}
          rank={3}
          metric={metric}
          delay={240}
          align="center"
        />
      ) : (
        <Placeholder />
      )}
    </div>
  );
}

function Placeholder() {
  return <div aria-hidden="true" className="h-full min-h-[120px]" />;
}

function PodiumStep({
  item,
  rank,
  metric,
  delay,
  align,
}: {
  item: PichichiPodiumItem;
  rank: 1 | 2 | 3;
  metric: string;
  delay: number;
  align: "center";
}) {
  const palette = rankPalette[rank];
  const heights: Record<1 | 2 | 3, string> = {
    1: "min-h-[200px]",
    2: "min-h-[160px]",
    3: "min-h-[140px]",
  };
  const photoSizes: Record<1 | 2 | 3, number> = { 1: 88, 2: 64, 3: 64 };
  return (
    <div
      data-podium-rank={rank}
      style={{ animationDelay: `${delay}ms` }}
      className={cn(
        "podium-step-in flex flex-col items-center gap-2",
        align === "center" && "items-center",
      )}
    >
      {rank === 1 ? (
        <Crown aria-hidden="true" />
      ) : (
        <span
          aria-hidden="true"
          className="inline-flex h-5 items-center rounded-sm bg-paper px-1.5 text-[10px] font-extrabold uppercase tracking-eyebrow text-ink-600"
        >
          {rank === 2 ? "Plata" : "Bronce"}
        </span>
      )}
      <div
        className={cn(
          "relative flex w-full flex-col items-center justify-end rounded-md border border-ink-300 bg-paper-card px-2 pb-3 pt-3 shadow-elev-2",
          heights[rank],
        )}
      >
        {item.isMine ? (
          <span
            aria-hidden="true"
            className="absolute right-2 top-2 inline-flex h-5 items-center rounded-sm bg-ball-gold px-1.5 text-[10px] font-extrabold uppercase tracking-eyebrow text-pool-deep"
          >
            Tú
          </span>
        ) : null}
        {item.photoUrl ? (
          <Image
            src={item.photoUrl}
            alt={item.name}
            width={photoSizes[rank]}
            height={photoSizes[rank]}
            className="rounded-full border-2 object-cover"
            style={{ borderColor: item.teamColor }}
          />
        ) : (
          <span
            aria-hidden="true"
            className="flex items-center justify-center rounded-full font-display font-extrabold text-paper"
            style={{
              width: photoSizes[rank],
              height: photoSizes[rank],
              fontSize: photoSizes[rank] * 0.4,
              backgroundColor: item.teamColor,
            }}
          >
            {initials(item.name)}
          </span>
        )}
        <p className="mt-2 line-clamp-1 text-center font-display text-sm font-extrabold text-pool-deep">
          {item.name}
        </p>
        {item.capNumber != null ? (
          <p className="text-[10px] font-semibold uppercase tracking-eyebrow text-ink-600">
            #{item.capNumber}
          </p>
        ) : null}
        <p
          className="mt-1 text-score-lg text-pool-deep"
          style={{ fontSize: rank === 1 ? "40px" : "32px" }}
        >
          {item.value}
        </p>
        <p className="text-[10px] font-semibold uppercase tracking-eyebrow text-ink-600">
          {metric}
        </p>
      </div>
      <span
        aria-hidden="true"
        className="inline-flex h-7 w-12 items-center justify-center rounded-sm font-display text-lg font-extrabold text-paper"
        style={{ backgroundColor: palette.bg }}
      >
        {rank}
      </span>
    </div>
  );
}

function Crown({ ...rest }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--ball-gold)"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="h-5 w-5"
      {...rest}
    >
      <path d="M3 8 L6 14 L12 6 L18 14 L21 8 L19 18 L5 18 Z" fill="var(--ball-gold)" />
      <circle cx="3" cy="8" r="1" fill="var(--pool-deep)" stroke="none" />
      <circle cx="12" cy="6" r="1" fill="var(--pool-deep)" stroke="none" />
      <circle cx="21" cy="8" r="1" fill="var(--pool-deep)" stroke="none" />
    </svg>
  );
}

function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}
