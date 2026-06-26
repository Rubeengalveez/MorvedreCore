import { Bell } from "lucide-react";

import { Logo } from "@/components/brand/logo";
import {
  ProfileSwitcher,
  type ProfileSummary,
} from "@/components/layout/profile-switcher";

export interface TopBarProps {
  activeProfile: ProfileSummary;
  linkedProfiles: ProfileSummary[];
}

export function TopBar({ activeProfile, linkedProfiles }: TopBarProps) {
  return (
    <header className="sticky top-0 z-30 flex h-[60px] items-center justify-between gap-2 border-b border-ink-300 bg-paper px-4 pt-[env(safe-area-inset-top)]">
      <Logo size="sm" withWordmark />
      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-label="Notificaciones"
          className="flex h-12 w-12 items-center justify-center rounded-full text-ink-600 transition-colors hover:bg-brand-foam active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
        >
          <Bell className="h-5 w-5" aria-hidden="true" />
        </button>
        <ProfileSwitcher
          activeProfile={activeProfile}
          linkedProfiles={linkedProfiles}
        />
      </div>
    </header>
  );
}
