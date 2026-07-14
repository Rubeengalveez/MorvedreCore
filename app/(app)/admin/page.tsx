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
  MdNewspaper,
  MdStorefront,
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
}

const ADMIN_MODULES: ReadonlyArray<AdminTile> = [
  {
    href: "/admin/seasons",
    label: "Temporadas",
    description: "Crea y archiva.",
    Icon: MdCalendarMonth,
  },
  {
    href: "/admin/teams",
    label: "Equipos",
    description: "Configura plantillas.",
    Icon: MdGroups,
  },
  {
    href: "/admin/players",
    label: "Jugadores",
    description: "Altas y ediciones.",
    Icon: MdPerson,
  },
  {
    href: "/admin/families",
    label: "Familias",
    description: "Tutores vinculados.",
    Icon: MdFamilyRestroom,
  },
  {
    href: "/admin/staff",
    label: "Personal",
    description: "Entrenadores y más.",
    Icon: MdBadge,
  },
  {
    href: "/admin/trainings",
    label: "Entrenamientos",
    description: "Bloques y asistencia.",
    Icon: MdSports,
  },
  {
    href: "/admin/matches",
    label: "Partidos",
    description: "Convocatorias y actas.",
    Icon: MdSportsVolleyball,
  },
  {
    href: "/admin/treasury",
    label: "Tesoreria",
    description: "Cierres y pagos.",
    Icon: MdEuro,
  },
  {
    href: "/admin/players/import",
    label: "Importar",
    description: "Carga desde Excel.",
    Icon: MdUploadFile,
  },
  {
    href: "/admin/news",
    label: "Noticias",
    description: "Publica avisos del club.",
    Icon: MdNewspaper,
  },
  {
    href: "/admin/shop",
    label: "Tienda",
    description: "Gestiona pedidos y productos.",
    Icon: MdStorefront,
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
        <header data-admin-hero className="border-ink-200 flex items-center gap-3 border-b pb-4">
          <div
            aria-hidden="true"
            className="bg-pool-foam text-pool-deep flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
          >
            <MdSports className="h-6 w-6" />
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <Eyebrow>Centro de mando</Eyebrow>
            <h1 className="font-display text-pool-deep text-xl leading-tight font-extrabold sm:text-2xl">
              {greeting}
            </h1>
            <p className="text-ink-500 text-sm">Organiza el club desde un único lugar.</p>
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
                    className="group border-ink-200 bg-paper-card shadow-elev-1 hover:border-pool-blue/40 hover:shadow-elev-2 focus-visible:ring-pool-blue flex h-full min-h-[5rem] touch-manipulation items-center gap-3 rounded-2xl border p-4 transition-[border-color,box-shadow,transform] duration-200 focus-visible:ring-2 focus-visible:outline-none active:scale-[0.99] motion-reduce:transition-none"
                  >
                    <span
                      aria-hidden="true"
                      className="bg-pool-foam text-pool-blue inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
                    >
                      <Icon className="h-7 w-7" />
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="font-display text-pool-deep text-base leading-tight font-extrabold">
                        {m.label}
                      </span>
                      <span className="text-ink-600 mt-1 line-clamp-2 text-sm leading-snug">
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
      className="border-ink-200 bg-paper-card shadow-elev-1 flex flex-col gap-1 rounded-xl border p-3.5"
      style={{ borderTopWidth: "3px", borderTopColor: color }}
    >
      <span className="text-eyebrow text-ink-600">{label}</span>
      <span className="font-display text-pool-deep text-2xl leading-none font-extrabold tabular-nums">
        {value}
      </span>
    </div>
  );
}
