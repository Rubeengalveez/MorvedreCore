"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";

import { Balon, Silbato } from "@/components/brand/pictograms";
import { cn } from "@/lib/utils/cn";

const TABS = [
  { href: "/admin/seasons", label: "Temporadas" },
  { href: "/admin/teams", label: "Equipos" },
  { href: "/admin/players", label: "Jugadores" },
  { href: "/admin/families", label: "Familias" },
  { href: "/admin/staff", label: "Personal" },
  { href: "/admin/trainings", label: "Entrenamientos", Pictogram: Silbato },
  { href: "/admin/matches", label: "Partidos", Pictogram: Balon },
  { href: "/admin/players/import", label: "Importar" },
] as const;

export function AdminTabs() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Secciones de administración"
      className="sticky top-[60px] z-20 border-b border-ink-300 bg-paper"
    >
      <ul className="no-scrollbar mx-auto flex max-w-3xl gap-1 overflow-x-auto px-2 py-1">
        {TABS.map((tab) => {
          const href = tab.href;
          const isActive =
            pathname === href || pathname.startsWith(`${href}/`);
          const Pictogram = "Pictogram" in tab ? tab.Pictogram : null;
          return (
            <li key={href} className="shrink-0">
              <Link
                href={href as Route}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "relative inline-flex h-12 min-h-12 items-center justify-center gap-2 whitespace-nowrap px-4 font-display text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2 focus-visible:ring-offset-paper",
                  isActive
                    ? "text-brand-blue"
                    : "text-ink-600 hover:text-brand-deep",
                )}
              >
                {Pictogram ? (
                  <Pictogram
                    aria-hidden="true"
                    className="h-5 w-5"
                    style={
                      isActive
                        ? ({ color: "var(--brand-blue)" } as React.CSSProperties)
                        : undefined
                    }
                  />
                ) : null}
                {tab.label}
                {isActive ? (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-3 bottom-0 h-[3px] rounded-full bg-brand-blue"
                  />
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
