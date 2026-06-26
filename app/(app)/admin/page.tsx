import Link from "next/link";
import type { Route } from "next";
import { ArrowRight, Users, Shield, UserPlus, FileUp, CalendarRange } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { CATEGORY_LABELS, type CategoryCode } from "@/lib/domain/categories";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Panel admin — Morvedre Core",
};

type Counts = {
  seasons: number;
  currentSeasonLabel: string | null;
  teams: number;
  players: number;
  parents: number;
  staff: number;
  byCategory: Array<{ code: CategoryCode; count: number }>;
};

async function loadCounts(): Promise<Counts> {
  const supabase = await createClient();

  const [{ count: seasonCount }, { data: currentSeasonData }, { count: teamCount }, { data: rosterData }, { data: staffData }, { data: linkData }] =
    await Promise.all([
      supabase.from("seasons").select("id", { count: "exact", head: true }),
      supabase.from("seasons").select("label").eq("is_current", true).maybeSingle(),
      supabase.from("teams").select("id", { count: "exact", head: true }),
      supabase
        .from("team_rosters")
        .select("player_id, teams!team_rosters_team_id_fkey(category_code)")
        .is("left_at", null),
      supabase.from("team_staff").select("profile_id"),
      supabase.from("parent_child_links").select("parent_profile_id"),
    ]);

  const byCategoryMap = new Map<CategoryCode, number>();
  const playerIds = new Set<string>();
  for (const row of rosterData ?? []) {
    const teamRaw = (row as { teams: unknown }).teams;
    const team = Array.isArray(teamRaw) ? teamRaw[0] : teamRaw;
    const code = (team as { category_code?: CategoryCode } | null)?.category_code;
    if (code) {
      byCategoryMap.set(code, (byCategoryMap.get(code) ?? 0) + 1);
    }
    const pid = (row as { player_id: string }).player_id;
    playerIds.add(pid);
  }

  const byCategory: Array<{ code: CategoryCode; count: number }> = (
    ["benjamin", "alevin", "infantil", "cadete", "juvenil", "absoluto", "escuela"] as CategoryCode[]
  )
    .map((code) => ({ code, count: byCategoryMap.get(code) ?? 0 }))
    .filter((row) => row.count > 0);

  return {
    seasons: seasonCount ?? 0,
    currentSeasonLabel: currentSeasonData?.label ?? null,
    teams: teamCount ?? 0,
    players: playerIds.size,
    parents: new Set((linkData ?? []).map((r) => (r as { parent_profile_id: string }).parent_profile_id)).size,
    staff: new Set((staffData ?? []).map((s) => (s as { profile_id: string }).profile_id)).size,
    byCategory,
  };
}

const SHORTCUTS = [
  {
    href: "/admin/seasons",
    title: "Temporadas",
    description: "Crea y archiva las temporadas del club.",
    Icon: CalendarRange,
  },
  {
    href: "/admin/teams",
    title: "Equipos",
    description: "Configura los equipos y asigna plantilla.",
    Icon: Shield,
  },
  {
    href: "/admin/players",
    title: "Jugadores",
    description: "Alta, edición y búsqueda de jugadores.",
    Icon: Users,
  },
  {
    href: "/admin/families",
    title: "Familias",
    description: "Vincula padres y tutores con jugadores.",
    Icon: UserPlus,
  },
  {
    href: "/admin/staff",
    title: "Personal",
    description: "Asignaciones de entrenadores y delegados.",
    Icon: Users,
  },
  {
    href: "/admin/players/import",
    title: "Importar",
    description: "Carga jugadores desde un Excel.",
    Icon: FileUp,
  },
] as const;

export default async function AdminHomePage() {
  const counts = await loadCounts();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-4">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-brand-deep">
          Panel de administración
        </h1>
        <p className="text-sm leading-relaxed text-ink-600">
          Gestiona la estructura deportiva del club. Empieza creando la temporada
          actual si aún no la tienes.
        </p>
      </header>

      <section
        aria-labelledby="admin-stats-heading"
        className="rounded-md border border-ink-300 bg-paper p-4"
      >
        <h2
          id="admin-stats-heading"
          className="font-display text-base font-bold text-brand-deep"
        >
          Resumen
        </h2>
        <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Stat
            label="Temporada actual"
            value={counts.currentSeasonLabel ?? "—"}
            hint={
              counts.seasons > 0
                ? `${counts.seasons} en total`
                : "Crea la primera"
            }
          />
          <Stat label="Equipos" value={String(counts.teams)} />
          <Stat label="Jugadores" value={String(counts.players)} />
          <Stat label="Familias" value={String(counts.parents)} />
          <Stat label="Personal" value={String(counts.staff)} />
        </dl>
        {counts.byCategory.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {counts.byCategory.map((c) => (
              <span
                key={c.code}
                className="inline-flex h-6 items-center gap-1.5 rounded-full border border-ink-300 bg-paper px-2.5 text-[11px] font-semibold text-ink-900"
              >
                {CATEGORY_LABELS[c.code]}
                <span className="font-mono text-[10px] text-ink-600">{c.count}</span>
              </span>
            ))}
          </div>
        ) : null}
      </section>

      <section
        aria-labelledby="admin-shortcuts-heading"
        className="flex flex-col gap-2"
      >
        <h2
          id="admin-shortcuts-heading"
          className="font-display text-base font-bold text-brand-deep"
        >
          Accesos rápidos
        </h2>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {SHORTCUTS.map(({ href, title, description, Icon }) => (
            <Link
              key={href}
              href={href as Route}
              className="group flex items-start gap-3 rounded-md border border-ink-300 bg-paper p-3 transition-colors hover:border-brand-blue hover:bg-brand-foam focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-brand-foam text-brand-deep">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="flex flex-1 flex-col gap-0.5">
                <span className="font-display text-sm font-bold text-brand-deep">
                  {title}
                </span>
                <span className="text-xs leading-snug text-ink-600">
                  {description}
                </span>
              </span>
              <ArrowRight
                className="mt-1 h-4 w-4 shrink-0 text-ink-600 transition-transform group-hover:translate-x-0.5 group-hover:text-brand-blue"
                aria-hidden="true"
              />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs font-semibold uppercase tracking-wider text-ink-600">
        {label}
      </dt>
      <dd className="font-display text-2xl font-extrabold text-brand-deep">
        {value}
      </dd>
      {hint ? <dd className="text-xs text-ink-600">{hint}</dd> : null}
    </div>
  );
}
