"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";

import {
  Balon,
  Calendario,
  Equipo,
  Familia,
  FileUp,
  Gorro,
  Personal,
  Silbato,
  type PictogramProps,
} from "@/components/brand/pictograms";
import { cn } from "@/lib/utils/cn";

type AdminTabId =
  | "seasons"
  | "teams"
  | "players"
  | "families"
  | "staff"
  | "trainings"
  | "matches"
  | "import";

interface AdminTab {
  id: AdminTabId;
  href: string;
  label: string;
  description: string;
  Pictogram: React.ComponentType<PictogramProps>;
  bg: string;
  pictogramAccent: string;
}

const TABS: AdminTab[] = [
  {
    id: "seasons",
    href: "/admin/seasons",
    label: "Temporadas",
    description: "Crea y archiva.",
    Pictogram: Calendario,
    bg: "var(--pool-teal)",
    pictogramAccent: "var(--ball-gold)",
  },
  {
    id: "teams",
    href: "/admin/teams",
    label: "Equipos",
    description: "Configura plantillas.",
    Pictogram: Equipo,
    bg: "var(--pool-blue)",
    pictogramAccent: "var(--ball-gold)",
  },
  {
    id: "players",
    href: "/admin/players",
    label: "Jugadores",
    description: "Altas y ediciones.",
    Pictogram: Gorro,
    bg: "var(--ball-gold)",
    pictogramAccent: "var(--pool-deep)",
  },
  {
    id: "families",
    href: "/admin/families",
    label: "Familias",
    description: "Tutores vinculados.",
    Pictogram: Familia,
    bg: "var(--pool-deep)",
    pictogramAccent: "var(--ball-gold)",
  },
  {
    id: "staff",
    href: "/admin/staff",
    label: "Personal",
    description: "Entrenadores y más.",
    Pictogram: Personal,
    bg: "var(--ink-700)",
    pictogramAccent: "var(--ball-gold)",
  },
  {
    id: "trainings",
    href: "/admin/trainings",
    label: "Entrenamientos",
    description: "Bloques y asistencia.",
    Pictogram: Silbato,
    bg: "var(--action)",
    pictogramAccent: "var(--ball-gold)",
  },
  {
    id: "matches",
    href: "/admin/matches",
    label: "Partidos",
    description: "Convocatorias y actas.",
    Pictogram: Balon,
    bg: "var(--goggle-red)",
    pictogramAccent: "var(--ball-gold)",
  },
  {
    id: "import",
    href: "/admin/players/import",
    label: "Importar",
    description: "Carga desde Excel.",
    Pictogram: FileUp,
    bg: "var(--pool-teal)",
    pictogramAccent: "var(--ball-gold)",
  },
];

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminTabs() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Secciones de administración"
      data-admin-tabs
      className="sticky top-[60px] z-20 border-b border-ink-300 bg-paper"
    >
      <div
        data-admin-tabs-grid
        className="mx-auto max-w-3xl px-3 py-3"
      >
        <ul
          className="grid grid-cols-4 gap-2 sm:grid-cols-4"
          role="tablist"
        >
          {TABS.map((tab) => {
            const active = isActive(pathname, tab.href);
            const { Pictogram } = tab;
            return (
              <li key={tab.id}>
                <Link
                  href={tab.href as Route}
                  role="tab"
                  aria-selected={active}
                  data-tab-id={tab.id}
                  className={cn(
                    "group flex h-full flex-col items-center gap-1.5 rounded-md border p-2 text-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pool-blue focus-visible:ring-offset-2 focus-visible:ring-offset-paper sm:flex-row sm:items-center sm:gap-2.5 sm:p-3 sm:text-left",
                    active
                      ? "border-pool-deep bg-pool-deep/5 shadow-elev-2"
                      : "border-ink-300 bg-paper-card hover:border-pool-blue hover:bg-pool-foam/40",
                  )}
                >
                  <span
                    className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md sm:h-10 sm:w-10"
                    style={{ backgroundColor: tab.bg }}
                  >
                    <Pictogram
                      aria-hidden="true"
                      className="h-5 w-5 sm:h-6 sm:w-6"
                      accent={tab.pictogramAccent}
                      style={{ color: "#FFFFFF" } as React.CSSProperties}
                    />
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <span
                      className={cn(
                        "truncate font-display text-[10px] font-extrabold leading-tight sm:text-sm",
                        active ? "text-pool-deep" : "text-ink-900",
                      )}
                    >
                      {tab.label}
                    </span>
                    <span className="hidden truncate text-[11px] leading-tight text-ink-600 sm:block">
                      {tab.description}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
