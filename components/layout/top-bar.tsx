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

  return (
    <header
      data-top-bar
      className="bg-[linear-gradient(180deg,#062048_0%,#1657a8_100%)] text-paper sticky top-0 z-30 rounded-b-[1.5rem] shadow-elev-4"
    >
      <div className="mx-auto flex h-[var(--top-bar-height)] w-full max-w-5xl items-center justify-between gap-2 px-3 pt-[env(safe-area-inset-top)] min-[380px]:gap-3 min-[380px]:px-4">
        <Link
          href={"/dashboard" as Route}
          prefetch={false}
          className="focus-visible:ring-paper/80 flex min-w-0 shrink items-center gap-2 rounded-lg py-1 pr-1 transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:outline-none min-[430px]:gap-3 min-[430px]:pr-2"
        >
          <Logo size={44} className="shrink-0 min-[430px]:h-[52px] min-[430px]:w-[52px]" />
          <span className="font-display hidden truncate text-xl leading-none font-extrabold tracking-tight min-[430px]:block">
            Morvedre Core
          </span>
        </Link>

        <div className="flex shrink-0 items-center gap-1 rounded-full bg-white/10 p-1 min-[380px]:gap-2 min-[380px]:p-1.5">
          <Link
            href={"/news" as Route}
            prefetch={false}
            title="Noticias"
            aria-label="Ir a noticias"
            className="text-paper focus-visible:ring-paper/80 flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-white/15 focus-visible:ring-2 focus-visible:outline-none min-[380px]:h-12 min-[380px]:w-12"
          >
            <Megafone className="h-5 w-5 min-[380px]:h-6 min-[380px]:w-6" />
          </Link>

          {isPrivileged ? (
            <Link
              href="/admin"
              prefetch={false}
              title="Panel de administracion"
              aria-label="Panel de administracion"
              className="text-paper focus-visible:ring-paper/80 flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-white/15 focus-visible:ring-2 focus-visible:outline-none min-[380px]:h-12 min-[380px]:w-12"
            >
              <MdSettings className="h-5 w-5 min-[380px]:h-6 min-[380px]:w-6" aria-hidden="true" />
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
            aria-label="Mi perfil"
            className="focus-visible:ring-paper/80 shrink-0 rounded-full focus-visible:ring-2 focus-visible:outline-none"
          >
            <Avatar
              src={activeProfile.photo_url}
              name={activeProfile.full_name}
              size={42}
              teamColor={teamColor}
              className="ring-2 ring-white/40"
            />
          </Link>
        </div>
      </div>
    </header>
  );
}
