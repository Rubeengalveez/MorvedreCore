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

const utilityActionClass =
  "touch-manipulation text-paper/90 hover:text-paper focus-visible:ring-paper/80 relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-[background-color,color,transform,box-shadow] duration-200 hover:bg-white/14 focus-visible:ring-2 focus-visible:outline-none active:scale-[0.94] motion-reduce:transition-none [-webkit-tap-highlight-color:transparent]";

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
      className="text-paper shadow-elev-4 sticky top-0 z-30 overflow-hidden rounded-b-[1.75rem] border-b border-white/12 bg-[linear-gradient(135deg,#041a3a_0%,#0a3c7b_54%,#1657a8_100%)]"
    >
      <div className="mx-auto flex min-h-[var(--top-bar-height)] w-full max-w-6xl items-center justify-between gap-2 px-3 pt-[env(safe-area-inset-top)] min-[380px]:px-4 sm:px-6">
        <Link
          href={"/dashboard" as Route}
          prefetch={false}
          className="focus-visible:ring-paper/80 group flex min-w-0 items-center gap-2 rounded-xl py-1 pr-1 transition-opacity duration-200 hover:opacity-95 focus-visible:ring-2 focus-visible:outline-none motion-reduce:transition-none min-[430px]:gap-2.5"
        >
          <Logo
            size={42}
            className="shrink-0 transition-transform duration-200 group-hover:-rotate-3 group-active:scale-95 motion-reduce:transition-none min-[430px]:h-11 min-[430px]:w-11"
          />
          <span className="font-display hidden min-w-0 flex-col leading-none min-[360px]:flex">
            <span className="truncate text-[1.05rem] font-extrabold tracking-tight min-[430px]:text-lg">
              Morvedre
            </span>
            <span className="text-paper/75 mt-1 w-fit rounded-full bg-white/12 px-1.5 py-0.5 text-[8px] font-bold tracking-[0.16em] uppercase min-[430px]:text-[9px]">
              Core
            </span>
          </span>
        </Link>

        <div className="flex shrink-0 items-center gap-0.5 rounded-2xl border border-white/12 bg-white/[0.09] p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] backdrop-blur-sm min-[380px]:gap-1">
          <Link
            href={"/news" as Route}
            prefetch={false}
            title="Noticias"
            aria-label="Ir a noticias"
            className={utilityActionClass}
          >
            <Megafone className="h-5 w-5" />
          </Link>

          {isPrivileged ? (
            <Link
              href="/admin"
              prefetch={false}
              title="Panel de administracion"
              aria-label="Panel de administracion"
              className={utilityActionClass}
            >
              <MdSettings className="h-5 w-5" aria-hidden="true" />
            </Link>
          ) : null}

          <NotificationsBell
            initialUnread={unread}
            initialNotifications={items}
            showFullListHref="/notifications"
            triggerClassName={utilityActionClass}
          />

          <Link
            href={"/profile" as Route}
            prefetch={false}
            title="Mi perfil"
            aria-label="Mi perfil"
            className="focus-visible:ring-paper/80 flex h-11 w-11 shrink-0 touch-manipulation items-center justify-center rounded-xl transition-[background-color,transform] duration-200 [-webkit-tap-highlight-color:transparent] hover:bg-white/14 focus-visible:ring-2 focus-visible:outline-none active:scale-[0.94] motion-reduce:transition-none"
          >
            <Avatar
              src={activeProfile.photo_url}
              name={activeProfile.full_name}
              size={36}
              teamColor={teamColor}
              className="ring-2 ring-white/55"
            />
          </Link>
        </div>
      </div>
    </header>
  );
}
