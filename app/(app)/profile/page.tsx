import Link from "next/link";
import type { Route } from "next";
import { redirect } from "next/navigation";
import {
  Banknote,
  CalendarDays,
  ChevronRight,
  KeyRound,
  LogOut,
  Settings2,
  ShieldCheck,
  Shirt,
  Trophy,
  UserRoundPen,
  UsersRound,
} from "lucide-react";

import { CalendarSyncCard } from "@/components/profile/calendar-sync-card";
import { FamilyOverviewPanel } from "@/components/profile/family-overview";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/ui/page-shell";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/server/actions/auth";
import { getActiveProfileContext } from "@/server/queries/active-profile";
import { getTeamsForProfileInSeason } from "@/server/queries/teams";
import { getFamilyOverview } from "@/server/queries/family";
import { getFamilyTreasury } from "@/server/queries/treasury";
import { formatTreasuryCents } from "@/lib/domain/treasury";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Tu perfil — Morvedre Core",
  description: "Tu identidad, actividad deportiva y preferencias del club.",
};

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador",
  coach: "Entrenador",
  delegate: "Delegado",
  directiva: "Directiva",
  parent: "Tutor",
  player: "Jugador",
};

const STAFF_ROLE_LABELS: Record<string, string> = {
  head_coach: "Entrenador titular",
  assistant_coach: "Entrenador ayudante",
  physical_trainer: "Preparador físico",
  delegate: "Delegado",
};

interface Snapshot {
  matches_played: number;
  goals: number;
  exclusions: number;
  mvp_count: number;
  trainings_attended: number;
  trainings_total: number;
  attendance_pct: number;
}

