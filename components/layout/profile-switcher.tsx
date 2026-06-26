"use client";

import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils/cn";

export interface ProfileSummary {
  id: string;
  full_name: string;
  photo_url: string | null;
  category_code?: string | null;
}

const ACTIVE_COOKIE = "morvedre_active_profile_id";
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

function setActiveCookie(id: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${ACTIVE_COOKIE}=${id}; Path=/; Max-Age=${ONE_YEAR_SECONDS}; SameSite=Lax`;
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function Avatar({
  name,
  size = 40,
  className,
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  const initials = getInitials(name) || "?";
  const fontSize = Math.max(11, Math.round(size * 0.4));
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-brand-blue text-paper font-display font-extrabold leading-none",
        className,
      )}
      style={{ width: `${size}px`, height: `${size}px`, fontSize: `${fontSize}px` }}
    >
      {initials}
    </span>
  );
}

export interface ProfileSwitcherProps {
  activeProfile: ProfileSummary;
  linkedProfiles: ProfileSummary[];
}

export function ProfileSwitcher({
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
          <Avatar name={activeProfile.full_name} size={triggerSize} />
        </Button>
      </SheetTrigger>
      <SheetContent size="md" className="gap-0">
        <SheetHeader className="flex-row items-center gap-3">
          <Logo size={32} />
          <SheetTitle>Cambiar de perfil</SheetTitle>
        </SheetHeader>
        <SheetBody className="pb-[env(safe-area-inset-bottom)]">
          <div className="flex flex-col">
            <button
              type="button"
              onClick={() => handleSelect(activeProfile.id)}
              disabled={isPending}
              className="flex items-center gap-3 rounded-md px-2 py-3 text-left transition-colors hover:bg-brand-foam disabled:opacity-50"
            >
              <Avatar name={activeProfile.full_name} size={48} />
              <span className="flex flex-1 flex-col">
                <span className="font-display text-base font-bold text-brand-deep">
                  Mi perfil
                </span>
                <span className="text-sm text-ink-600">
                  {activeProfile.full_name}
                </span>
              </span>
            </button>
            {hasLinked ? (
              <div className="my-2 h-px bg-ink-300" aria-hidden="true" />
            ) : null}
            {linkedProfiles.map((p) => {
              const isActive = p.id === activeProfile.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleSelect(p.id)}
                  disabled={isPending}
                  className="flex items-center gap-3 rounded-md px-2 py-3 text-left transition-colors hover:bg-brand-foam disabled:opacity-50"
                >
                  <Avatar name={p.full_name} size={48} />
                  <span className="flex flex-1 flex-col">
                    <span className="font-display text-base font-bold text-brand-deep">
                      {p.full_name}
                    </span>
                    {p.category_code ? (
                      <span className="text-sm text-ink-600">
                        {p.category_code}
                      </span>
                    ) : null}
                  </span>
                  {isActive ? (
                    <Check
                      className="h-5 w-5 text-brand-blue"
                      aria-label="Perfil activo"
                    />
                  ) : null}
                </button>
              );
            })}
          </div>
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
