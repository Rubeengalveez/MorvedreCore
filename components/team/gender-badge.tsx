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
        "border-ink-300 bg-paper text-ink-600 inline-flex items-center rounded-full border px-2.5 py-1 text-xs leading-none font-semibold",
        className,
      )}
    >
      {label}
    </span>
  );
}
