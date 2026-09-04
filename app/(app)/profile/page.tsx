import Link from "next/link";
import type { Route } from "next";
import { redirect } from "next/navigation";
import {
  Banknote,
  Bell,
  Camera,
  CalendarCheck2,
  ChevronRight,
  CircleUserRound,
  ClipboardCheck,
  Hash,
  KeyRound,
  LogOut,
  Phone,
  Settings2,
  ShieldCheck,
  Shirt,
  UserRoundPen,
  UsersRound,
} from "lucide-react";

import { CalendarSyncCard } from "@/components/profile/calendar-sync-card";
import { FamilyOverviewPanel } from "@/components/profile/family-overview";
import { getProfilePermissionLinks } from "@/components/profile/profile-permission-links";
import {
  ActionGroup,
  ProfileIdentity,
  ProfileReadiness,
  SettingsLink,
} from "@/components/profile/profile-hub";
import { Button } from "@/components/ui/button";
import { PageShell, SectionHeader } from "@/components/ui/page-shell";
import { formatTreasuryCents } from "@/lib/domain/treasury";
import type { AdminPermission } from "@/lib/domain/permissions";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/server/actions/auth";
import { getActiveProfileContext, getOwnProfilePhone } from "@/server/queries/active-profile";
import { getDashboardAudience } from "@/server/queries/dashboard";
import { getFamilyOverview } from "@/server/queries/family";
import { getTeamsForProfileInSeason } from "@/server/queries/teams";
import { getFamilyTreasury } from "@/server/queries/treasury";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Tu perfil — Morvedre Core",
  description: "Tu identidad, funciones y preferencias dentro del club.",
};

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador",
  coach: "Entrenador",
  delegate: "Delegado",
  directiva: "Directiva",
  parent: "Tutor",
  player: "Jugador",
  shop_manager: "Tienda",
  treasurer: "Tesorería",
};

const STAFF_ROLE_LABELS: Record<string, string> = {
  head_coach: "Entrenador titular",
  assistant_coach: "Entrenador ayudante",
  physical_trainer: "Preparador físico",
  delegate: "Delegado",
};

