"use client";

import Link from "next/link";
import type { Route } from "next";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils/cn";

export interface PaginationProps {
  page: number;
  totalPages: number;
  totalPlayers: number;
  pageSize: number;
  baseHref: string;
}

function pageHref(baseHref: string, page: number): string {
  const separator = baseHref.includes("?") ? "&" : "?";
  if (page <= 1) return baseHref;
  return `${baseHref}${separator}page=${page}`;
}

function buildPageList(current: number, total: number): Array<number | "ellipsis"> {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const pages: Array<number | "ellipsis"> = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  if (start > 2) pages.push("ellipsis");
  for (let p = start; p <= end; p += 1) pages.push(p);
  if (end < total - 1) pages.push("ellipsis");
  pages.push(total);
  return pages;
}

export function Pagination({
  page,
  totalPages,
  totalPlayers,
  pageSize,
  baseHref,
}: PaginationProps) {
  if (totalPlayers === 0) return null;
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(start + pageSize - 1, totalPlayers);
  const items = buildPageList(page, totalPages);
  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  return (
    <nav aria-label="Paginación del ranking" className="flex flex-col gap-2">
      <p className="text-eyebrow text-ink-600">
        Mostrando {start}-{end} de {totalPlayers}
      </p>
      <div className="flex items-center gap-1">
        <PaginationButton
          href={hasPrev ? pageHref(baseHref, page - 1) : null}
          ariaLabel="Página anterior"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          <span className="hidden sm:inline">Anterior</span>
        </PaginationButton>
        <ul className="flex flex-1 items-center justify-center gap-1">
          {items.map((item, i) =>
            item === "ellipsis" ? (
              <li key={`ellipsis-${i}`} aria-hidden="true" className="text-ink-400 px-1 text-xs">
                …
              </li>
            ) : (
              <li key={item}>
                <Link
                  href={pageHref(baseHref, item) as Route}
                  aria-current={item === page ? "page" : undefined}
                  aria-label={`Página ${item}`}
                  className={cn(
                    "focus-visible:ring-pool-blue focus-visible:ring-offset-paper inline-flex h-10 min-w-10 items-center justify-center rounded-md border px-2 text-sm font-bold transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
                    item === page
                      ? "border-pool-deep bg-pool-deep text-paper"
                      : "border-ink-300 bg-paper text-pool-deep hover:bg-pool-foam",
                  )}
                >
                  {item}
                </Link>
              </li>
            ),
          )}
        </ul>
        <PaginationButton
          href={hasNext ? pageHref(baseHref, page + 1) : null}
          ariaLabel="Página siguiente"
        >
          <span className="hidden sm:inline">Siguiente</span>
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </PaginationButton>
      </div>
    </nav>
  );
}

function PaginationButton({
  href,
  ariaLabel,
  children,
}: {
  href: string | null;
  ariaLabel: string;
  children: React.ReactNode;
}) {
  const className = cn(
    "inline-flex h-10 items-center gap-1 rounded-md border px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pool-blue focus-visible:ring-offset-2 focus-visible:ring-offset-paper",
    href
      ? "border-ink-300 bg-paper text-pool-deep hover:bg-pool-foam"
      : "pointer-events-none border-ink-200 bg-paper-sunk text-ink-400",
  );
  if (!href) {
    return (
      <span aria-disabled="true" aria-label={ariaLabel} className={className}>
        {children}
      </span>
    );
  }
  return (
    <Link href={href as Route} aria-label={ariaLabel} className={className}>
      {children}
    </Link>
  );
}
