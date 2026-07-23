import type { Route } from "next";
import Link from "next/link";
import { CalendarRange, ClipboardCheck } from "lucide-react";

import { cn } from "@/lib/utils/cn";

export function AttendanceSectionNav({ current }: { current: "list" | "summary" }) {
  return (
    <nav
      aria-label="Secciones de asistencia"
      className="border-ink-200 bg-paper-card grid grid-cols-2 rounded-xl border p-1"
    >
      <Link
        href={"/attendance" as Route}
        aria-current={current === "list" ? "page" : undefined}
        className={cn(
          "focus-visible:ring-pool-blue flex min-h-12 items-center justify-center gap-2 rounded-lg px-2 text-sm font-extrabold focus-visible:ring-2 focus-visible:outline-none",
          current === "list" ? "bg-pool-deep text-paper" : "text-ink-700 hover:bg-pool-foam",
        )}
      >
        <ClipboardCheck className="h-5 w-5" aria-hidden="true" />
        Pasar lista
      </Link>
      <Link
        href={"/attendance/summary" as Route}
        aria-current={current === "summary" ? "page" : undefined}
        className={cn(
          "focus-visible:ring-pool-blue flex min-h-12 items-center justify-center gap-2 rounded-lg px-2 text-sm font-extrabold focus-visible:ring-2 focus-visible:outline-none",
          current === "summary" ? "bg-pool-deep text-paper" : "text-ink-700 hover:bg-pool-foam",
        )}
      >
        <CalendarRange className="h-5 w-5" aria-hidden="true" />
        Ver resumen
      </Link>
    </nav>
  );
}