export default async function ProfilePage() {
  const ctx = await getActiveProfileContext();
  if (!ctx) redirect("/login");

  const { linkedProfiles, ownProfile } = ctx;
  const supabase = await createClient();
  const [{ data: season }, ownPhone, treasury, { data: permissionRows }] = await Promise.all([
    supabase.from("seasons").select("id, label").eq("is_current", true).maybeSingle(),
    getOwnProfilePhone(),
    getFamilyTreasury(ownProfile.id),
    supabase.from("profile_permissions").select("permission").eq("profile_id", ownProfile.id),
  ]);

  const [audience, teams, family] = season
    ? await Promise.all([
        getDashboardAudience(ownProfile.id, season.id),
        getTeamsForProfileInSeason(ownProfile.id, season.id),
        linkedProfiles.length > 0
          ? getFamilyOverview(ownProfile.id, season.id)
          : Promise.resolve(null),
      ])
    : [
        {
          player_team_ids: [],
          staff_teams: [],
          coach_team_ids: [],
          can_manage_attendance: false,
          roles: [],
        },
        [],
        null,
      ];

  const roleKeys = Array.from(
    new Set([
      ...audience.roles.filter((role) => role in ROLE_LABELS),
      ...(linkedProfiles.length > 0 ? ["parent"] : []),
      ...(audience.player_team_ids.length > 0 ? ["player"] : []),
    ]),
  );
  const isAdmin = roleKeys.includes("admin");
  const permissions = new Set(
    (permissionRows ?? []).map((row) => row.permission as AdminPermission),
  );
  const isPlayer = audience.player_team_ids.length > 0;
  const playerTeam = teams.find((team) => audience.player_team_ids.includes(team.id)) ?? null;
  const teamColor =
    ownProfile.team_color ?? playerTeam?.color ?? teams[0]?.color ?? "var(--pool-blue)";
  const profileChecks = [
    {
      label: "Foto",
      complete: Boolean(ownProfile.photo_url),
      icon: Camera,
      href: "/profile/edit#photo",
    },
    {
      label: "Teléfono",
      complete: Boolean(ownPhone),
      icon: Phone,
      href: "/profile/edit#phone_e164",
    },
    ...(isPlayer
      ? [
          {
            label: "Gorro",
            complete: ownProfile.cap_number != null,
            icon: Hash,
            href: "/profile/edit#cap_number",
          },
        ]
      : []),
  ];
  const completedChecks = profileChecks.filter((item) => item.complete).length;
  const permissionLinks = getProfilePermissionLinks(permissions);

  return (
    <PageShell width="md" className="gap-5 pb-8">
      <ProfileIdentity
        name={ownProfile.full_name}
        photoUrl={ownProfile.photo_url}
        teamColor={teamColor}
        roleLabels={roleKeys.map((role) => ROLE_LABELS[role] ?? role)}
      />

      <ProfileReadiness items={profileChecks} completed={completedChecks} />

      {family ? (
        <FamilyOverviewPanel family={family} pendingTreasuryCents={treasury.totalPendingCents} />
      ) : null}

      <section aria-labelledby="profile-actions-title" className="flex flex-col gap-3">
        <SectionHeader
          id="profile-actions-title"
          eyebrow="Accesos según tus funciones"
          title="Tu espacio"
        />

        <div className="grid gap-3 sm:grid-cols-2">
          {isPlayer && playerTeam ? (
            <ActionGroup
              title="Como jugador"
              description="Tu seguimiento deportivo, sin repetir el resumen de Inicio."
              icon={CircleUserRound}
              links={[
                {
                  href: "/attendance/history",
                  label: "Mi asistencia",
                  detail: "Entrenos asistidos y ausencias",
                  icon: CalendarCheck2,
                },
                {
                  href: `/team/${playerTeam.id}/players/${ownProfile.id}?from=profile`,
                  label: "Mi ficha deportiva",
                  detail: "Estadísticas y evolución de temporada",
                  icon: ClipboardCheck,
                },
              ]}
            />
          ) : null}

          {audience.can_manage_attendance ? (
            <ActionGroup
              title="Como entrenador"
              description="Las herramientas que necesitas para gestionar al equipo."
              icon={ClipboardCheck}
              links={[
                {
                  href: "/attendance",
                  label: "Pasar lista",
                  detail: "Entrenamientos de hoy y otros días",
                  icon: CalendarCheck2,
                },
                {
                  href: "/attendance/summary",
                  label: "Resumen de asistencia",
                  detail: "Consulta semanal y mensual",
                  icon: UsersRound,
                },
              ]}
            />
          ) : null}

          <ActionGroup
            title="Gestiones personales"
            description="Pedidos, avisos y pagos que te afectan."
            icon={Settings2}
            links={[
              {
                href: "/shop/orders",
                label: "Mis pedidos",
                detail: "Estado y detalle de tus solicitudes",
                icon: Shirt,
              },
              {
                href: "/notifications",
                label: "Notificaciones",
                detail: "Avisos del club y acciones pendientes",
                icon: Bell,
              },
              ...(treasury.canView && !family
                ? [
                    {
                      href: "/treasury",
                      label: "Cuotas y pagos",
                      detail:
                        treasury.totalPendingCents > 0
                          ? `${formatTreasuryCents(treasury.totalPendingCents)} pendientes`
                          : "Todo al día",
                      icon: Banknote,
                    },
                  ]
                : []),
            ]}
          />

          {isAdmin || permissionLinks.length > 0 ? (
            <ActionGroup
              title="Gestión del club"
              description={
                isAdmin
                  ? "Administración general y permisos."
                  : "Solo aparecen las áreas para las que tienes permiso."
              }
              icon={ShieldCheck}
              links={
                isAdmin
                  ? [
                      {
                        href: "/admin",
                        label: "Panel de administración",
                        detail: "Personas, equipos y operativa",
                        icon: ShieldCheck,
                      },
                    ]
                  : permissionLinks
              }
            />
          ) : null}
        </div>
      </section>

      {teams.length > 0 ? (
        <section aria-labelledby="profile-membership-title" className="flex flex-col gap-3">
          <SectionHeader
            id="profile-membership-title"
            eyebrow={season?.label ?? "Temporada actual"}
            title="Tu papel en el club"
          />
          <div className="border-ink-200 bg-paper-card shadow-elev-1 divide-ink-200 divide-y overflow-hidden rounded-2xl border">
            {teams.map((team) => {
              const staffTeam = audience.staff_teams.find((item) => item.id === team.id);
              const teamRoles = [
                ...(audience.player_team_ids.includes(team.id) ? ["Jugador"] : []),
                ...(staffTeam ? [STAFF_ROLE_LABELS[staffTeam.staff_role] ?? "Cuerpo técnico"] : []),
              ];
              return (
                <Link
                  key={team.id}
                  href={`/team/${team.id}` as Route}
                  className="hover:bg-pool-foam/50 focus-visible:ring-pool-blue group flex min-h-16 touch-manipulation items-center gap-3 px-4 py-3 transition-colors focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset"
                >
                  <span
                    aria-hidden="true"
                    className="h-10 w-1.5 shrink-0 rounded-full"
                    style={{ backgroundColor: team.color }}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="text-pool-deep block truncate font-extrabold">
                      {team.label}
                    </span>
                    <span className="text-ink-600 mt-0.5 block truncate text-sm font-semibold">
                      {teamRoles.join(" · ") || "Miembro del equipo"}
                    </span>
                  </span>
                  <ChevronRight
                    className="text-ink-400 h-5 w-5 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none"
                    aria-hidden="true"
                  />
                </Link>
              );
            })}
          </div>
        </section>
      ) : null}

      <section aria-labelledby="profile-account-title" className="flex flex-col gap-3">
        <SectionHeader id="profile-account-title" eyebrow="Privacidad y acceso" title="Tu cuenta" />
        <div className="border-ink-200 bg-paper-card shadow-elev-1 divide-ink-200 divide-y overflow-hidden rounded-2xl border">
          <SettingsLink href="/profile/edit" label="Editar tus datos" icon={UserRoundPen} />
          <SettingsLink href="/change-password" label="Cambiar contraseña" icon={KeyRound} />
        </div>
      </section>

      <details className="border-ink-200 bg-paper-card group rounded-2xl border">
        <summary className="focus-visible:ring-pool-blue flex min-h-14 cursor-pointer list-none items-center gap-3 rounded-2xl px-4 font-extrabold focus-visible:ring-2 focus-visible:outline-none">
          <Settings2 className="text-pool-blue h-5 w-5" aria-hidden="true" />
          <span className="text-pool-deep flex-1">Sincronizar otro calendario</span>
          <ChevronRight
            className="text-ink-400 h-5 w-5 transition-transform duration-200 group-open:rotate-90 motion-reduce:transition-none"
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
