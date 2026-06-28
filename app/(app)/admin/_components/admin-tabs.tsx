"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import { useMemo } from "react";

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
  accent: string;
}

const TABS: AdminTab[] = [
  {
    id: "seasons",
    href: "/admin/seasons",
    label: "Temporadas",
    description: "Crea y archiva temporadas.",
    Pictogram: Calendario,
    accent: "#0E8C8E",
  },
  {
    id: "teams",
    href: "/admin/teams",
    label: "Equipos",
    description: "Configura equipos y dorsales.",
    Pictogram: Equipo,
    accent: "#1657A8",
  },
  {
    id: "players",
    href: "/admin/players",
    label: "Jugadores",
    description: "Altas, ediciones y asignaciones.",
    Pictogram: Gorro,
    accent: "#F4C430",
  },
  {
    id: "families",
    href: "/admin/families",
    label: "Familias",
    description: "Vínculos entre tutores y jugadores.",
    Pictogram: Familia,
    accent: "#0A2E5C",
  },
  {
    id: "staff",
    href: "/admin/staff",
    label: "Personal",
    description: "Entrenadores y delegados.",
    Pictogram: Personal,
    accent: "#062048",
  },
  {
    id: "trainings",
    href: "/admin/trainings",
    label: "Entrenamientos",
    description: "Bloques y asistencia.",
    Pictogram: Silbato,
    accent: "#FF6B35",
  },
  {
    id: "matches",
    href: "/admin/matches",
    label: "Partidos",
    description: "Convocatorias y actas.",
    Pictogram: Balon,
    accent: "#D63B2F",
  },
  {
    id: "import",
    href: "/admin/players/import",
    label: "Importar",
    description: "Carga jugadores desde Excel.",
    Pictogram: FileUp,
    accent: "#0E8C8E",
  },
];

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminTabs() {
  const pathname = usePathname();

  const orderedIds = useMemo(() => TABS.map((t) => t.id), []);

  return (
    <nav
      aria-label="Secciones de administración"
      data-admin-tabs
      className="sticky top-[60px] z-20 border-b border-ink-300 bg-paper"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.35] [background-image:repeating-linear-gradient(to_right,var(--pool-deep)_0,var(--pool-deep)_1px,transparent_1px,transparent_18%)]"
      />

      <div className="mx-auto max-w-3xl sm:hidden">
        <ul
          className="no-scrollbar flex gap-1 overflow-x-auto px-2 py-2"
          role="tablist"
        >
          {TABS.map((tab) => {
            const active = isActive(pathname, tab.href);
            const { Pictogram } = tab;
            return (
              <li key={tab.id} className="shrink-0">
                <Link
                  href={tab.href as Route}
                  role="tab"
                  aria-selected={active}
                  data-tab-id={tab.id}
                  className={cn(
                    "group inline-flex h-12 min-h-12 items-center gap-2 whitespace-nowrap rounded-md border px-3 font-display text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pool-blue focus-visible:ring-offset-2 focus-visible:ring-offset-paper",
                    active
                      ? "border-pool-deep bg-pool-deep text-paper shadow-elev-2"
                      : "border-transparent bg-paper-card text-ink-700 hover:border-ink-300 hover:bg-pool-foam/40",
                  )}
                >
                  <span
                    className={cn(
                      "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                      active ? "bg-ball-gold" : "bg-pool-foam",
                    )}
                  >
                    <Pictogram
                      aria-hidden="true"
                      className="h-4 w-4"
                      style={
                        active
                          ? ({ color: "var(--pool-deep)" } as React.CSSProperties)
                          : ({ color: tab.accent } as React.CSSProperties)
                      }
                    />
                  </span>
                  <span className="text-sm">{tab.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      <div
        data-admin-tabs-grid
        className="mx-auto hidden max-w-3xl px-4 py-3 sm:block"
      >
        <ul
          className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4"
          role="tablist"
        >
          {TABS.map((tab) => {
            const active = isActive(pathname, tab.href);
            const { Pictogram } = tab;
            const inOrder = orderedIds.indexOf(tab.id);
            const isFirst = inOrder === 0;
            return (
              <li key={tab.id}>
                <Link
                  href={tab.href as Route}
                  role="tab"
                  aria-selected={active}
                  data-tab-id={tab.id}
                  className={cn(
                    "group flex h-full items-center gap-2.5 rounded-md border p-2.5 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pool-blue focus-visible:ring-offset-2 focus-visible:ring-offset-paper",
                    active
                      ? "border-pool-deep bg-pool-deep/5 shadow-elev-2"
                      : "border-ink-300 bg-paper-card hover:border-pool-blue hover:bg-pool-foam/40",
                    isFirst && "col-span-2 sm:col-span-1",
                  )}
                >
                  <span
                    className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md"
                    style={{ backgroundColor: tab.accent }}
                  >
                    <Pictogram
                      aria-hidden="true"
                      className="h-5 w-5"
                      style={{ color: "#FFFFFF" } as React.CSSProperties}
                    />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span
                      className={cn(
                        "truncate font-display text-sm font-extrabold leading-tight",
                        active ? "text-pool-deep" : "text-ink-900",
                      )}
                    >
                      {tab.label}
                    </span>
                    <span className="truncate text-[11px] leading-tight text-ink-600">
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
