"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils/cn";
import { type ProfileSummary } from "@/server/queries/profile-types";
import { ACTIVE_COOKIE } from "@/server/queries/profile-types";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

function setActiveCookie(id: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${ACTIVE_COOKIE}=${id}; Path=/; Max-Age=${ONE_YEAR_SECONDS}; SameSite=Lax; Secure`;
}

export interface ProfileSwitcherInlineProps {
  ownProfile: ProfileSummary;
  activeProfile: ProfileSummary;
  linkedProfiles: ProfileSummary[];
}

export function ProfileSwitcherInline({
  ownProfile,
  activeProfile,
  linkedProfiles,
}: ProfileSwitcherInlineProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleSelect(id: string) {
    if (id === activeProfile.id || isPending) return;
    setActiveCookie(id);
    startTransition(() => {
      router.refresh();
    });
  }

  const allProfiles = [
    { profile: ownProfile, isOwn: true, label: "Mi perfil" },
    ...linkedProfiles.map((p) => ({
      profile: p,
      isOwn: false,
      label: p.full_name.split(" ")[0] ?? p.full_name,
    })),
  ];

  return (
    <div
      data-profile-switcher-inline
      className={cn(
        "border-ink-300 bg-paper-card flex flex-col gap-2 rounded-md border p-3 shadow-sm transition-opacity",
        isPending && "opacity-75",
      )}
    >
      <span className="text-ink-600 text-xs leading-none font-extrabold tracking-wider uppercase">
        Perfiles vinculados
      </span>
      <div className="mt-1 flex flex-wrap gap-2.5">
        {allProfiles.map(({ profile, label }) => {
          const isActive = profile.id === activeProfile.id;
          const teamColor = profile.team_color ?? "var(--pool-blue)";
          return (
            <button
              key={profile.id}
              type="button"
              onClick={() => handleSelect(profile.id)}
              disabled={isPending}
              className={cn(
                "focus-visible:ring-pool-blue inline-flex min-h-11 touch-manipulation items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-bold transition-[background-color,border-color,color,box-shadow] focus-visible:ring-2 focus-visible:outline-none motion-reduce:transition-none",
                isActive
                  ? "bg-pool-deep text-paper shadow-sm"
                  : "border-ink-300 bg-paper text-pool-deep hover:bg-pool-foam",
              )}
              style={isActive ? { borderColor: teamColor } : undefined}
            >
              <Avatar src={profile.photo_url} name={profile.full_name} size={20} />
              <span>{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
