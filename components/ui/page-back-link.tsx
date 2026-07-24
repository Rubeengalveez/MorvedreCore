import type { Route } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

export interface PageBackLinkProps {
  href: Route;
  children: ReactNode;
  className?: string;
}

export function PageBackLink({ href, children, className }: PageBackLinkProps) {
  return (
    <Link
      href={href}
      data-page-back
      className={cn(
        "text-pool-blue hover:bg-pool-foam hover:text-pool-deep focus-visible:ring-pool-blue -ml-2 -mb-2 inline-flex min-h-12 w-fit touch-manipulation items-center gap-2 rounded-xl px-2 text-sm font-extrabold transition-[background-color,color,transform] focus-visible:ring-2 focus-visible:outline-none active:translate-x-[-2px] motion-reduce:transition-none",
        className,
      )}
    >
      <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </Link>
  );
}
