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
        "group focus-visible:ring-pool-blue relative flex min-h-16 touch-manipulation items-center gap-2.5 overflow-hidden rounded-xl border p-2.5 shadow-sm transition-[border-color,box-shadow,transform] duration-200 focus-visible:ring-2 focus-visible:outline-none active:scale-[0.98] motion-reduce:transition-none min-[390px]:min-h-18 min-[390px]:p-3",
        tone === "streaks"
          ? "border-ball-gold/70 hover:border-ball-gold hover:shadow-elev-2 bg-[linear-gradient(145deg,rgba(244,196,48,0.24),rgba(255,107,53,0.09))]"
          : "border-pool-blue/35 hover:border-pool-blue/60 hover:shadow-elev-2 bg-[linear-gradient(145deg,rgba(226,239,244,0.95),rgba(22,87,168,0.09))]",
        active && "ring-pool-deep/10 ring-2",
      )}
    >
      <span
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg shadow-sm [&>svg]:h-5 [&>svg]:w-5",
          tone === "streaks" ? "bg-ball-gold text-action" : "bg-pool-deep text-paper",
        )}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="text-pool-deep font-display block text-sm leading-tight font-extrabold min-[390px]:text-base">
          {title}
        </span>
        <span className="text-ink-600 mt-0.5 hidden text-[11px] leading-snug min-[390px]:block">
          {description}
        </span>
      </span>
      <ArrowRight
        className={cn(
          "h-4 w-4 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none",
          tone === "streaks" ? "text-action" : "text-pool-blue",
        )}
        aria-hidden="true"
      />
    </Link>
  );
}
