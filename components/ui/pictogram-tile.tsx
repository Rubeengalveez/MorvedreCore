import Link from "next/link";
import type { Route } from "next";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

export interface PictogramTileProps {
  icon: ReactNode;
  title: string;
  description: string;
  href?: string;
  className?: string;
}

export function PictogramTile({
  icon,
  title,
  description,
  href,
  className,
}: PictogramTileProps) {
  const inner = (
    <>
      <div className="shrink-0">{icon}</div>
      <div className="flex flex-1 flex-col gap-1">
        <h3 className="font-display text-xl font-extrabold leading-tight text-brand-deep">
          {title}
        </h3>
        <p className="text-sm leading-relaxed text-ink-600">{description}</p>
      </div>
    </>
  );

  if (href) {
    return (
      <Link
        href={href as Route}
        className={cn(
          "flex min-h-12 items-start gap-3 rounded-md border border-ink-300 bg-paper p-4 transition-colors hover:bg-brand-foam focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2 focus-visible:ring-offset-paper",
          className,
        )}
      >
        {inner}
      </Link>
    );
  }

  return (
    <div
      className={cn(
        "flex min-h-12 items-start gap-3 rounded-md border border-ink-300 bg-paper p-4",
        className,
      )}
    >
      {inner}
    </div>
  );
}
