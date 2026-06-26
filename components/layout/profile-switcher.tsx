"use client";

import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Logo } from "@/components/brand/logo";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  CATEGORY_LABELS,
  type CategoryCode,
} from "@/lib/domain/categories";
import {
  ACTIVE_COOKIE,
  type ProfileSummary,
} from "@/server/queries/profile-types";
import { cn } from "@/lib/utils/cn";

export type { ProfileSummary } from "@/server/queries/profile-types";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

function setActiveCookie(id: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${ACTIVE_COOKIE}=${id}; Path=/; Max-Age=${ONE_YEAR_SECONDS}; SameSite=Lax; Secure`;
}

function categoryLabel(birthYear: number | null | undefined): string | null {
  if (birthYear == null) return null;
  const currentYear = new Date().getFullYear();
  if (birthYear > currentYear) return null;
  if (birthYear < currentYear - 25) return null;
  const age = currentYear - birthYear;
  let code: CategoryCode;
  if (age <= 11) code = "benjamin";
  else if (age <= 13) code = "alevin";
  else if (age <= 15) code = "infantil";
  else if (age <= 17) code = "cadete";
  else if (age <= 19) code = "juvenil";
  else code = "absoluto";
  return CATEGORY_LABELS[code];
}

function subtitleFor(profile: ProfileSummary, isOwn: boolean): string {
  const parts: string[] = [];
  if (isOwn) {
    parts.push(profile.full_name);
  }
  const cat = categoryLabel(profile.birth_year);
  if (cat) parts.push(cat);
  return parts.length > 0 ? parts.join(" · ") : "—";
}

export interface ProfileSwitcherProps {
  ownProfile: ProfileSummary;
  activeProfile: ProfileSummary;
  linkedProfiles: ProfileSummary[];
}

export function ProfileSwitcher({
  ownProfile,
  activeProfile,
  linkedProfiles,
}: ProfileSwitcherProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSelect(id: string) {
    setOpen(false);
    if (id === activeProfile.id) return;
    setActiveCookie(id);
    startTransition(() => {
      router.refresh();
    });
  }

  const hasLinked = linkedProfiles.length > 0;
  const ownIsActive = ownProfile.id === activeProfile.id;
  const triggerSize = 40;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          type="button"
          aria-label="Cambiar de perfil"
          variant="ghost"
          size="sm"
          className="h-12 w-12 rounded-full border border-ink-300 bg-brand-foam p-0 text-brand-deep hover:bg-brand-foam"
          disabled={isPending}
        >
          <Avatar
            src={activeProfile.photo_url}
            name={activeProfile.full_name}
            size={triggerSize}
          />
        </Button>
      </SheetTrigger>
      <SheetContent size="md" className="gap-0">
        <SheetHeader className="flex-row items-center gap-3">
          <Logo size={32} />
          <SheetTitle>Cambiar de perfil</SheetTitle>
        </SheetHeader>
        <SheetBody className="pb-[env(safe-area-inset-bottom)]">
          <div className="flex flex-col">
            <SwitchRow
              title="Mi perfil"
              subtitle={subtitleFor(ownProfile, true)}
              profile={ownProfile}
              isActive={ownIsActive}
              disabled={isPending}
              onSelect={handleSelect}
            />
            {hasLinked ? (
              <div className="my-2 h-px bg-ink-300" aria-hidden="true" />
            ) : null}
            {hasLinked ? (
              <p className="px-2 pb-1 pt-1 text-xs font-semibold uppercase tracking-wider text-ink-600">
                Familia
              </p>
            ) : null}
            {linkedProfiles.map((p) => {
              const isActive = p.id === activeProfile.id;
              return (
                <SwitchRow
                  key={p.id}
                  title={p.full_name}
                  subtitle={subtitleFor(p, false)}
                  profile={p}
                  isActive={isActive}
                  disabled={isPending}
                  onSelect={handleSelect}
                />
              );
            })}
          </div>
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}

function SwitchRow({
  title,
  subtitle,
  profile,
  isActive,
  disabled,
  onSelect,
}: {
  title: string;
  subtitle: string;
  profile: ProfileSummary;
  isActive: boolean;
  disabled: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(profile.id)}
      disabled={disabled}
      aria-label={`${title}${subtitle ? `, ${subtitle}` : ""}${isActive ? ", activo" : ""}`}
      className={cn(
        "flex items-center gap-3 rounded-md px-2 py-3 text-left transition-colors hover:bg-brand-foam disabled:opacity-50",
        isActive ? "bg-brand-foam" : "",
      )}
    >
      <Avatar src={profile.photo_url} name={profile.full_name} size={48} />
      <span className="flex flex-1 flex-col">
        <span className="font-display text-base font-bold text-brand-deep">
          {title}
        </span>
        <span className="text-sm text-ink-600">{subtitle}</span>
      </span>
      {isActive ? (
        <Check
          className="h-5 w-5 text-brand-blue"
          aria-hidden="true"
        />
      ) : null}
    </button>
  );
}
