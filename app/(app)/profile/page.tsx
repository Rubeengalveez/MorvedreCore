import { redirect } from "next/navigation";
import {
  Bell,
  Banknote,
  UsersRound,
  CalendarCheck2,
  ShieldCheck,
  ShoppingBag,
  KeyRound,
} from "lucide-react";
import { PushSettings } from "@/components/push/push-settings";
import { ActionGroup, ProfileIdentity } from "@/components/profile/profile-hub";
import { PageShell } from "@/components/ui/page-shell";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { getActiveProfileContext } from "@/server/queries/active-profile";
import { getSelfProfile } from "@/server/queries/self-profile";
import { getRenderAdminAccess } from "@/server/actions/admin/_helpers";
import { canAccessAdminArea } from "@/lib/domain/permissions";
import { getFamilyTreasury } from "@/server/queries/treasury";
import { getCurrentSeason } from "@/server/queries/seasons";
import {
  safeInferCategory,
  calendarSeasonStartYear,
  CATEGORY_COLORS,
} from "@/lib/domain/categories";
import { formatTreasuryCents } from "@/lib/domain/treasury";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "Mi perfil — Morvedre Core" };

const roles: Record<string, string> = {
  admin: "Administrador",
  coach: "Entrenador",
  delegate: "Delegado",
  parent: "Tutor",
  player: "Jugador",
  directiva: "Directiva",
};

export default async function ProfilePage() {
  const [ctx, account, access, season] = await Promise.all([
    getActiveProfileContext(),
    getSelfProfile(),
    getRenderAdminAccess(),
    getCurrentSeason(),
  ]);
  if (!ctx || !account) redirect("/login");
  const treasury = await getFamilyTreasury(account.profile.id);
  const category =
    account.profile.birth_year == null
      ? null
      : safeInferCategory(
          account.profile.birth_year,
          season ? Number(season.start_date.slice(0, 4)) : calendarSeasonStartYear(),
        );
  const labels = [
    ...new Set([
      ...(access.isAdmin ? [roles.admin] : []),
      ...(access.coachTeamIds.size ? [roles.coach] : []),
      ...(access.delegateTeamIds?.size ? [roles.delegate] : []),
      ...(account.isPlayer ? [roles.player] : []),
      ...(ctx.linkedProfiles.length ? [roles.parent] : []),
      ...(!access.isAdmin && access.permissions.has("manage_shop") ? ["Tienda"] : []),
      ...(!access.isAdmin && access.permissions.has("manage_treasury") ? ["Tesorería"] : []),
    ]),
  ];
  return (
    <PageShell width="md" className="gap-3 pb-5">
      <h1 className="text-pool-deep text-3xl font-extrabold">Mi perfil</h1>
      <ProfileIdentity
        name={account.profile.full_name}
        photoUrl={account.profile.photo_url}
        teamColor={
          category && account.isPlayer
            ? CATEGORY_COLORS[category]
            : (account.profile.team_color ?? "var(--pool-blue)")
        }
        roleLabels={labels}
      />
      <ActionGroup
        title="Mi actividad"
        links={[
          { href: "/shop/orders?from=profile", label: "Mis pedidos", icon: ShoppingBag },
          ...(treasury.canView
            ? [
                {
                  href: "/treasury",
                  label: "Cuotas y pagos",
                  icon: Banknote,
                  detail:
                    treasury.totalPendingCents > 0
                      ? `${formatTreasuryCents(treasury.totalPendingCents)} pendientes`
                      : undefined,
                },
              ]
            : []),
          {
            href: "/profile/activity",
            label: "Equipos y actividad deportiva",
            icon: CalendarCheck2,
          },
        ]}
      />
      {ctx.linkedProfiles.length > 0 && (
        <ActionGroup
          title="Familia"
          links={[
            {
              href: "/profile/family",
              label: "Mis hijos",
              detail: ctx.linkedProfiles.map((p) => p.full_name.split(" ")[0]).join(" · "),
              icon: UsersRound,
            },
          ]}
        />
      )}
      <ActionGroup
        title="Mi cuenta"
        links={[
          { href: "/notifications?from=profile", label: "Mis notificaciones", icon: Bell },
          { href: "/change-password?from=profile", label: "Cambiar contraseña", icon: KeyRound },
          ...(canAccessAdminArea(access)
            ? [{ href: "/admin", label: "Administración", icon: ShieldCheck }]
            : []),
        ]}
      />
      <PushSettings publicKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY} />
      <SignOutButton />
    </PageShell>
  );
}
