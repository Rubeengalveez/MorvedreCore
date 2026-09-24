import { Pin } from "lucide-react";

import { cn } from "@/lib/utils/cn";

const dateFormatter = new Intl.DateTimeFormat("es-ES", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Europe/Madrid",
});

export function NewsStoryMeta({
  audience,
  teamLabel,
  publishedAt,
  pinned = false,
  inverse = false,
}: {
  audience: "club" | "team";
  teamLabel: string | null;
  publishedAt: string;
  pinned?: boolean;
  inverse?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
      {pinned ? (
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 tracking-[0.06em] uppercase",
            inverse ? "bg-ball-gold text-pool-deep" : "bg-ball-gold/25 text-pool-deep",
          )}
        >
          <Pin aria-hidden="true" className="h-3 w-3" />
          Destacada
        </span>
      ) : null}
      <span
        className={cn(
          "inline-flex rounded-full border px-2.5 py-1",
          inverse
            ? "border-paper/30 bg-paper/10 text-paper"
            : "border-pool-blue/15 bg-pool-foam text-pool-deep",
        )}
      >
        {audience === "team" ? (teamLabel ?? "Equipo") : "Todo el club"}
      </span>
      <time dateTime={publishedAt} className={inverse ? "text-paper/80" : "text-ink-600"}>
        {dateFormatter.format(new Date(publishedAt))}
      </time>
    </div>
  );
}
