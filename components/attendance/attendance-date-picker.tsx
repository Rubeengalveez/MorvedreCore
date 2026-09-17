"use client";

import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

export function AttendanceDatePicker({
  selectedDay,
  isToday,
}: {
  selectedDay: string;
  isToday: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div className="border-ink-200 mt-3 border-t pt-3">
      <div className="flex min-h-11 items-center justify-between gap-3">
        <label htmlFor="attendance-date" className="text-pool-deep text-sm font-extrabold">
          Elegir otro día
        </label>
        {!isToday ? (
          <Link
            href={"/attendance" as Route}
            className="bg-pool-foam text-pool-blue hover:bg-pool-blue hover:text-paper focus-visible:ring-pool-blue inline-flex min-h-11 touch-manipulation items-center rounded-xl px-3 text-sm font-extrabold transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none motion-reduce:transition-none"
          >
            Volver a hoy
          </Link>
        ) : null}
      </div>
      <input
        key={selectedDay}
        id="attendance-date"
        type="date"
        defaultValue={selectedDay}
        disabled={pending}
        onChange={(event) => {
          const day = event.currentTarget.value;
          if (!day || !event.currentTarget.validity.valid) return;
          startTransition(() => router.push(`/attendance?date=${day}` as Route));
        }}
        className="border-ink-300 bg-paper text-pool-deep focus-visible:ring-pool-blue mt-2 min-h-12 w-full min-w-0 rounded-xl border px-3 font-semibold focus-visible:ring-2 focus-visible:outline-none disabled:opacity-60"
      />
      <p
        role="status"
        className={pending ? "text-pool-blue mt-2 text-sm font-semibold" : "sr-only"}
      >
        {pending ? "Cargando entrenamientos…" : "Fecha preparada"}
      </p>
    </div>
  );
}
