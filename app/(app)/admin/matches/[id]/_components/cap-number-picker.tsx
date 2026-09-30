"use client";

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
        "focus-visible:ring-pool-blue relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg font-mono font-black tabular-nums transition-all focus-visible:ring-2 focus-visible:outline-none",
        value != null
          ? "bg-pool-deep text-paper shadow-elev-1 hover:bg-pool-blue active:scale-95"
          : "border-pool-blue bg-pool-ice text-pool-deep hover:bg-pool-foam border-2 border-dashed",
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
        <span className="font-sans text-sm font-extrabold">Sin nº</span>
      )}
    </button>
  );
}

export function CapNumberOptions({
  value,
  occupied,
  onChange,
}: {
  value: number | null;
  occupied: ReadonlySet<number>;
  onChange: (value: number | null) => void;
}) {
  return (
    <div className="border-pool-blue bg-pool-ice rounded-xl border-2 p-3">
      <p className="text-pool-deep mb-3 text-sm font-extrabold">Elige un gorro</p>
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
        {MATCH_CAP_NUMBERS.map((cap) => (
          <button
            key={cap}
            type="button"
            onClick={() => onChange(cap)}
            aria-pressed={value === cap}
            aria-label={
              value === cap
                ? `Gorro ${cap}, asignado a este jugador`
                : occupied.has(cap)
                  ? `Intercambiar con el gorro ${cap}`
                  : `Asignar gorro ${cap}`
            }
            className={cn(
              "focus-visible:ring-pool-deep flex min-h-12 items-center justify-center rounded-lg border-2 font-mono text-base font-extrabold tabular-nums transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
              value === cap
                ? "border-pool-deep bg-pool-deep text-paper shadow-elev-1"
                : occupied.has(cap)
                  ? "border-pool-blue bg-pool-blue text-paper hover:bg-pool-deep"
                  : "border-pool-blue bg-paper-card text-pool-deep hover:bg-pool-foam",
            )}
          >
            {cap}
          </button>
        ))}
        <button
          type="button"
          onClick={() => onChange(null)}
          aria-pressed={value === null}
          aria-label={value === null ? "Sin gorro, seleccionado" : "Dejar sin gorro"}
          className={cn(
            "focus-visible:ring-pool-deep col-span-2 flex min-h-12 items-center justify-center rounded-lg border-2 px-2 text-sm font-extrabold transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none sm:col-span-7",
            value === null
              ? "border-pool-deep bg-pool-deep text-paper"
              : "border-pool-blue bg-paper-card text-pool-deep hover:bg-pool-foam",
          )}
        >
          Sin gorro
        </button>
      </div>
    </div>
  );
}
