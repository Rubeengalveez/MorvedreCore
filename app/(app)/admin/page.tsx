import Link from "next/link";
import type { Route } from "next";
import {
  ArrowRight,
  Users,
  Shield,
  UserPlus,
  FileUp,
  CalendarRange,
  Trophy,
  Volleyball,
  Clock,
  Bell,
  ChevronRight,
} from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { Silbato } from "@/components/brand/pictograms";
import { CATEGORY_LABELS, type CategoryCode } from "@/lib/domain/categories";
import { getActiveProfileContext } from "@/server/queries/active-profile";
import {
  getNotificationsForProfile,
  getUnreadNotificationsCount,
  type NotificationItem,
} from "@/server/queries/notifications";

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

interface TodayEvent {
  id: string;
  kind: "training" | "match";
  scheduled_at: string;
  title: string;
  team_label: string;
  team_color: string;
}

async function loadTodayEvents(): Promise<{
  events: TodayEvent[];
  unread: number;
  notifications: NotificationItem[];
}> {
  const supabase = await createClient();
  const ctx = await getActiveProfileContext();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);

  if (!ctx) {
    return { events: [], unread: 0, notifications: [] };
  }

  const [trainingsRes, matchesRes, unread, notifications] = await Promise.all([
    supabase
      .from("training_sessions")
      .select("id, scheduled_at, teams!training_sessions_team_id_fkey(label, color)")
      .gte("scheduled_at", todayStart.toISOString())
      .lt("scheduled_at", tomorrowStart.toISOString())
      .eq("cancelled", false)
      .order("scheduled_at", { ascending: true })
      .limit(5),
    supabase
      .from("matches")
      .select("id, scheduled_at, opponent, teams!matches_team_id_fkey(label, color)")
      .gte("scheduled_at", todayStart.toISOString())
      .lt("scheduled_at", tomorrowStart.toISOString())
      .order("scheduled_at", { ascending: true })
      .limit(5),
    getUnreadNotificationsCount(ctx.activeProfile.id).catch(() => 0),
    getNotificationsForProfile(ctx.activeProfile.id, 3).catch(
      () => [] as NotificationItem[],
    ),
  ]);

  const events: TodayEvent[] = [];
  for (const t of trainingsRes.data ?? []) {
    const tr = t as { id: string; scheduled_at: string; teams: unknown };
    const team = Array.isArray(tr.teams) ? tr.teams[0] : tr.teams;
    const teamObj = team as { label?: string; color?: string } | null;
    events.push({
      id: tr.id,
      kind: "training",
      scheduled_at: tr.scheduled_at,
      title: `Entreno ${teamObj?.label ?? ""}`,
      team_label: teamObj?.label ?? "",
      team_color: teamObj?.color ?? "var(--brand-blue)",
    });
  }
  for (const m of matchesRes.data ?? []) {
    const mr = m as { id: string; scheduled_at: string; opponent: string; teams: unknown };
    const team = Array.isArray(mr.teams) ? mr.teams[0] : mr.teams;
    const teamObj = team as { label?: string; color?: string } | null;
    events.push({
      id: mr.id,
      kind: "match",
      scheduled_at: mr.scheduled_at,
      title: `${teamObj?.label ?? ""} vs ${mr.opponent}`,
      team_label: teamObj?.label ?? "",
      team_color: teamObj?.color ?? "var(--brand-action)",
    });
  }
  events.sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at));
  return { events, unread, notifications };
}

const QUICK_SHORTCUTS = [
  { href: "/admin/teams", title: "Equipos", Icon: Shield },
  { href: "/admin/players", title: "Jugadores", Icon: UserPlus },
  { href: "/admin/families", title: "Familias", Icon: Users },
  { href: "/admin/staff", title: "Personal", Icon: Users },
] as const;

const SPORTS_SHORTCUTS = [
  { href: "/admin/trainings", title: "Entrenamientos", Icon: Volleyball, description: "Bloques, sesiones y lista de asistencia." },
  { href: "/admin/matches", title: "Partidos", Icon: Trophy, description: "Convocatorias, actas y resultados." },
  { href: "/admin/seasons", title: "Temporadas", Icon: CalendarRange, description: "Crea y archiva las temporadas del club." },
  { href: "/admin/players/import", title: "Importar Excel", Icon: FileUp, description: "Carga jugadores desde un Excel." },
] as const;

