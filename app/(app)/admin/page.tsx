import Link from "next/link";
import type { Route } from "next";
import {
  MdSports,
  MdSportsVolleyball,
  MdUploadFile,
  MdCalendarMonth,
  MdGroups,
  MdPerson,
  MdFamilyRestroom,
  MdBadge,
  MdEuro,
} from "react-icons/md";

import { createClient } from "@/lib/supabase/server";
import { Eyebrow } from "@/components/ui/eyebrow";
import { LanePattern } from "@/components/ui/lane-pattern";
import { PageShell, SectionHeader } from "@/components/ui/page-shell";
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
    supabase.from("matches").select("id", { count: "exact", head: true }).eq("status", "played"),
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
  Icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  bg: string;
}

const ADMIN_MODULES: ReadonlyArray<AdminTile> = [
  {
    href: "/admin/seasons",
    label: "Temporadas",
    description: "Crea y archiva.",
    Icon: MdCalendarMonth,
    bg: "var(--pool-teal)",
  },
  {
    href: "/admin/teams",
    label: "Equipos",
    description: "Configura plantillas.",
    Icon: MdGroups,
    bg: "var(--pool-blue)",
  },
  {
    href: "/admin/players",
    label: "Jugadores",
    description: "Altas y ediciones.",
    Icon: MdPerson,
    bg: "var(--ball-gold)",
  },
  {
    href: "/admin/families",
    label: "Familias",
    description: "Tutores vinculados.",
    Icon: MdFamilyRestroom,
    bg: "var(--pool-deep)",
  },
  {
    href: "/admin/staff",
    label: "Personal",
    description: "Entrenadores y más.",
    Icon: MdBadge,
    bg: "var(--ink-700)",
  },
  {
    href: "/admin/trainings",
    label: "Entrenamientos",
    description: "Bloques y asistencia.",
    Icon: MdSports,
    bg: "var(--action)",
  },
  {
    href: "/admin/matches",
    label: "Partidos",
    description: "Convocatorias y actas.",
    Icon: MdSportsVolleyball,
    bg: "var(--goggle-red)",
  },
  {
    href: "/admin/treasury",
    label: "Tesoreria",
    description: "Cierres y pagos.",
    Icon: MdEuro,
    bg: "var(--pool-deep)",
  },
  {
    href: "/admin/players/import",
    label: "Importar",
    description: "Carga desde Excel.",
    Icon: MdUploadFile,
    bg: "var(--pool-teal)",
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
      <LanePattern as="div" className="absolute inset-0 opacity-70" />
      <PageShell width="md">
        <header
          data-admin-hero
          className="surface border-pool-deep bg-pool-deep text-paper shadow-elev-3 flex items-center gap-3 overflow-hidden rounded-lg p-4"
        >
          <div
            aria-hidden="true"
            className="bg-ball-gold flex h-12 w-12 shrink-0 items-center justify-center rounded-md"
          >
            <MdSports className="text-pool-deep h-7 w-7" />
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <Eyebrow tone="inverse" className="text-paper/80">
              Centro de mando
            </Eyebrow>
            <h1 className="font-display text-paper text-2xl leading-tight font-extrabold sm:text-3xl">
              {greeting}
            </h1>
            <p className="text-paper/80 text-xs sm:text-sm">Eres admin. Aquí mueves el club.</p>
          </div>
        </header>

        <section
          aria-labelledby="admin-stats-heading"
          className="grid grid-cols-2 gap-3 sm:grid-cols-4"
        >
          <h2 id="admin-stats-heading" className="sr-only">
            Resumen del club
          </h2>
          <Stat label="Temporadas" value={String(counts.seasons)} color="var(--pool-teal)" />
          <Stat label="Equipos" value={String(counts.teams)} color="var(--pool-blue)" />
          <Stat label="Jugadores" value={String(counts.players)} color="var(--ball-gold)" />
          <Stat label="Partidos" value={String(counts.matchesPlayed)} color="var(--goggle-red)" />
        </section>

        <section aria-labelledby="admin-modules-heading" className="flex flex-col gap-2">
          <SectionHeader id="admin-modules-heading" title="Secciones" />
          <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {ADMIN_MODULES.map((m) => {
              const { Icon } = m;
              return (
                <li key={m.href} className="h-full">
                  <Link
                    href={m.href as Route}
                    className="group border-ink-300 bg-paper-card shadow-elev-1 hover:border-pool-blue hover:shadow-elev-2 focus-visible:ring-pool-blue flex h-full items-center gap-3 rounded-lg border p-3 transition-all focus-visible:ring-2 focus-visible:outline-none"
                  >
                    <span
                      aria-hidden="true"
                      className="text-paper inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-md"
                      style={{ backgroundColor: m.bg }}
                    >
                      <Icon className="h-7 w-7" />
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="font-display text-pool-deep text-sm leading-tight font-extrabold">
                        {m.label}
                      </span>
                      <span className="text-ink-600 line-clamp-1 text-[11px] leading-snug">
                        {m.description}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      </PageShell>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div
      data-stat
      className="border-ink-300 bg-paper-card shadow-elev-1 flex flex-col gap-1 rounded-lg border p-3"
      style={{ borderTopWidth: "3px", borderTopColor: color }}
    >
      <span className="text-eyebrow text-ink-600">{label}</span>
      <span className="font-display text-pool-deep text-2xl leading-none font-extrabold tabular-nums">
        {value}
      </span>
    </div>
  );
}
