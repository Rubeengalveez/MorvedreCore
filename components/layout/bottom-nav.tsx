"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import {
  MdCalendarMonth,
  MdEmojiEvents,
  MdFactCheck,
  MdGroups,
  MdHome,
  MdStorefront,
} from "react-icons/md";

import { cn } from "@/lib/utils/cn";

const baseItems = [
  { href: "/dashboard", label: "Inicio", Icon: MdHome },
  { href: "/calendar", label: "Calendario", Icon: MdCalendarMonth },
  { href: "/rankings", label: "Rankings", Icon: MdEmojiEvents },
  { href: "/team", label: "Equipo", Icon: MdGroups },
  { href: "/shop", label: "Tienda", Icon: MdStorefront },
] as const;

export function BottomNav({ showAttendance }: { showAttendance: boolean }) {
  const pathname = usePathname();
  const items = showAttendance
    ? [
        baseItems[0],
        { href: "/attendance", label: "Asistencia", Icon: MdFactCheck } as const,
        ...baseItems.slice(1),
      ]
    : baseItems;

  return (
    <nav
      aria-label="Navegacion principal Morvedre Core"
      data-bottom-nav
      className="fixed inset-x-0 bottom-0 z-30 min-h-[var(--bottom-nav-height)] px-3 pb-[max(env(safe-area-inset-bottom),12px)] sm:px-6"
    >
      <div
        className={cn(
          "bg-paper/95 shadow-elev-5 relative mx-auto grid h-16 w-full max-w-xl items-stretch rounded-[1.45rem] border border-white/90 p-1.5 backdrop-blur-md md:max-w-2xl",
          showAttendance ? "grid-cols-6" : "grid-cols-5",
        )}
      >
        {items.map((item) => {
          const Icon = item.Icon;
          const href = item.href;
          const isActive =
            pathname === href ||
            pathname.startsWith(`${href}/`) ||
            (href === "/rankings" && pathname.startsWith("/legends"));
          return (
            <Link
              key={href}
              href={href as Route}
              aria-current={isActive ? "page" : undefined}
              aria-label={item.label}
              className={cn(
                "focus-visible:ring-pool-blue group relative flex h-full min-w-0 touch-manipulation flex-col items-center justify-center gap-1 rounded-[1rem] px-1 text-[10px] transition-[background-color,color,transform,box-shadow] duration-200 [-webkit-tap-highlight-color:transparent] focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset active:scale-[0.96] motion-reduce:transition-none sm:text-[11px]",
                isActive
                  ? "bg-pool-deep text-paper shadow-[0_5px_14px_rgba(6,32,72,0.24)]"
                  : "text-ink-600 hover:bg-pool-foam/80 hover:text-pool-deep",
              )}
            >
              <Icon
                className={cn(
                  "h-5 w-5 shrink-0 transition-transform duration-200 motion-reduce:transition-none sm:h-[22px] sm:w-[22px]",
                  isActive ? "scale-110" : "group-hover:-translate-y-px",
                )}
              />
              <span
                className={cn(
                  "max-w-full truncate leading-none",
                  isActive ? "font-extrabold" : "font-semibold",
                )}
              >
                {item.label === "Calendario" ? (
                  <>
                    <span className={showAttendance ? "min-[420px]:hidden" : "min-[390px]:hidden"}>
                      Agenda
                    </span>
                    <span
                      className={
                        showAttendance ? "hidden min-[420px]:inline" : "hidden min-[390px]:inline"
                      }
                    >
                      Calendario
                    </span>
                  </>
                ) : item.label === "Asistencia" ? (
                  <>
                    <span className="min-[420px]:hidden">Lista</span>
                    <span className="hidden min-[420px]:inline">Asistencia</span>
                  </>
                ) : item.label === "Rankings" && showAttendance ? (
                  <>
                    <span className="min-[360px]:hidden">Ránk.</span>
                    <span className="hidden min-[360px]:inline">Rankings</span>
                  </>
                ) : (
                  item.label
                )}
              </span>
              <span
                aria-hidden="true"
                className={cn(
                  "bg-ball-gold absolute bottom-1.5 h-1 w-1 rounded-full transition-opacity duration-200 motion-reduce:transition-none",
                  isActive ? "opacity-100" : "opacity-0",
                )}
              />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