export default async function AdminHomePage() {
  const [counts, today] = await Promise.all([loadCounts(), loadTodayEvents()]);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-4">
      <header
        className="flex items-center gap-3 rounded-md border border-ink-300 bg-paper p-4"
        style={{
          borderLeftWidth: "4px",
          borderLeftColor: "var(--brand-action)",
        }}
      >
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
          style={{ backgroundColor: "var(--brand-action)" }}
        >
          <Silbato className="h-6 w-6" style={{ color: "var(--paper)" }} />
        </span>
        <div className="flex flex-1 flex-col">
          <p className="text-[10px] font-bold uppercase tracking-wider text-ink-600">
            Panel de administración
          </p>
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-brand-deep">
            Tu día en el club
          </h1>
          <p className="text-xs text-ink-600">
            Gestiona la estructura deportiva del club.
          </p>
        </div>
        <Link
          href={"/notifications" as Route}
          className="relative inline-flex h-10 w-10 items-center justify-center rounded-md border border-ink-300 bg-paper"
          aria-label={`Notificaciones${today.unread > 0 ? ` (${today.unread} sin leer)` : ""}`}
        >
          <Bell className="h-5 w-5 text-ink-900" />
          {today.unread > 0 ? (
            <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-action px-1 text-[10px] font-bold leading-none text-brand-deep">
              {today.unread > 9 ? "9+" : today.unread}
            </span>
          ) : null}
        </Link>
      </header>

      {today.events.length > 0 ? (
        <section
          aria-labelledby="admin-today-heading"
          className="rounded-md border border-ink-300 bg-paper p-4"
        >
          <div className="mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4 text-brand-deep" />
            <h2
              id="admin-today-heading"
              className="font-display text-base font-bold text-brand-deep"
            >
              Tu día
            </h2>
          </div>
          <ul className="flex flex-col gap-2">
            {today.events.map((e) => (
              <li key={`${e.kind}-${e.id}`}>
                <Link
                  href={(e.kind === "match" ? `/admin/matches/${e.id}` : "/admin/trainings") as Route}
                  className="flex items-center gap-3 rounded-md border border-ink-300 bg-paper p-3 transition-colors hover:border-brand-blue hover:bg-brand-foam"
                  style={{
                    borderLeftWidth: "4px",
                    borderLeftColor: e.team_color,
                  }}
                >
                  <span
                    className="flex h-9 w-9 items-center justify-center rounded-md text-paper"
                    style={{ backgroundColor: e.team_color }}
                  >
                    {e.kind === "match" ? <Trophy className="h-4 w-4" /> : <Volleyball className="h-4 w-4" />}
                  </span>
                  <div className="flex flex-1 flex-col">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-ink-600">
                      {e.kind === "match" ? "Partido" : "Entreno"} · {formatClock(e.scheduled_at)}
                    </span>
                    <span className="font-display text-sm font-bold text-brand-deep">
                      {e.title}
                    </span>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-ink-600" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

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

      <section aria-labelledby="admin-quick-heading" className="flex flex-col gap-2">
        <h2
          id="admin-quick-heading"
          className="font-display text-base font-bold text-brand-deep"
        >
          Personas
        </h2>
        <div className="grid grid-cols-2 gap-2">
          {QUICK_SHORTCUTS.map(({ href, title, Icon }) => (
            <Link
              key={href}
              href={href as Route}
              className="flex items-center gap-2 rounded-md border border-ink-300 bg-paper p-3 transition-colors hover:border-brand-blue hover:bg-brand-foam"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-brand-foam text-brand-deep">
                <Icon className="h-4 w-4" />
              </span>
              <span className="font-display text-sm font-bold text-brand-deep">
                {title}
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section aria-labelledby="admin-sports-heading" className="flex flex-col gap-2">
        <h2
          id="admin-sports-heading"
          className="font-display text-base font-bold text-brand-deep"
        >
          Competición
        </h2>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {SPORTS_SHORTCUTS.map(({ href, title, description, Icon }) => (
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

function formatClock(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
