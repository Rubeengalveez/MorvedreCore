"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import { MdHome, MdCalendarMonth, MdEmojiEvents, MdGroups, MdStorefront } from "react-icons/md";

import { cn } from "@/lib/utils/cn";

const items = [
  { href: "/dashboard", label: "Inicio", Icon: MdHome },
  { href: "/calendar", label: "Calendario", Icon: MdCalendarMonth },
  { href: "/rankings", label: "Rankings", Icon: MdEmojiEvents },
  { href: "/team", label: "Equipo", Icon: MdGroups },
  { href: "/shop", label: "Tienda", Icon: MdStorefront },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navegacion principal Morvedre Core"
      data-bottom-nav
      className="fixed inset-x-0 bottom-0 z-30 min-h-[var(--bottom-nav-height)] px-3 pb-[max(env(safe-area-inset-bottom),8px)]"
    >
      <ul className="border-ink-300/90 bg-paper-card/96 shadow-elev-5 mx-auto grid h-14 max-w-2xl grid-cols-5 items-stretch rounded-lg border p-1 backdrop-blur-md">
        {items.map((item) => {
          const Icon = item.Icon;
          const href = item.href;
          const isActive = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href} className="min-w-0">
              <Link
                href={href as Route}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "focus-visible:ring-pool-blue relative flex h-full w-full flex-col items-center justify-center gap-0.5 rounded-md px-1 transition-all focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset",
                  isActive
                    ? "bg-pool-deep text-paper shadow-sm"
                    : "text-ink-500 hover:bg-pool-foam/70 hover:text-pool-deep",
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span
                  className={cn(
                    "max-w-full truncate text-[11px] leading-none",
                    isActive ? "text-paper font-extrabold" : "font-semibold",
                  )}
                >
                  {item.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
