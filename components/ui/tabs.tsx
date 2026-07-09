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
        "no-scrollbar border-ink-200 bg-paper-card -mx-0 flex items-stretch gap-0 overflow-x-auto border-b",
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
              "font-display focus-visible:ring-pool-blue relative inline-flex min-h-[44px] shrink-0 items-center justify-center px-5 text-sm font-bold whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset",
              isActive ? "text-pool-blue" : "text-ink-500 hover:text-ink-700",
            )}
          >
            {isActive ? (
              <span
                aria-hidden="true"
                className="bg-pool-blue absolute inset-x-0 bottom-0 h-[2px] rounded-t-sm"
              />
            ) : null}
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
