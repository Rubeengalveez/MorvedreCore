"use client";

import { Plus, Search } from "lucide-react";
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
      (r) =>
        r.profile_name.toLowerCase().includes(q) ||
        r.team_label.toLowerCase().includes(q),
    );
  }, [rows, teamFilter, search]);

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

      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-600"
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
