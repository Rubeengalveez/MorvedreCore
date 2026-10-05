"use client";

import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

export function AttendanceSummaryCategory({
  teams,
  selectedTeamId,
  baseHref,
}: {
  teams: Array<{ id: string; label: string }>;
  selectedTeamId: string;
  baseHref: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <div className="mt-3" aria-busy={pending}>
      <label htmlFor="attendance-team" className="text-pool-deep text-sm font-extrabold">
        Categoría
      </label>
      <select
        key={selectedTeamId}
        id="attendance-team"
        defaultValue={selectedTeamId}
        disabled={pending}
        onChange={(event) => {
          const team = event.target.value;
          const href = `${baseHref}${team === "all" ? "" : `&team=${encodeURIComponent(team)}`}`;
          startTransition(() => router.replace(href as Route, { scroll: false }));
        }}
        className="border-pool-deep/65 bg-paper text-pool-deep focus-visible:ring-pool-blue mt-2 min-h-12 w-full min-w-0 rounded-xl border px-3 text-base font-semibold focus-visible:ring-2 focus-visible:outline-none disabled:opacity-60"
      >
        <option value="all">Todas las categorías</option>
        {teams.map((team) => (
          <option key={team.id} value={team.id}>
            {team.label}
          </option>
        ))}
      </select>
      <span role="status" className="sr-only">
        {pending ? "Cargando categoría…" : "Resumen cargado"}
      </span>
    </div>
  );
}
