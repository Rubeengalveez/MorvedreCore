import Link from "next/link";
import type { Route } from "next";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

export interface ActionCardProps {
  accentColor?: string;
  pictogram: ReactNode;
  title: string;
  subtitle: string;
  meta?: string;
  cta: {
    label: string;
    href: string;
  };
  className?: string;
}

export function ActionCard({
  accentColor = "var(--brand-blue)",
  pictogram,
  title,
  subtitle,
  meta,
  cta,
  className,
}: ActionCardProps) {
  return (
    <article
      className={cn(
        "overflow-hidden rounded-md border border-ink-300 bg-paper",
        className,
      )}
    >
      <div
        aria-hidden="true"
        className="block h-2 w-full"
        style={{ backgroundColor: accentColor }}
      />
      <div className="flex flex-col gap-5 p-5">
        <div className="flex items-start gap-4">
          <div className="shrink-0">{pictogram}</div>
          <div className="flex flex-1 flex-col gap-1">
            <h3 className="font-display text-xl font-extrabold leading-tight text-brand-deep">
              {title}
            </h3>
            <p className="text-base font-medium text-ink-900">{subtitle}</p>
            {meta ? (
              <p className="text-sm leading-relaxed text-ink-600">{meta}</p>
            ) : null}
          </div>
        </div>
        <div className="flex justify-end">
          <Button asChild size="md">
            <Link href={cta.href as Route}>{cta.label}</Link>
          </Button>
        </div>
      </div>
    </article>
  );
}
