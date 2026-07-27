import Link from "next/link";
import type { Route } from "next";
import { Crown, Flame, Trophy } from "lucide-react";

import { cn } from "@/lib/utils/cn";

const ITEMS = [
  { id: "season", href: "/rankings", label: "Ranking", icon: Trophy },
  { id: "streaks", href: "/streaks", label: "Rachas", icon: Flame },
  { id: "legends", href: "/legends", label: "Leyendas", icon: Crown },
] as const;

export function RankingsSectionNav({ active }: { active: (typeof ITEMS)[number]["id"] }) {
  return (
    <nav
      aria-label="Secciones de rankings"
      className="border-ink-200 bg-paper-sunk/85 grid grid-cols-3 gap-1 rounded-xl border p-1"
    >
      {ITEMS.map(({ id, href, label, icon: Icon }) => {
        const isActive = active === id;
        return (
          <Link
            key={id}
            href={href as Route}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "focus-visible:ring-pool-blue inline-flex min-h-12 touch-manipulation items-center justify-center gap-1.5 rounded-lg px-1 text-sm font-extrabold transition-[background-color,color,box-shadow,transform] duration-200 focus-visible:ring-2 focus-visible:outline-none active:scale-[0.98] motion-reduce:transition-none min-[380px]:px-2",
              isActive
                ? "bg-pool-deep text-paper shadow-elev-1"
                : "text-ink-600 hover:bg-paper-card hover:text-pool-deep",
            )}
          >
            <Icon className="hidden h-4 w-4 shrink-0 min-[430px]:block" aria-hidden="true" />
            <span className="whitespace-nowrap">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
