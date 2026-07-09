"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  MdCalendarMonth,
  MdGroups,
  MdPerson,
  MdFamilyRestroom,
  MdBadge,
  MdFitnessCenter,
  MdSportsVolleyball,
  MdUploadFile,
  MdLock,
  MdEuro,
} from "react-icons/md";

import { cn } from "@/lib/utils/cn";

const TABS = [
  { id: "seasons", href: "/admin/seasons", label: "Temporadas", Icon: MdCalendarMonth },
  { id: "teams", href: "/admin/teams", label: "Equipos", Icon: MdGroups },
  { id: "players", href: "/admin/players", label: "Jugadores", Icon: MdPerson },
  { id: "families", href: "/admin/families", label: "Familias", Icon: MdFamilyRestroom },
  { id: "staff", href: "/admin/staff", label: "Personal", Icon: MdBadge },
  { id: "trainings", href: "/admin/trainings", label: "Entrenos", Icon: MdFitnessCenter },
  { id: "matches", href: "/admin/matches", label: "Partidos", Icon: MdSportsVolleyball },
  { id: "treasury", href: "/admin/treasury", label: "Tesoreria", Icon: MdEuro },
  { id: "import", href: "/admin/players/import", label: "Importar", Icon: MdUploadFile },
  { id: "access", href: "/admin/access-requests", label: "Accesos", Icon: MdLock },
] as const;

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminTabs() {
  const pathname = usePathname();
  const containerRef = useRef<HTMLDivElement>(null);
  const [pill, setPill] = useState({ left: 0, width: 0 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const activeLink = container.querySelector<HTMLElement>("[data-tab-active='true']");
    if (!activeLink) return;

    const cRect = container.getBoundingClientRect();
    const tRect = activeLink.getBoundingClientRect();

    setPill({
      left: tRect.left - cRect.left + container.scrollLeft,
      width: tRect.width,
    });
  }, [pathname]);

  if (pathname === "/admin") return null;

  return (
    <nav
      aria-label="Secciones de administracion"
      data-admin-tabs
      className="bg-paper-card sticky top-[var(--top-bar-height)] z-20 border-b border-ink-200 shadow-sm"
    >
      <div
        ref={containerRef}
        className="scrollbar-hide relative overflow-x-auto px-4 py-3"
      >
        <span
          aria-hidden="true"
          className="bg-pool-deep absolute top-3 bottom-3 rounded-full shadow-sm transition-all duration-300 ease-out"
          style={{
            left: `${pill.left}px`,
            width: `${pill.width}px`,
          }}
        />

        <ul className="relative flex w-max gap-1" role="tablist">
          {TABS.map((tab) => {
            const active = isActive(pathname, tab.href);
            const Icon = tab.Icon;
            return (
              <li key={tab.id} className="shrink-0">
                <Link
                  href={tab.href as Route}
                  role="tab"
                  aria-selected={active}
                  data-tab-active={active}
                  className={cn(
                    "focus-visible:ring-pool-blue focus-visible:ring-offset-paper touch-target relative z-10 flex h-11 items-center gap-1.5 rounded-full px-3.5 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
                    active ? "text-paper" : "text-ink-600 hover:text-pool-deep",
                  )}
                >
                  <Icon
                    className={cn(
                      "h-4.5 w-4.5 shrink-0 transition-transform duration-300",
                      active && "scale-110",
                    )}
                  />
                  <span className="whitespace-nowrap">{tab.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
