import { cn } from "@/lib/utils/cn";

export interface GenderBadgeProps {
  gender: string;
  className?: string;
}

const GENDER_LABELS: Record<string, string> = {
  male: "Masculino",
  female: "Femenino",
  mixed: "Mixto",
};

export function GenderBadge({ gender, className }: GenderBadgeProps) {
  const label = GENDER_LABELS[gender] ?? gender;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-ink-300 bg-paper px-2.5 py-1 text-xs font-semibold leading-none text-ink-600",
        className,
      )}
    >
      {label}
    </span>
  );
}
