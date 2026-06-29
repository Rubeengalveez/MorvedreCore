import Link from "next/link";
import type { Route } from "next";

import { createClient } from "@/lib/supabase/server";
import { Eyebrow } from "@/components/ui/eyebrow";
import { LanePattern } from "@/components/ui/lane-pattern";
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
import { getActiveProfileContext } from "@/server/queries/active-profile";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Panel admin — Morvedre Core",
};

type Counts = {
  seasons: number;
  teams: number;
  players: number;
  matchesPlayed: number;
};

async function loadCounts(): Promise<Counts> {
  const supabase = await createClient();

  const [
    { count: seasonCount },
    { count: teamCount },
    { data: rosterData },
    { count: matchesPlayed },
  ] = await Promise.all([
    supabase.from("seasons").select("id", { count: "exact", head: true }),
    supabase.from("teams").select("id", { count: "exact", head: true }),
    supabase.from("team_rosters").select("player_id").is("left_at", null),
    supabase
      .from("matches")
      .select("id", { count: "exact", head: true })
      .eq("status", "played"),
  ]);

  const playerIds = new Set<string>();
  for (const row of rosterData ?? []) {
    playerIds.add((row as { player_id: string }).player_id);
  }

  return {
    seasons: seasonCount ?? 0,
    teams: teamCount ?? 0,
    players: playerIds.size,
    matchesPlayed: matchesPlayed ?? 0,
  };
}

interface AdminTile {
  href: string;
  label: string;
  description: string;
  Pictogram: React.ComponentType<PictogramProps>;
  bg: string;
  pictogramAccent: string;
}

const QUICK_ACTIONS: ReadonlyArray<AdminTile> = [
  {
    href: "/admin/trainings",
    label: "Nuevo entrenamiento",
    description: "Planifica un bloque o sesión.",
    Pictogram: Silbato,
    bg: "var(--pool-teal)",
    pictogramAccent: "var(--ball-gold)",
  },
  {
    href: "/admin/matches",
    label: "Nuevo partido",
    description: "Crea convocatoria y acta.",
    Pictogram: Balon,
    bg: "var(--goggle-red)",
    pictogramAccent: "var(--ball-gold)",
  },
  {
    href: "/admin/players/import",
    label: "Importar jugadores",
    description: "Carga desde Excel en minutos.",
    Pictogram: FileUp,
    bg: "var(--ball-gold)",
    pictogramAccent: "var(--pool-deep)",
  },
];

const ADMIN_MODULES: ReadonlyArray<AdminTile> = [
  {
    href: "/admin/seasons",
    label: "Temporadas",
    description: "Crea y archiva.",
    Pictogram: Calendario,
    bg: "var(--pool-teal)",
    pictogramAccent: "var(--ball-gold)",
  },
  {
    href: "/admin/teams",
    label: "Equipos",
    description: "Configura plantillas.",
    Pictogram: Equipo,
    bg: "var(--pool-blue)",
    pictogramAccent: "var(--ball-gold)",
  },
  {
    href: "/admin/players",
    label: "Jugadores",
    description: "Altas y ediciones.",
    Pictogram: Gorro,
    bg: "var(--ball-gold)",
    pictogramAccent: "var(--pool-deep)",
  },
  {
    href: "/admin/families",
    label: "Familias",
    description: "Tutores vinculados.",
    Pictogram: Familia,
    bg: "var(--pool-deep)",
    pictogramAccent: "var(--ball-gold)",
  },
  {
    href: "/admin/staff",
    label: "Personal",
    description: "Entrenadores y más.",
    Pictogram: Personal,
    bg: "var(--ink-700)",
    pictogramAccent: "var(--ball-gold)",
  },
  {
    href: "/admin/trainings",
    label: "Entrenamientos",
    description: "Bloques y asistencia.",
    Pictogram: Silbato,
    bg: "var(--action)",
    pictogramAccent: "var(--ball-gold)",
  },
  {
    href: "/admin/matches",
    label: "Partidos",
    description: "Convocatorias y actas.",
    Pictogram: Balon,
    bg: "var(--goggle-red)",
    pictogramAccent: "var(--ball-gold)",
  },
  {
    href: "/admin/players/import",
    label: "Importar",
    description: "Carga desde Excel.",
    Pictogram: FileUp,
    bg: "var(--pool-teal)",
    pictogramAccent: "var(--ball-gold)",
  },
];

function buildGreeting(now: Date, firstName: string): string {
  const hour = now.getHours();
  if (hour < 12) return `Buenos días, ${firstName}.`;
  if (hour < 20) return `Buenas tardes, ${firstName}.`;
  return `Buenas noches, ${firstName}.`;
}

