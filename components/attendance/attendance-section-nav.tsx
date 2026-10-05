import type { Route } from "next";
import Link from "next/link";
import { CalendarRange, ClipboardCheck } from "lucide-react";

import { cn } from "@/lib/utils/cn";

export function AttendanceSectionNav({
  current,
  origin,
  calendarContext = "",
}: {
  current: "list" | "summary";
  origin?: "profile-activity" | "dashboard" | "calendar";
  calendarContext?: string;
}) {
  return (
    <nav
      aria-label="Secciones de asistencia"
      className="border-pool-deep/65 bg-paper-card grid grid-cols-2 gap-2 rounded-xl border-2 p-1"
    >
      <Link
        href={
          (origin
            ? `/attendance?from=${origin}${calendarContext ? `&${calendarContext}` : ""}`
            : "/attendance") as Route
        }
        aria-current={current === "list" ? "page" : undefined}
        className={cn(
          "focus-visible:ring-pool-blue border-pool-deep/65 flex min-h-12 items-center justify-center gap-2 rounded-lg border px-2 text-sm font-extrabold whitespace-nowrap focus-visible:ring-2 focus-visible:outline-none",
          current === "list" ? "bg-pool-deep text-paper" : "text-pool-deep hover:bg-pool-foam",
        )}
      >
        <ClipboardCheck className="h-5 w-5" aria-hidden="true" />
        Pasar lista
      </Link>
      <Link
        href={
          (origin
            ? `/attendance/summary?from=${origin}${calendarContext ? `&${calendarContext}` : ""}`
            : "/attendance/summary") as Route
        }
        aria-current={current === "summary" ? "page" : undefined}
        className={cn(
          "focus-visible:ring-pool-blue border-pool-deep/65 flex min-h-12 items-center justify-center gap-2 rounded-lg border px-2 text-sm font-extrabold whitespace-nowrap focus-visible:ring-2 focus-visible:outline-none",
          current === "summary" ? "bg-pool-deep text-paper" : "text-pool-deep hover:bg-pool-foam",
        )}
      >
        <CalendarRange className="h-5 w-5" aria-hidden="true" />
        Ver resumen
      </Link>
    </nav>
  );
}
