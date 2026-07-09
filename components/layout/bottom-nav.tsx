"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  MdHome,
  MdCalendarMonth,
  MdEmojiEvents,
  MdGroups,
  MdStorefront,
} from "react-icons/md";

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
  const containerRef = useRef<HTMLDivElement>(null);
  const [pill, setPill] = useState({ left: 0, width: 0 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const activeLink = container.querySelector<HTMLElement>("[data-tab-active='true']");
    if (!activeLink) return;

    const cRect = container.getBoundingClientRect();
    const tRect = activeLink.getBoundingClientRect();

    setPill({
      left: tRect.left - cRect.left + container.scrollLeft,
      width: tRect.width,
    });
  }, [pathname]);

  return (
    <nav
      aria-label="Navegacion principal Morvedre Core"
      data-bottom-nav
      className="fixed inset-x-0 bottom-0 z-30 min-h-[var(--bottom-nav-height)] px-4 pb-[max(env(safe-area-inset-bottom),12px)]"
    >
      <div
        ref={containerRef}
        className="bg-paper shadow-elev-5 relative mx-auto grid h-[60px] max-w-md grid-cols-5 items-stretch overflow-hidden rounded-full border border-ink-200/60 p-1"
      >
        <span
          aria-hidden="true"
          className="bg-pool-deep absolute top-1 bottom-1 rounded-full shadow-md transition-all duration-300 ease-out"
          style={{
            left: `${pill.left}px`,
            width: `${pill.width}px`,
          }}
        />

        {items.map((item) => {
          const Icon = item.Icon;
          const href = item.href;
          const isActive = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href as Route}
              aria-current={isActive ? "page" : undefined}
              data-tab-active={isActive}
              className={cn(
                "focus-visible:ring-pool-blue relative z-10 flex h-full w-full flex-col items-center justify-center gap-0.5 rounded-full px-1 transition-colors focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset",
                isActive ? "text-paper" : "text-ink-500 hover:text-pool-deep",
              )}
            >
              <Icon
                className={cn(
                  "h-5 w-5 shrink-0 transition-transform duration-300",
                  isActive && "scale-110",
                )}
              />
              <span
                className={cn(
                  "max-w-full truncate text-[11px] leading-none transition-all duration-300",
                  isActive ? "font-extrabold" : "font-semibold",
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
