"use client";

import { Plus } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";

import {
  StaffFormSheet,
  StaffTable,
  type PersonOption,
  type StaffRow,
  type TeamOption,
} from "./staff-manager";

export interface StaffClientProps {
  rows: StaffRow[];
  teams: TeamOption[];
  people: PersonOption[];
}

export function StaffClient({ rows, teams, people }: StaffClientProps) {
  const [teamFilter, setTeamFilter] = useState<string>("");

  const filteredRows = useMemo(() => {
    if (!teamFilter) return rows;
    return rows.filter((r) => r.team_id === teamFilter);
  }, [rows, teamFilter]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-brand-deep">
            Personal
          </h1>
          <p className="text-sm text-ink-600">
            Asignaciones de entrenadores, delegados y preparadores.
          </p>
        </div>
        <StaffFormSheet
          teams={teams}
          people={people}
          trigger={
            <Button size="md" className="shrink-0">
              <Plus className="h-5 w-5" aria-hidden="true" />
              <span className="hidden sm:inline">Nueva asignación</span>
            </Button>
          }
        />
      </div>

      <StaffTable
        rows={filteredRows}
        teamFilter={teamFilter}
        onTeamFilterChange={setTeamFilter}
        teams={teams}
      />
    </div>
  );
}
