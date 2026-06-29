"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";

import {
  Calendario,
  Equipo,
  Inicio,
  Tiburon,
  Tienda,
  Trofeo,
} from "@/components/brand/pictograms";
import { cn } from "@/lib/utils/cn";

const items = [
  { href: "/dashboard", label: "Inicio", Pictogram: Inicio },
  { href: "/calendar", label: "Calendario", Pictogram: Calendario },
  { href: "/rankings", label: "Rankings", Pictogram: Trofeo },
  { href: "/team", label: "Equipo", Pictogram: Equipo },
  { href: "/shop", label: "Tienda", Pictogram: Tienda },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navegación principal Morvedre Core"
      data-bottom-nav
      className="fixed inset-x-0 bottom-0 z-30 border-t-2 border-pool-deep bg-paper-card pb-[env(safe-area-inset-bottom)]"
      style={{ boxShadow: "0 -2px 16px rgba(6,32,72,0.07)" }}
    >
      <ul className="mx-auto flex h-[60px] max-w-lg items-stretch">
        {items.map((item) => {
          const Pictogram = item.Pictogram;
          const href = item.href;
          const isActive =
            pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href} className="relative flex-1">
              {isActive ? (
                <span
                  aria-hidden="true"
                  className="absolute inset-x-2 top-0 h-[2px] rounded-b-sm bg-pool-deep"
                />
              ) : null}
              <Link
                href={href as Route}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex h-full w-full flex-col items-center justify-center gap-[3px] px-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pool-blue focus-visible:ring-inset",
                  isActive ? "text-pool-deep" : "text-ink-400 hover:text-ink-600",
                )}
              >
                <Pictogram
                  className="h-6 w-6 shrink-0"
                  accent={isActive ? "var(--pool-deep)" : "currentColor"}
                />
                <span
                  className={cn(
                    "text-[10px] leading-none tracking-wide",
                    isActive ? "font-extrabold text-pool-deep" : "font-medium",
                  )}
                >
                  {item.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
      <TiburonHiddenBadge />
    </nav>
  );
}

function TiburonHiddenBadge() {
  return (
    <span
      aria-hidden="true"
      data-morvedre-shark
      className="pointer-events-none absolute right-3 -top-1 h-3 w-4 opacity-50"
    >
      <Tiburon className="h-full w-full" accent="var(--pool-deep)" />
    </span>
  );
}

