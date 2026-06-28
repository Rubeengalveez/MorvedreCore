import Link from "next/link";
import type { Route } from "next";
import {
  Calendar,
  Users,
  User,
  UsersRound,
  ShieldCheck,
  ClipboardList,
  Trophy,
  Upload,
} from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { Avatar } from "@/components/ui/avatar";
import { Eyebrow } from "@/components/ui/eyebrow";
import { LanePattern } from "@/components/ui/lane-pattern";
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
    supabase
      .from("team_rosters")
      .select("player_id")
      .is("left_at", null),
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

interface AdminModule {
  href: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

const ADMIN_MODULES: ReadonlyArray<AdminModule> = [
  {
    href: "/admin/seasons",
    label: "Temporadas",
    description: "Crea y gestiona los periodos deportivos, marcas e historiales.",
    icon: Calendar,
    color: "bg-[#00A896]", // Teal
  },
  {
    href: "/admin/teams",
    label: "Equipos",
    description: "Configura las categorías, plantillas y asignaciones de ligas.",
    icon: Users,
    color: "bg-[#0A2E5C]", // Deep blue
  },
  {
    href: "/admin/players",
    label: "Jugadores",
    description: "Altas, bajas, fichas, historiales y dorsales oficiales.",
    icon: User,
    color: "bg-[#FF6B35]", // Orange
  },
  {
    href: "/admin/families",
    label: "Familias",
    description: "Vincula tutores legales, cuentas asociadas y contactos.",
    icon: UsersRound,
    color: "bg-[#2EC4B6]", // Light Teal
  },
  {
    href: "/admin/staff",
    label: "Personal",
    description: "Asigna roles de entrenadores, directiva, delegados y tienda.",
    icon: ShieldCheck,
    color: "bg-[#1E293B]", // Slate
  },
  {
    href: "/admin/trainings",
    label: "Entrenamientos",
    description: "Planifica bloques semanales, horarios de sesiones y asistencia.",
    icon: ClipboardList,
    color: "bg-[#10B981]", // Green
  },
  {
    href: "/admin/matches",
    label: "Partidos",
    description: "Registra convocatorias, convoca sugeridos y acta del partido.",
    icon: Trophy,
    color: "bg-[#EF4444]", // Red
  },
  {
    href: "/admin/players/import",
    label: "Importar",
    description: "Carga plantillas completas de jugadores y familias vía Excel.",
    icon: Upload,
    color: "bg-[#F4C430]", // Gold
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
      <LanePattern as="div" className="absolute inset-0" strong />
      <div className="relative z-[1] mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-4">
        {/* Banner principal */}
        <header
          data-admin-hero
          className="flex items-center gap-3 overflow-hidden rounded-md border border-ink-300 bg-pool-deep p-4 text-paper shadow-elev-3 sm:p-5"
        >
          <Avatar
            name={activeProfileName || "Admin"}
            size={56}
            teamColor="var(--ball-gold)"
          />
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <Eyebrow tone="inverse" className="text-paper/80">
              Centro de mando
            </Eyebrow>
            <h1 className="font-display text-2xl font-extrabold leading-tight text-paper sm:text-3xl">
              {greeting}
            </h1>
            <p className="text-xs text-paper/80 sm:text-sm">
              Panel de gestión y administración de la plataforma.
            </p>
          </div>
        </header>

        {/* Resumen estadístico */}
        <section
          aria-labelledby="admin-stats-heading"
          className="grid grid-cols-2 gap-2 sm:grid-cols-4"
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
            label="Partidos jugados"
            value={String(counts.matchesPlayed)}
            color="var(--goggle-red)"
          />
        </section>

        {/* Módulos de Administración */}
        <section
          aria-labelledby="admin-modules-heading"
          className="flex flex-col gap-2"
        >
          <h2
            id="admin-modules-heading"
            className="text-[10px] font-bold uppercase tracking-wider text-ink-600"
          >
            Módulos de Gestión
          </h2>
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {ADMIN_MODULES.map((m) => {
              const Icon = m.icon;
              return (
                <li key={m.href} className="h-full">
                  <Link
                    href={m.href as Route}
                    className="group flex h-full items-start gap-3.5 rounded-md border border-ink-300 bg-paper p-4 shadow-elev-1 transition-all hover:-translate-y-0.5 hover:border-pool-deep hover:shadow-elev-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pool-blue focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
                  >
                    <span
                      aria-hidden="true"
                      className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md ${m.color} text-paper shadow-sm transition-transform group-hover:scale-105`}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="font-display text-sm font-extrabold leading-tight text-pool-deep">
                        {m.label}
                      </span>
                      <span className="text-[11px] leading-snug text-ink-600">
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
      className="flex flex-col gap-1 rounded-md border border-ink-300 bg-paper-card p-3 shadow-elev-1"
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
