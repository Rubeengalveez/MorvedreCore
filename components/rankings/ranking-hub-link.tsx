import Link from "next/link";
import type { Route } from "next";
import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";

import { cn } from "@/lib/utils/cn";

export function RankingHubLink({
  href,
  title,
  description,
  icon,
  tone,
  active = false,
}: {
  href: Route;
  title: string;
  description: string;
  icon: ReactNode;
  tone: "streaks" | "legends";
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group focus-visible:ring-pool-blue relative flex min-h-28 touch-manipulation flex-col justify-between overflow-hidden rounded-2xl border p-3.5 shadow-sm transition-[border-color,box-shadow,transform] duration-200 focus-visible:ring-2 focus-visible:outline-none active:scale-[0.98] motion-reduce:transition-none sm:min-h-32 sm:p-4",
        tone === "streaks"
          ? "border-ball-gold/70 hover:border-ball-gold hover:shadow-elev-2 bg-[linear-gradient(145deg,rgba(244,196,48,0.24),rgba(255,107,53,0.09))]"
          : "border-pool-blue/35 hover:border-pool-blue/60 hover:shadow-elev-2 bg-[linear-gradient(145deg,rgba(226,239,244,0.95),rgba(22,87,168,0.09))]",
        active && "ring-pool-deep/10 ring-2",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl shadow-sm",
            tone === "streaks" ? "bg-ball-gold text-action" : "bg-pool-deep text-paper",
          )}
        >
          {icon}
        </span>
        <span
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none",
            tone === "streaks" ? "bg-paper/70 text-action" : "bg-paper/80 text-pool-blue",
          )}
        >
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </span>
      </div>
      <span className="mt-3 min-w-0">
        <span className="text-pool-deep font-display block text-base leading-tight font-extrabold sm:text-lg">
          {title}
        </span>
        <span className="text-ink-600 mt-1 block text-xs leading-snug sm:text-sm">
          {description}
        </span>
      </span>
    </Link>
  );
}
