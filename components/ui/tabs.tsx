"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Route } from "next";

import { cn } from "@/lib/utils/cn";

export interface Tab {
  id: string;
  label: string;
}

export interface TabsProps {
  tabs: Tab[];
  active: string;
  basePath: string;
  className?: string;
}

export function Tabs({ tabs, active, basePath, className }: TabsProps) {
  const pathname = usePathname();
  return (
    <nav
      role="tablist"
      aria-label="Secciones"
      data-tabs
      className={cn(
        "no-scrollbar border-ink-300 bg-paper -mx-4 flex items-stretch gap-1 overflow-x-auto border-b px-4",
        className,
      )}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === active;
        const href = isActive ? basePath : `${basePath}?tab=${tab.id}`;
        const isCurrent = pathname === basePath || pathname?.startsWith(`${basePath}?`);
        return (
          <Link
            key={tab.id}
            href={href as Route}
            role="tab"
            aria-selected={isActive}
            aria-current={isActive && isCurrent ? "page" : undefined}
            data-tab-id={tab.id}
            data-active={isActive}
            className={cn(
              "font-display focus-visible:ring-pool-blue focus-visible:ring-offset-paper inline-flex h-12 min-h-12 shrink-0 items-center justify-center rounded-t-md px-4 text-sm font-bold whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
              isActive
                ? "border-pool-deep bg-pool-deep text-paper border-b-2"
                : "text-pool-deep hover:bg-pool-foam border-b-2 border-transparent",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
