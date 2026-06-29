import Link from "next/link";
import type { Route } from "next";
import { Settings } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { Logo } from "@/components/brand/logo";
import { NotificationsBell } from "@/components/notifications/notifications-bell";
import { type ProfileSummary } from "@/components/layout/profile-switcher";
import { Avatar } from "@/components/ui/avatar";
import { Megafone, Tiburon } from "@/components/brand/pictograms";
import {
  getNotificationsForProfile,
  getUnreadNotificationsCount,
  type NotificationItem,
} from "@/server/queries/notifications";

export interface TopBarProps {
  ownProfile: ProfileSummary;
  activeProfile: ProfileSummary;
  linkedProfiles: ProfileSummary[];
}

export async function TopBar({
  activeProfile,
}: TopBarProps) {
  const supabase = await createClient();
  const [unread, items, rolesData] = await Promise.all([
    getUnreadNotificationsCount(activeProfile.id).catch(() => 0),
    getNotificationsForProfile(activeProfile.id, 20).catch(
      () => [] as NotificationItem[],
    ),
    supabase
      .from("user_roles")
      .select("role")
      .eq("profile_id", activeProfile.id)
      .then(
        (res) => res,
        () => ({ data: [] }),
      ),
  ]);

  const userRoles = ((rolesData?.data ?? []) as Array<{ role: string }>).map((r) => r.role);
  const isPrivileged =
    userRoles.includes("admin") ||
    userRoles.includes("coach") ||
    userRoles.includes("delegate");

  const teamColor = activeProfile.team_color ?? "var(--pool-blue)";

  return (
    <header
      data-top-bar
      className="sticky top-0 z-30 flex h-[60px] items-center justify-between gap-2 border-t-[3px] border-b border-ink-300 bg-paper px-4 pt-[env(safe-area-inset-top)] shadow-elev-1 transition-all duration-300"
      style={{ borderTopColor: teamColor }}
    >
      <Link
        href={"/dashboard" as Route}
        className="flex items-center gap-1.5 transition-opacity hover:opacity-80"
      >
        <Logo size="sm" withWordmark />
        <Tiburon className="h-6 w-6 hidden sm:block" accent={teamColor} />
      </Link>
      <div className="flex items-center gap-2">
        <Link
          href={"/news" as Route}
          title="Noticias"
          aria-label="Ir a noticias"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-ink-300 bg-paper text-pool-deep hover:bg-pool-foam transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pool-blue"
        >
          <Megafone className="h-5 w-5" accent="var(--pool-deep)" aria-hidden="true" />
        </Link>
        {isPrivileged ? (
          <Link
            href="/admin"
            title="Panel de administración"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-ink-300 bg-paper text-pool-deep hover:bg-pool-foam transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pool-blue"
          >
            <Settings className="h-5 w-5 text-pool-deep" aria-hidden="true" />
          </Link>
        ) : null}
        <NotificationsBell
          initialUnread={unread}
          initialNotifications={items}
          showFullListHref="/notifications"
        />
        <Link
          href={"/profile" as Route}
          title="Mi Perfil"
          className="h-10 w-10 shrink-0 overflow-hidden rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pool-blue"
          style={{ border: `2px solid ${teamColor}` }}
        >
          <Avatar
            src={activeProfile.photo_url}
            name={activeProfile.full_name}
            size={36}
          />
        </Link>
      </div>
    </header>
  );
}
