"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";

import {
  Calendario,
  Equipo,
  Inicio,
  Trofeo,
  Usuario,
} from "@/components/brand/pictograms";
import { cn } from "@/lib/utils/cn";

const items = [
  { href: "/dashboard", label: "Inicio", Pictogram: Inicio },
  { href: "/calendar", label: "Calendario", Pictogram: Calendario },
  { href: "/rankings", label: "Rankings", Pictogram: Trofeo },
  { href: "/team", label: "Equipo", Pictogram: Equipo },
  { href: "/profile", label: "Yo", Pictogram: Usuario },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navegación principal"
      data-bottom-nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-ink-300 bg-paper pb-[env(safe-area-inset-bottom)] shadow-elev-2"
    >
      <ul className="mx-auto flex h-16 max-w-md items-stretch">
        {items.map((item) => {
          const Pictogram = item.Pictogram;
          const href = item.href;
          const isActive =
            pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href as Route}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex h-full w-full flex-col items-center justify-center gap-1 px-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pool-blue focus-visible:ring-offset-2 focus-visible:ring-offset-paper",
                  isActive ? "text-pool-blue" : "text-ink-600",
                )}
              >
                <Pictogram
                  className="h-7 w-7"
                  accent={isActive ? "var(--pool-blue)" : "currentColor"}
                />
                <span
                  aria-hidden="true"
                  className="flex h-1.5 w-1.5 items-center justify-center"
                >
                  {isActive ? (
                    <span
                      data-nav-dot
                      className="block h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: "var(--ball-gold)" }}
                    />
                  ) : null}
                </span>
                <span
                  className={cn(
                    "text-xs leading-none",
                    isActive
                      ? "font-display font-extrabold text-pool-deep"
                      : "font-medium",
                  )}
                >
                  {item.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
