"use client";

import Link, { useLinkStatus } from "next/link";
import type { Route } from "next";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export function TeamNavigation({
  items,
  label,
}: {
  items: Array<{ href: string; label: string; active: boolean }>;
  label: string;
}) {
  return (
    <nav
      aria-label={label}
      className={cn(
        "grid gap-2",
        items.length === 4 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-3",
      )}
    >
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href as Route}
          replace
          scroll={false}
          aria-current={item.active ? "page" : undefined}
          className={cn(
            "focus-visible:outline-pool-blue relative flex min-h-14 items-center justify-center rounded-xl border-2 px-2 py-3 text-center text-base font-extrabold focus-visible:outline-2 focus-visible:outline-offset-2",
            item.active
              ? "bg-pool-deep border-pool-deep text-white"
              : "border-pool-deep/65 text-pool-deep bg-white",
          )}
        >
          <NavigationLabel label={item.label} />
        </Link>
      ))}
    </nav>
  );
}

function NavigationLabel({ label }: { label: string }) {
  const { pending } = useLinkStatus();
  return (
    <span className="relative inline-flex items-center justify-center">
      <span className={pending ? "opacity-0" : ""}>{label}</span>
      {pending ? (
        <Loader2 className="absolute h-6 w-6 motion-safe:animate-spin" aria-hidden="true" />
      ) : null}
      <span role="status" className="sr-only">
        {pending ? `Cargando ${label}…` : ""}
      </span>
    </span>
  );
}
