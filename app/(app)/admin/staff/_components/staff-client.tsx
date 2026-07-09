"use client";

import { MdAdd, MdSearch } from "react-icons/md";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
  const [search, setSearch] = useState("");

  const filteredRows = useMemo(() => {
    const q = search.toLowerCase().trim();
    const base = teamFilter ? rows.filter((r) => r.team_id === teamFilter) : rows;
    if (!q) return base;
    return base.filter(
      (r) => r.profile_name.toLowerCase().includes(q) || r.team_label.toLowerCase().includes(q),
    );
  }, [rows, teamFilter, search]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-pool-deep text-3xl font-extrabold tracking-tight">
            Personal
          </h1>
          <p className="text-ink-600 text-sm">
            Asignaciones de entrenadores, delegados y preparadores.
          </p>
        </div>
        <StaffFormSheet
          teams={teams}
          people={people}
          trigger={
            <Button size="md" className="w-full shrink-0 justify-center sm:w-auto">
              <MdAdd className="h-6 w-6" aria-hidden="true" />
              <span>Nueva asignación</span>
            </Button>
          }
        />
      </div>

      <div className="relative">
        <MdSearch
          className="text-ink-600 pointer-events-none absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2"
          aria-hidden="true"
        />
        <Input
          type="search"
          placeholder="Buscar por nombre o equipo"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
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
