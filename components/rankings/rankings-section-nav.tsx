"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { Route } from "next";
import { Crown, Flame, Trophy } from "lucide-react";

import { cn } from "@/lib/utils/cn";

const ITEMS = [
  { id: "season", href: "/rankings", label: "Ranking", icon: Trophy },
  { id: "streaks", href: "/streaks", label: "Rachas", icon: Flame },
  { id: "legends", href: "/legends", label: "Leyendas", icon: Crown },
] as const;

export function RankingsSectionNav({ active }: { active: (typeof ITEMS)[number]["id"] }) {
  const params = useSearchParams();
  return (
    <nav aria-label="Secciones de rankings" className="grid grid-cols-3 gap-2">
      {ITEMS.map(({ id, href, label, icon: Icon }) => {
        const isActive = active === id;
        const next = new URLSearchParams();
        if (params.get("scope")) next.set("scope", params.get("scope")!);
        if (id !== "legends" && params.get("subject")) next.set("subject", params.get("subject")!);
        const destination = `${href}${next.size ? `?${next}` : ""}`;
        return (
          <Link
            key={id}
            href={destination as Route}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "focus-visible:outline-pool-blue border-pool-deep/65 inline-flex min-h-12 touch-manipulation items-center justify-center gap-1.5 rounded-xl border-2 px-1 text-sm font-extrabold focus-visible:outline-2 focus-visible:outline-offset-2",
              isActive ? "bg-pool-deep text-paper" : "text-pool-deep bg-white hover:bg-blue-50",
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