export default async function AdminHomePage() {
  const [counts, ctx] = await Promise.all([loadCounts(), getActiveProfileContext()]);
  const activeProfileName = ctx?.activeProfile.full_name ?? "Admin";
  const firstName = activeProfileName.split(/\s+/)[0] ?? activeProfileName ?? "Admin";
  const now = new Date();
  const greeting = buildGreeting(now, firstName);

  return (
    <div className="relative">
      <LanePattern as="div" className="absolute inset-0" />
      <div className="relative z-[1] mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-4">
        <header
          data-admin-hero
          className="flex items-center gap-3 overflow-hidden rounded-md border border-pool-deep bg-pool-deep p-4 text-paper"
        >
          <div
            aria-hidden="true"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-ball-gold"
          >
            <Silbato
              className="h-7 w-7"
              style={{ color: "var(--pool-deep)" }}
            />
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <Eyebrow tone="inverse" className="text-paper/80">
              Centro de mando
            </Eyebrow>
            <h1 className="font-display text-2xl font-extrabold leading-tight text-paper sm:text-3xl">
              {greeting}
            </h1>
            <p className="text-xs text-paper/80 sm:text-sm">
              Eres admin. Aquí mueves el club.
            </p>
          </div>
        </header>

        <section
          aria-labelledby="admin-quick-actions-heading"
          className="flex flex-col gap-2"
        >
          <h2 id="admin-quick-actions-heading" className="text-eyebrow text-ink-600">
            Acciones rápidas
          </h2>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {QUICK_ACTIONS.map((a) => {
              const { Pictogram } = a;
              return (
                <li key={a.href} className="h-full">
                  <Link
                    href={a.href as Route}
                    data-quick-action={a.href}
                    className="group flex h-full items-center gap-3 rounded-md border border-ink-300 bg-paper-card p-3 transition-all hover:-translate-y-0.5 hover:border-pool-deep hover:shadow-elev-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pool-blue focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
                  >
                    <span
                      aria-hidden="true"
                      className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-md"
                      style={{ backgroundColor: a.bg }}
                    >
                      <Pictogram
                        className="h-7 w-7"
                        accent={a.pictogramAccent}
                        style={{ color: "#FFFFFF" }}
                      />
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="font-display text-sm font-extrabold leading-tight text-pool-deep">
                        {a.label}
                      </span>
                      <span className="line-clamp-1 text-[11px] leading-snug text-ink-600">
                        {a.description}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>

        <section
          aria-labelledby="admin-stats-heading"
          className="grid grid-cols-2 gap-3 sm:grid-cols-4"
        >
          <h2 id="admin-stats-heading" className="sr-only">
            Resumen del club
          </h2>
          <Stat
            label="Temporadas"
            value={String(counts.seasons)}
            color="var(--pool-teal)"
          />
          <Stat
            label="Equipos"
            value={String(counts.teams)}
            color="var(--pool-blue)"
          />
          <Stat
            label="Jugadores"
            value={String(counts.players)}
            color="var(--ball-gold)"
          />
          <Stat
            label="Partidos"
            value={String(counts.matchesPlayed)}
            color="var(--goggle-red)"
          />
        </section>

        <section
          aria-labelledby="admin-modules-heading"
          className="flex flex-col gap-2"
        >
          <h2 id="admin-modules-heading" className="text-eyebrow text-ink-600">
            Secciones
          </h2>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {ADMIN_MODULES.map((m) => {
              const { Pictogram } = m;
              return (
                <li key={m.href} className="h-full">
                  <Link
                    href={m.href as Route}
                    className="group flex h-full flex-col items-center gap-2 rounded-md border border-ink-300 bg-paper-card p-3 text-center transition-all hover:-translate-y-0.5 hover:border-pool-deep hover:shadow-elev-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pool-blue focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
                  >
                    <span
                      aria-hidden="true"
                      className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-md"
                      style={{ backgroundColor: m.bg }}
                    >
                      <Pictogram
                        className="h-7 w-7"
                        accent={m.pictogramAccent}
                        style={{ color: "#FFFFFF" }}
                      />
                    </span>
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className="font-display text-sm font-extrabold leading-tight text-pool-deep">
                        {m.label}
                      </span>
                      <span className="line-clamp-2 text-[11px] leading-snug text-ink-600">
                        {m.description}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div
      data-stat
      className="flex flex-col gap-1 rounded-md border border-ink-300 bg-paper-card p-3"
      style={{ borderTopWidth: "3px", borderTopColor: color }}
    >
      <span className="text-[10px] font-bold uppercase tracking-wider text-ink-600">
        {label}
      </span>
      <span className="font-display text-2xl font-extrabold leading-none text-pool-deep tabular-nums">
        {value}
      </span>
    </div>
  );
}
