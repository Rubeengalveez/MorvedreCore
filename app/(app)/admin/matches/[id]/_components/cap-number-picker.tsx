"use client";

import { cn } from "@/lib/utils/cn";
import { Eyebrow } from "@/components/ui/eyebrow";

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
        "focus-visible:ring-pool-blue relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg font-mono font-black tabular-nums transition-all focus-visible:ring-2 focus-visible:outline-none",
        value != null
          ? "bg-pool-deep text-paper shadow-elev-1 hover:bg-pool-blue active:scale-95"
          : "border-warning/60 border-2 border-dashed bg-amber-50 text-amber-900 hover:bg-amber-100",
        open && "ring-pool-blue ring-2 ring-offset-2",
        disabled && "cursor-not-allowed opacity-50",
      )}
    >
      {value != null ? (
        <>
          <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-white/25" />
          <span className="text-lg leading-none">{value}</span>
        </>
      ) : (
        <span className="text-[10px] font-extrabold tracking-tight uppercase">Sin nº</span>
      )}
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
    <div className="border-ink-200 bg-paper-sunk/80 rounded-xl border p-3 shadow-inner">
      <Eyebrow tone="default" className="mb-2 block">
        Selecciona un gorro (1 al 14)
      </Eyebrow>
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
        {available.map((cap) => (
          <button
            key={cap}
            type="button"
            onClick={() => onChange(cap)}
            aria-pressed={value === cap}
            className={cn(
              "focus-visible:ring-pool-blue flex min-h-12 items-center justify-center rounded-lg font-mono text-base font-extrabold tabular-nums transition-all focus-visible:ring-2 focus-visible:outline-none",
              value === cap
                ? "bg-pool-deep text-paper shadow-elev-2 scale-105"
                : "border-ink-200 bg-paper-card text-pool-deep hover:bg-pool-foam hover:border-pool-blue/40 border",
            )}
          >
            {cap}
          </button>
        ))}
      </div>
      {allowNone ? (
        <button
          type="button"
          onClick={() => onChange(null)}
          aria-pressed={value === null}
          className={cn(
            "focus-visible:ring-pool-blue mt-2 flex min-h-12 w-full items-center justify-center rounded-lg border text-sm font-extrabold transition-colors focus-visible:ring-2 focus-visible:outline-none",
            value === null
              ? "border-pool-deep bg-pool-deep text-paper"
              : "border-ink-200 bg-paper-card text-ink-600 hover:bg-paper-sunk",
          )}
        >
          Dejar sin gorro
        </button>
      ) : null}
    </div>
  );
}
