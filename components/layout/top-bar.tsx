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
  const [unread, items] = await Promise.all([
    getUnreadNotificationsCount(activeProfile.id).catch(() => 0),
    getNotificationsForProfile(activeProfile.id, 20).catch(
      () => [] as NotificationItem[],
    ),
  ]);

  return (
    <header className="sticky top-0 z-30 flex h-[60px] items-center justify-between gap-2 border-b border-ink-300 bg-paper px-4 pt-[env(safe-area-inset-top)]">
      <Logo size="sm" withWordmark />
      <div className="flex items-center gap-1">
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
