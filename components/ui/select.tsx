"use client";

import * as React from "react";

import { cn } from "@/lib/utils/cn";

export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div className="relative">
        <select
          ref={ref}
          className={cn(
            "border-ink-300 bg-paper text-ink-900 focus-visible:border-pool-blue focus-visible:ring-pool-blue focus-visible:ring-offset-paper flex h-12 min-h-12 w-full appearance-none rounded-[var(--r-sm)] border px-4 py-2 pr-10 text-base transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
            className,
          )}
          {...props}
        >
          {children}
        </select>
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-ink-600 pointer-events-none absolute top-1/2 right-3 h-5 w-5 -translate-y-1/2"
        >
          <path d="M 6 9 L 12 15 L 18 9" />
        </svg>
      </div>
    );
  },
);
Select.displayName = "Select";

export { Select };
