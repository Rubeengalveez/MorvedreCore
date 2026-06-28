import Link from "next/link";
import { Settings } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { Logo } from "@/components/brand/logo";
import { NotificationsBell } from "@/components/notifications/notifications-bell";
import {
  ProfileSwitcher,
  type ProfileSummary,
} from "@/components/layout/profile-switcher";
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
  ownProfile,
  activeProfile,
  linkedProfiles,
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
      .eq("profile_id", ownProfile.id)
      .then(
        (res) => res,
        () => ({ data: [] }),
      ),
  ]);

  const userRoles = (rolesData?.data ?? []).map((r: any) => r.role);
  const isPrivileged =
    userRoles.includes("admin") ||
    userRoles.includes("coach") ||
    userRoles.includes("delegate");

  const teamColor = activeProfile.team_color ?? "var(--pool-blue)";

  return (
    <header
      data-top-bar
      className="sticky top-0 z-30 flex h-[60px] items-center justify-between gap-2 border-b border-ink-300 bg-paper px-4 pt-[env(safe-area-inset-top)] shadow-elev-1"
    >
      <div className="flex items-center gap-1.5">
        <Logo size="sm" withWordmark />
        <span
          aria-hidden="true"
          className="ml-1 block h-2 w-2 rounded-full"
          style={{ backgroundColor: teamColor }}
        />
      </div>
      <div className="flex items-center gap-2">
        <span
          aria-hidden="true"
          className="hidden h-7 w-1 shrink-0 rounded-sm sm:block"
          style={{ backgroundColor: teamColor }}
        />
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
        <ProfileSwitcher
          ownProfile={ownProfile}
          activeProfile={activeProfile}
          linkedProfiles={linkedProfiles}
        />
      </div>
    </header>
  );
}
