"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
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
  {
    id: "seasons",
    href: "/admin/seasons",
    label: "Temporadas",
    Icon: MdCalendarMonth,
  },
  {
    id: "teams",
    href: "/admin/teams",
    label: "Equipos",
    Icon: MdGroups,
  },
  {
    id: "players",
    href: "/admin/players",
    label: "Jugadores",
    Icon: MdPerson,
  },
  {
    id: "families",
    href: "/admin/families",
    label: "Familias",
    Icon: MdFamilyRestroom,
  },
  {
    id: "staff",
    href: "/admin/staff",
    label: "Personal",
    Icon: MdBadge,
  },
  {
    id: "trainings",
    href: "/admin/trainings",
    label: "Entrenamientos",
    Icon: MdFitnessCenter,
  },
  {
    id: "matches",
    href: "/admin/matches",
    label: "Partidos",
    Icon: MdSportsVolleyball,
  },
  {
    id: "treasury",
    href: "/admin/treasury",
    label: "Tesoreria",
    Icon: MdEuro,
  },
  {
    id: "import",
    href: "/admin/players/import",
    label: "Importar",
    Icon: MdUploadFile,
  },
  {
    id: "access",
    href: "/admin/access-requests",
    label: "Accesos",
    Icon: MdLock,
  },
] as const;

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminTabs() {
  const pathname = usePathname();

  if (pathname === "/admin") return null;

  return (
    <nav
      aria-label="Secciones de administración"
      data-admin-tabs
      className="border-ink-300 bg-paper-card sticky top-[var(--top-bar-height)] z-20 border-b"
    >
      <div data-admin-tabs-grid className="scrollbar-hide overflow-x-auto px-4 py-2.5">
        <ul className="flex w-max gap-2" role="tablist">
          {TABS.map((tab) => {
            const active = isActive(pathname, tab.href);
            const Icon = tab.Icon;
            return (
              <li key={tab.id} className="shrink-0">
                <Link
                  href={tab.href as Route}
                  role="tab"
                  aria-selected={active}
                  data-tab-id={tab.id}
                  className={cn(
                    "focus-visible:ring-pool-blue focus-visible:ring-offset-paper touch-target flex h-10 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition-all focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
                    active
                      ? "border-pool-deep bg-pool-deep text-paper shadow-sm"
                      : "border-ink-300 bg-paper text-ink-700 hover:border-pool-blue hover:bg-pool-foam/40",
                  )}
                >
                  <Icon className="h-4.5 w-4.5 shrink-0" />
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
