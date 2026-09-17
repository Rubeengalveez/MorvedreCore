"use client";

import { Check, ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils/cn";

export const MATCH_CAP_NUMBERS = Array.from({ length: 14 }, (_, index) => index + 1);

export function CapNumberButton({
  value,
  open,
  disabled,
  label,
  onClick,
}: {
  value: number | null;
  open: boolean;
  disabled?: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-expanded={open}
      aria-label={label}
      className={cn(
        "border-pool-blue/30 bg-pool-foam/60 text-pool-deep focus-visible:outline-pool-blue flex h-12 w-12 items-center justify-center gap-0.5 rounded-full border-2 px-1 font-mono text-lg font-extrabold focus-visible:outline-2 disabled:opacity-60",
        open && "border-pool-blue bg-pool-blue text-paper",
      )}
    >
      {value ?? "—"}
      <ChevronDown
        className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")}
        aria-hidden="true"
      />
    </button>
  );
}

export function CapNumberOptions({
  value,
  occupied,
  allowNone = true,
  onChange,
}: {
  value: number | null;
  occupied: ReadonlySet<number>;
  allowNone?: boolean;
  onChange: (value: number | null) => void;
}) {
  const available = MATCH_CAP_NUMBERS.filter((cap) => !occupied.has(cap) || cap === value);

  return (
    <div className="border-pool-blue/20 bg-paper-card shadow-elev-1 rounded-xl border-2 p-3">
      <p className="text-pool-deep mb-2 text-sm font-bold">Elige un gorro</p>
      <div className="grid grid-cols-5 gap-2">
        {available.map((cap) => (
          <button
            key={cap}
            type="button"
            onClick={() => onChange(cap)}
            aria-pressed={value === cap}
            className={cn(
              "border-ink-200 text-pool-deep focus-visible:outline-pool-blue flex h-11 items-center justify-center rounded-lg border-2 font-mono text-base font-bold focus-visible:outline-2",
              value === cap && "border-pool-blue bg-pool-blue text-paper",
            )}
          >
            {cap}
            {value === cap ? <Check className="ml-1 h-3.5 w-3.5" aria-hidden="true" /> : null}
          </button>
        ))}
      </div>
      {allowNone ? (
        <button
          type="button"
          onClick={() => onChange(null)}
          aria-pressed={value === null}
          className={cn(
            "border-ink-200 text-ink-600 focus-visible:outline-pool-blue mt-2 flex min-h-11 w-full items-center justify-center rounded-lg border text-sm font-bold focus-visible:outline-2",
            value === null && "border-pool-deep bg-pool-deep text-paper",
          )}
        >
          Sin gorro
          {value === null ? <Check className="ml-2 h-4 w-4" aria-hidden="true" /> : null}
        </button>
      ) : null}
    </div>
  );
}
