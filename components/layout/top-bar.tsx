import Link from "next/link";
import type { Route } from "next";
import { MdSettings } from "react-icons/md";

import { createClient } from "@/lib/supabase/server";
import { Logo } from "@/components/brand/logo";
import { Megafone } from "@/components/brand/pictograms";
import { NotificationsBell } from "@/components/notifications/notifications-bell";
import { type ProfileSummary } from "@/components/layout/profile-switcher";
import { Avatar } from "@/components/ui/avatar";
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

export async function TopBar({ activeProfile }: TopBarProps) {
  const supabase = await createClient();
  const [unread, items, rolesData] = await Promise.all([
    getUnreadNotificationsCount(activeProfile.id).catch(() => 0),
    getNotificationsForProfile(activeProfile.id, 20).catch(() => [] as NotificationItem[]),
    supabase
      .from("user_roles")
      .select("role")
      .eq("profile_id", activeProfile.id)
      .then(
        (res: { data: Array<{ role: string }> | null }) => res,
        () => ({ data: [] as Array<{ role: string }> }),
      ),
  ]);

  const userRoles = ((rolesData?.data ?? []) as Array<{ role: string }>).map((r) => r.role);
  const isPrivileged =
    userRoles.includes("admin") || userRoles.includes("coach") || userRoles.includes("delegate");

  const teamColor = activeProfile.team_color ?? "var(--pool-blue)";
  const firstName = activeProfile.full_name.split(/\s+/)[0] ?? activeProfile.full_name;

  return (
    <header
      data-top-bar
      className="bg-pool-deep/96 text-paper shadow-elev-4 sticky top-0 z-30 min-h-[var(--top-bar-height)] border-b border-white/10 px-3 pt-[env(safe-area-inset-top)] backdrop-blur-md transition-all duration-300"
      style={{ borderTop: `3px solid ${teamColor}` }}
    >
      <div className="mx-auto flex h-[55px] w-full max-w-5xl items-center justify-between gap-2">
        <Link
          href={"/dashboard" as Route}
          prefetch={false}
          className="focus-visible:ring-paper/80 flex min-w-0 items-center gap-2 rounded-md py-1 pr-2 transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:outline-none"
        >
          <span className="bg-paper flex h-9 w-9 shrink-0 items-center justify-center rounded-md">
            <Logo size="sm" />
          </span>
          <span className="hidden min-w-0 sm:block">
            <span className="font-display text-paper block text-sm leading-none font-extrabold tracking-wide uppercase">
              Morvedre
            </span>
            <span className="text-paper/70 mt-0.5 block truncate text-xs font-semibold">
              {firstName}
            </span>
          </span>
        </Link>

        <div className="flex items-center gap-1.5">
          <Link
            href={"/news" as Route}
            prefetch={false}
            title="Noticias"
            aria-label="Ir a noticias"
            className="text-paper focus-visible:ring-paper/80 touch-target flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-white/12 bg-white/8 transition-colors hover:bg-white/14 focus-visible:ring-2 focus-visible:outline-none"
          >
            <Megafone className="h-5 w-5" />
          </Link>
          {isPrivileged ? (
            <Link
              href="/admin"
              prefetch={false}
              title="Panel de administracion"
              className="text-paper focus-visible:ring-paper/80 touch-target flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-white/12 bg-white/8 transition-colors hover:bg-white/14 focus-visible:ring-2 focus-visible:outline-none"
            >
              <MdSettings className="h-6 w-6" aria-hidden="true" />
            </Link>
          ) : null}
          <NotificationsBell
            initialUnread={unread}
            initialNotifications={items}
            showFullListHref="/notifications"
          />
          <Link
            href={"/profile" as Route}
            prefetch={false}
            title="Mi perfil"
            className="bg-paper focus-visible:ring-paper/80 touch-target h-10 w-10 shrink-0 overflow-hidden rounded-full focus-visible:ring-2 focus-visible:outline-none"
            style={{ boxShadow: `0 0 0 2px ${teamColor}` }}
          >
            <Avatar src={activeProfile.photo_url} name={activeProfile.full_name} size={40} />
          </Link>
        </div>
      </div>
    </header>
  );
}