export default async function ProfilePage() {
  const ctx = await getActiveProfileContext();
  if (!ctx) redirect("/login");

  const { linkedProfiles, ownProfile } = ctx;
  const supabase = await createClient();
  const [{ data: season }, { data: ownRoles }] = await Promise.all([
    supabase.from("seasons").select("id, label").eq("is_current", true).maybeSingle(),
    supabase.from("user_roles").select("role").eq("profile_id", ownProfile.id),
  ]);

  const roles = Array.from(new Set((ownRoles ?? []).map((item) => item.role))).filter(
    (role) => role in ROLE_LABELS,
  );
  const ownRoleNames = new Set((ownRoles ?? []).map((item) => item.role));
  const isAdmin = ownRoleNames.has("admin");

  const [teams, rosterResult, staffResult, snapshotResult] = season
    ? await Promise.all([
        getTeamsForProfileInSeason(ownProfile.id, season.id),
        supabase
          .from("team_rosters")
          .select("team_id")
          .eq("player_id", ownProfile.id)
          .is("left_at", null),
        supabase.from("team_staff").select("team_id, role").eq("profile_id", ownProfile.id),
        supabase
          .from("ranking_snapshots")
          .select(
            "matches_played, goals, exclusions, mvp_count, trainings_attended, trainings_total, attendance_pct",
          )
          .eq("season_id", season.id)
          .eq("scope", "season")
          .eq("scope_key", "all")
          .eq("player_id", ownProfile.id)
          .maybeSingle(),
      ])
    : [
        [],
        { data: [] as Array<{ team_id: string }> },
        { data: [] as Array<{ team_id: string; role: string }> },
        { data: null },
      ];

  const playerTeamIds = new Set((rosterResult.data ?? []).map((item) => item.team_id));
  const staffByTeam = new Map(
    (staffResult.data ?? []).map((item) => [item.team_id, item.role] as const),
  );
  const snapshot = snapshotResult.data as Snapshot | null;
  const hasSportSummary = Boolean(
    snapshot && (snapshot.matches_played > 0 || snapshot.trainings_total > 0),
  );
  const [family, treasury] = await Promise.all([
    season && linkedProfiles.length > 0
      ? getFamilyOverview(ownProfile.id, season.id)
      : Promise.resolve(null),
    getFamilyTreasury(ownProfile.id),
  ]);
  const teamColor = ownProfile.team_color ?? teams[0]?.color ?? "var(--pool-blue)";

  return (
    <PageShell width="md" className="gap-5 pb-8">
      <header className="border-ink-200 bg-paper-card shadow-elev-1 flex items-center gap-4 rounded-2xl border p-4 sm:p-5">
        <Avatar
          name={ownProfile.full_name}
          src={ownProfile.photo_url}
          size={80}
          teamColor={teamColor}
        />
        <div className="min-w-0 flex-1">
          <p className="text-pool-blue text-xs font-extrabold tracking-[0.12em] uppercase">
            Tu cuenta
          </p>
          <h1 className="font-display text-pool-deep mt-1 line-clamp-2 text-xl leading-tight font-extrabold tracking-tight sm:text-2xl">
            {ownProfile.full_name}
          </h1>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {roles.length > 0 ? (
              roles.map((role) => (
                <span
                  key={role}
                  className="border-ink-200 bg-paper-sunk text-ink-700 inline-flex min-h-7 items-center rounded-full border px-2.5 text-xs font-bold"
                >
                  {ROLE_LABELS[role]}
                </span>
              ))
            ) : (
              <span className="text-ink-500 text-sm">Miembro del club</span>
            )}
          </div>
        </div>
      </header>

      {family ? (
        <FamilyOverviewPanel family={family} pendingTreasuryCents={treasury.totalPendingCents} />
      ) : null}

      {!family ? (
        <nav aria-label="Accesos desde tu perfil" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <QuickLink href="/calendar" label="Calendario" icon={CalendarDays} />
          <QuickLink href="/team" label="Equipos" icon={UsersRound} />
          <QuickLink href="/rankings" label="Rankings" icon={Trophy} />
          <QuickLink href="/shop/orders" label="Mis pedidos" icon={Shirt} />
        </nav>
      ) : null}

      {treasury.canView && !family ? (
        <Link
          href={"/treasury" as Route}
          className="bg-pool-foam border-pool-blue/20 hover:border-pool-blue/40 focus-visible:ring-pool-blue flex min-h-20 items-center gap-3 rounded-2xl border px-4 py-3 transition-[border-color,transform] focus-visible:ring-2 focus-visible:outline-none active:scale-[0.99]"
        >
          <span className="bg-paper-card text-pool-blue flex h-12 w-12 shrink-0 items-center justify-center rounded-xl shadow-sm">
            <Banknote className="h-6 w-6" aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="text-pool-blue block text-xs font-extrabold tracking-[0.08em] uppercase">
              Cuotas y pagos
            </span>
            <span className="text-pool-deep mt-0.5 block text-sm font-extrabold">
              {treasury.totalPendingCents > 0
                ? `${formatTreasuryCents(treasury.totalPendingCents)} pendientes`
                : "Todo al día"}
            </span>
          </span>
          <ChevronRight className="text-pool-blue h-5 w-5 shrink-0" aria-hidden="true" />
        </Link>
      ) : null}

      {hasSportSummary && snapshot ? (
        <section aria-labelledby="season-summary-title" className="flex flex-col gap-3">
          <SectionTitle
            id="season-summary-title"
            eyebrow={season?.label ?? "Temporada actual"}
            title="Tu temporada"
          />
          <div className="border-ink-200 bg-paper-card shadow-elev-1 grid grid-cols-2 overflow-hidden rounded-2xl border sm:grid-cols-4">
            <Stat
              value={snapshot.goals}
              label="Goles"
              detail={`${snapshot.matches_played} partidos`}
            />
            <Stat
              value={snapshot.mvp_count}
              label="MVP"
              detail={`${snapshot.matches_played} partidos`}
            />
            <Stat
              value={`${Math.round(Number(snapshot.attendance_pct))}%`}
              label="Asistencia"
              detail={`${snapshot.trainings_attended}/${snapshot.trainings_total} entrenos`}
            />
            <Stat
              value={snapshot.exclusions}
              label="Expulsiones"
              detail={`${snapshot.matches_played} partidos`}
            />
          </div>
        </section>
      ) : null}

      {teams.length > 0 || !family ? (
        <section aria-labelledby="profile-teams-title" className="flex flex-col gap-3">
          <SectionTitle
            id="profile-teams-title"
            eyebrow="Temporada actual"
            title="Equipos y funciones"
          />
          {teams.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {teams.map((team) => {
                const staffRole = staffByTeam.get(team.id);
                const isPlayer = playerTeamIds.has(team.id);
                return (
                  <li key={team.id}>
                    <Link
                      href={`/team/${team.id}` as Route}
                      className="border-ink-200 bg-paper-card shadow-elev-1 hover:border-pool-blue/40 focus-visible:ring-pool-blue flex min-h-18 items-center gap-3 rounded-xl border p-3 transition-[border-color,transform,box-shadow] focus-visible:ring-2 focus-visible:outline-none active:scale-[0.99] motion-reduce:transition-none"
                    >
                      <span
                        aria-hidden="true"
                        className="h-10 w-1.5 shrink-0 rounded-full"
                        style={{ backgroundColor: team.color }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-pool-deep truncate font-extrabold">{team.label}</p>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {staffRole ? (
                            <span className="bg-pool-deep text-paper rounded-full px-2 py-0.5 text-xs font-bold">
                              {STAFF_ROLE_LABELS[staffRole] ?? "Cuerpo técnico"}
                            </span>
                          ) : null}
                          {isPlayer ? (
                            <span className="bg-pool-foam text-pool-deep rounded-full px-2 py-0.5 text-xs font-bold">
                              Jugador
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <ChevronRight className="text-ink-400 h-5 w-5 shrink-0" aria-hidden="true" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="border-ink-200 bg-paper-card text-ink-600 rounded-xl border border-dashed p-4 text-sm">
              Este perfil todavía no está vinculado a un equipo de la temporada actual.
            </div>
          )}
        </section>
      ) : null}

      <section aria-labelledby="profile-settings-title" className="flex flex-col gap-3">
        <SectionTitle id="profile-settings-title" eyebrow="Cuenta" title="Datos y preferencias" />
        <div className="border-ink-200 bg-paper-card shadow-elev-1 divide-ink-200 divide-y overflow-hidden rounded-2xl border">
          <SettingsLink href="/profile/edit" label="Editar datos del perfil" icon={UserRoundPen} />
          <SettingsLink href="/change-password" label="Cambiar contraseña" icon={KeyRound} />
          {isAdmin ? (
            <SettingsLink href="/admin" label="Panel de administración" icon={ShieldCheck} />
          ) : null}
        </div>
      </section>

      <details className="border-ink-200 bg-paper-card group rounded-2xl border">
        <summary className="focus-visible:ring-pool-blue flex min-h-14 cursor-pointer list-none items-center gap-3 rounded-2xl px-4 font-extrabold focus-visible:ring-2 focus-visible:outline-none">
          <Settings2 className="text-pool-blue h-5 w-5" aria-hidden="true" />
          <span className="text-pool-deep flex-1">Sincronizar con otro calendario</span>
          <ChevronRight
            className="text-ink-400 h-5 w-5 transition-transform group-open:rotate-90 motion-reduce:transition-none"
            aria-hidden="true"
          />
        </summary>
        <div className="px-3 pb-3">
          <CalendarSyncCard
            token={ownProfile.calendar_token}
            baseUrl={process.env.NEXT_PUBLIC_APP_URL || ""}
          />
        </div>
      </details>

      <form action={signOut}>
        <Button type="submit" variant="danger" size="md" className="w-full">
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Cerrar sesión
        </Button>
      </form>
    </PageShell>
  );
}

function QuickLink({
  href,
  label,
  icon: Icon,
}: {
  href: string;
  label: string;
  icon: typeof CalendarDays;
}) {
  return (
    <Link
      href={href as Route}
      className="border-ink-200 bg-paper-card shadow-elev-1 hover:border-pool-blue/40 focus-visible:ring-pool-blue flex min-h-20 flex-col items-center justify-center gap-2 rounded-xl border px-2 text-center transition-[border-color,transform,box-shadow] hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:outline-none active:translate-y-0 motion-reduce:transition-none"
    >
      <Icon className="text-pool-blue h-5 w-5" aria-hidden="true" />
      <span className="text-pool-deep text-sm font-extrabold">{label}</span>
    </Link>
  );
}

function SettingsLink({
  href,
  label,
  icon: Icon,
}: {
  href: string;
  label: string;
  icon: typeof Settings2;
}) {
  return (
    <Link
      href={href as Route}
      className="hover:bg-pool-foam focus-visible:ring-pool-blue flex min-h-14 items-center gap-3 px-4 transition-colors focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset"
    >
      <Icon className="text-pool-blue h-5 w-5 shrink-0" aria-hidden="true" />
      <span className="text-pool-deep flex-1 font-bold">{label}</span>
      <ChevronRight className="text-ink-400 h-5 w-5" aria-hidden="true" />
    </Link>
  );
}

function SectionTitle({ id, eyebrow, title }: { id: string; eyebrow: string; title: string }) {
  return (
    <div>
      <p className="text-pool-blue text-xs font-extrabold tracking-[0.12em] uppercase">{eyebrow}</p>
      <h2 id={id} className="font-display text-pool-deep mt-0.5 text-xl font-extrabold">
        {title}
      </h2>
    </div>
  );
}

function Stat({ value, label, detail }: { value: number | string; label: string; detail: string }) {
  return (
    <div className="border-ink-200 flex min-h-24 flex-col justify-center border-r border-b px-3 py-3 even:border-r-0 sm:border-b-0 sm:last:border-r-0 sm:even:border-r">
      <p className="text-pool-deep font-mono text-2xl leading-none font-extrabold tabular-nums">
        {value}
      </p>
      <p className="text-ink-700 mt-1 text-xs font-extrabold uppercase">{label}</p>
      <p className="text-ink-500 mt-1 text-xs">{detail}</p>
    </div>
  );
}
