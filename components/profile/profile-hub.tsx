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
  const displayedRoles = roleLabels.length > 0 ? roleLabels : ["Miembro del club"];
  const roleGridClass =
    displayedRoles.length === 1
      ? "grid-cols-1"
      : displayedRoles.length === 2
        ? "grid-cols-2"
        : displayedRoles.length === 3
          ? "grid-cols-3"
          : "grid-cols-2 sm:grid-cols-3";

  return (
    <header className="border-ink-200 bg-paper-card shadow-elev-3 relative overflow-hidden rounded-[1.75rem] border">
      <span
        className="absolute inset-x-0 top-0 z-20 h-1"
        style={{ backgroundColor: teamColor }}
        aria-hidden="true"
      />

      <div className="relative overflow-hidden bg-[linear-gradient(135deg,#041a3a_0%,#0a3c7b_58%,#1657a8_100%)] px-4 pt-4 pb-5 sm:px-5 sm:pt-5">
        <span className="lane-pattern-strong opacity-20" aria-hidden="true" />
        <div className="relative">
          <div className="flex min-h-12 items-center justify-between gap-3">
            <p className="text-paper/75 text-xs font-extrabold tracking-[0.12em] uppercase">
              Tu perfil
            </p>
            <Link
              href={"/profile/edit" as Route}
              aria-label="Editar tu perfil"
              className="text-paper hover:bg-paper/20 focus-visible:ring-paper flex h-12 w-12 shrink-0 touch-manipulation items-center justify-center rounded-xl border border-white/25 bg-white/10 shadow-sm backdrop-blur-sm transition-[background-color,transform] focus-visible:ring-2 focus-visible:outline-none active:scale-[0.96] motion-reduce:transition-none"
            >
              <UserRoundPen className="h-5 w-5" aria-hidden="true" />
            </Link>
          </div>

          <div className="mt-2 flex min-w-0 items-center gap-3.5 sm:gap-4">
            <Avatar
              name={name}
              src={photoUrl}
              size={84}
              teamColor={teamColor}
              className="ring-paper-card/95 shadow-elev-4 ring-4"
            />
            <div className="min-w-0 flex-1">
              <p className="text-paper/65 text-xs font-bold">Identidad del club</p>
              <h1 className="font-display text-paper mt-1 text-[1.35rem] leading-[1.08] font-extrabold tracking-tight text-balance break-words sm:text-2xl">
                {name}
              </h1>
            </div>
          </div>
        </div>
      </div>

      <div className="px-3.5 py-3.5 sm:px-5 sm:py-4">
        <div className="flex items-end justify-between gap-3 px-0.5">
          <p
            id="profile-roles-title"
            className="text-ink-600 text-[0.6875rem] font-extrabold tracking-[0.12em] uppercase"
          >
            Funciones en el club
          </p>
          <p className="text-pool-blue shrink-0 text-xs font-bold">
            <span className="font-mono font-extrabold tabular-nums">
              {roleLabels.length.toString().padStart(2, "0")}
            </span>{" "}
            {roleLabels.length === 1 ? "activa" : "activas"}
          </p>
        </div>

        <ol
          aria-labelledby="profile-roles-title"
          className={cn(
            "border-ink-200 bg-ink-200 mt-2.5 grid gap-px overflow-hidden rounded-xl border",
            roleGridClass,
          )}
        >
          {displayedRoles.map((role, index) => (
            <li
              key={role}
              className="bg-paper-card flex min-h-14 min-w-0 flex-col justify-center px-1.5 py-2.5 min-[360px]:px-2.5 sm:px-3"
            >
              <span
                aria-hidden="true"
                className="text-pool-blue font-mono text-[0.625rem] leading-none font-extrabold tabular-nums"
              >
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="text-pool-deep mt-1 text-[0.72rem] leading-tight font-extrabold break-words min-[360px]:text-[0.8125rem]">
                {role}
              </span>
            </li>
          ))}
        </ol>
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
