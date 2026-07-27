import Link from "next/link";
import type { Route } from "next";
import {
  Check,
  ChevronRight,
  CircleUserRound,
  Plus,
  type LucideIcon,
  UserRoundPen,
} from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils/cn";

export interface ProfileCheck {
  label: string;
  complete: boolean;
  icon: LucideIcon;
  href: string;
}

export interface ProfileActionLink {
  href: string;
  label: string;
  detail: string;
  icon: LucideIcon;
}

export function ProfileIdentity({
  name,
  photoUrl,
  teamColor,
  roleLabels,
}: {
  name: string;
  photoUrl: string | null;
  teamColor: string;
  roleLabels: string[];
}) {
  return (
    <header className="border-ink-200 bg-paper-card shadow-elev-1 relative overflow-hidden rounded-2xl border">
      <span className="lane-pattern opacity-25" aria-hidden="true" />
      <span
        className="absolute inset-x-0 top-0 h-1"
        style={{ backgroundColor: teamColor }}
        aria-hidden="true"
      />
      <div className="relative flex items-center gap-4 px-4 py-4 sm:px-5">
        <Avatar name={name} src={photoUrl} size={76} teamColor={teamColor} />
        <div className="min-w-0 flex-1">
          <p className="text-pool-blue text-sm font-extrabold">Tu perfil</p>
          <h1 className="font-display text-pool-deep mt-0.5 text-xl leading-tight font-extrabold tracking-tight break-words sm:text-2xl">
            {name}
          </h1>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {roleLabels.length > 0 ? (
              roleLabels.map((role) => (
                <span
                  key={role}
                  className="border-ink-200 bg-paper-sunk text-ink-700 inline-flex min-h-7 items-center rounded-full border px-2.5 text-sm font-bold"
                >
                  {role}
                </span>
              ))
            ) : (
              <span className="text-ink-600 text-sm font-semibold">Miembro del club</span>
            )}
          </div>
        </div>
        <Link
          href={"/profile/edit" as Route}
          aria-label="Editar tu perfil"
          className="border-ink-200 bg-paper hover:border-pool-blue focus-visible:ring-pool-blue text-pool-blue flex h-12 w-12 shrink-0 touch-manipulation items-center justify-center rounded-xl border transition-[border-color,background-color,transform] focus-visible:ring-2 focus-visible:outline-none active:scale-[0.96] motion-reduce:transition-none"
        >
          <UserRoundPen className="h-5 w-5" aria-hidden="true" />
        </Link>
      </div>
    </header>
  );
}

export function ProfileReadiness({
  items,
  completed,
}: {
  items: ProfileCheck[];
  completed: number;
}) {
  const percentage = Math.round((completed / items.length) * 100);
  const isComplete = completed === items.length;

  return (
    <section
      aria-labelledby="profile-readiness-title"
      className="border-ink-200 bg-paper-card shadow-elev-1 overflow-hidden rounded-2xl border"
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <span className="bg-pool-foam text-pool-blue flex h-11 w-11 shrink-0 items-center justify-center rounded-xl">
          {isComplete ? (
            <Check className="h-5 w-5" aria-hidden="true" />
          ) : (
            <CircleUserRound className="h-5 w-5" aria-hidden="true" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <h2 id="profile-readiness-title" className="text-pool-deep font-extrabold">
              {isComplete ? "Perfil preparado" : "Completa tu perfil"}
            </h2>
            <span className="text-ink-600 font-mono text-sm font-extrabold tabular-nums">
              {completed}/{items.length}
            </span>
          </div>
          <p className="text-ink-700 mt-0.5 text-sm text-pretty">
            {isComplete
              ? "El club puede identificarte y contactar contigo cuando haga falta."
              : "Pulsa en un dato pendiente para completarlo ahora."}
          </p>
          <span
            className="bg-ink-100 mt-2 block h-1.5 overflow-hidden rounded-full"
            aria-label={`${percentage}% del perfil completado`}
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percentage}
          >
            <span
              className="bg-pool-blue block h-full origin-left rounded-full transition-transform duration-300 motion-reduce:transition-none"
              style={{ transform: `scaleX(${percentage / 100})` }}
            />
          </span>
        </div>
      </div>
      <div
        className={cn(
          "border-ink-200 grid border-t",
          items.length === 2 ? "grid-cols-2" : "grid-cols-3",
        )}
      >
        {items.map(({ label, complete, icon: Icon, href }) => (
          <Link
            key={label}
            href={href as Route}
            aria-label={`${complete ? "Editar" : "Añadir"} ${label.toLowerCase()}`}
            className={cn(
              "border-ink-200 focus-visible:ring-pool-blue group relative flex min-h-16 touch-manipulation flex-col items-center justify-center gap-1 border-r px-2 py-2 text-center transition-[background-color,color,transform] duration-200 last:border-r-0 focus-visible:z-10 focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset active:scale-[0.97] motion-reduce:transition-none",
              complete ? "hover:bg-pool-foam/60" : "bg-ball-gold/10 hover:bg-ball-gold/20",
            )}
          >
            <span
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-full",
                complete ? "bg-success/12 text-success" : "bg-ball-gold/35 text-pool-deep",
              )}
            >
              {complete ? (
                <Check className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Icon className="h-4 w-4" aria-hidden="true" />
              )}
            </span>
            <span className="text-pool-deep text-sm leading-tight font-extrabold">{label}</span>
            {!complete ? (
              <span className="text-ink-700 inline-flex items-center gap-0.5 text-xs font-bold">
                <Plus className="h-3 w-3" aria-hidden="true" />
                Añadir
              </span>
            ) : null}
          </Link>
        ))}
      </div>
    </section>
  );
}

export function ActionGroup({
  title,
  description,
  icon: Icon,
  links,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  links: ProfileActionLink[];
}) {
  return (
    <article className="border-ink-300 bg-paper-card shadow-elev-2 relative overflow-hidden rounded-2xl border">
      <div className="border-ink-200 relative flex items-start gap-3 border-b bg-white px-4 py-3.5">
        <span className="bg-pool-deep text-paper shadow-elev-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h3 className="text-pool-deep text-base font-extrabold">{title}</h3>
          <p className="text-ink-700 mt-0.5 text-sm leading-snug text-pretty">{description}</p>
        </div>
      </div>
      <div className="divide-ink-200 divide-y">
        {links.map((item) => (
          <SettingsLink
            key={item.href}
            href={item.href}
            label={item.label}
            detail={item.detail}
            icon={item.icon}
          />
        ))}
      </div>
    </article>
  );
}

export function SettingsLink({
  href,
  label,
  detail,
  icon: Icon,
}: {
  href: string;
  label: string;
  detail?: string;
  icon: LucideIcon;
}) {
  return (
    <Link
      href={href as Route}
      className="hover:bg-pool-foam/60 focus-visible:ring-pool-blue group flex min-h-14 touch-manipulation items-center gap-3 px-4 py-2.5 transition-[background-color,transform] duration-200 focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset active:scale-[0.99] motion-reduce:transition-none"
    >
      <Icon className="text-pool-blue h-5 w-5 shrink-0" aria-hidden="true" />
      <span className="min-w-0 flex-1">
        <span className="text-pool-deep block text-sm font-bold">{label}</span>
        {detail ? (
          <span className="text-ink-700 mt-0.5 block text-sm leading-snug">{detail}</span>
        ) : null}
      </span>
      <ChevronRight
        className="text-ink-400 h-5 w-5 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none"
        aria-hidden="true"
      />
    </Link>
  );
}
