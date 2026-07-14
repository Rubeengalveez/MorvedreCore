"use client";

import { MdAdd, MdSearch } from "react-icons/md";
import { BadgeCheck, Check, Loader2, ShieldCheck } from "lucide-react";
import { useMemo, useState, useTransition } from "react";

import { AdminPageHeader } from "@/components/admin/admin-page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  ADMIN_PERMISSIONS,
  PERMISSION_LABELS,
  type AdminPermission,
} from "@/lib/domain/permissions";
import { cn } from "@/lib/utils/cn";
import { setProfileAdminPermission } from "@/server/actions/admin/players";

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
  permissionsByProfile: Record<string, AdminPermission[]>;
  canGrantPermissions: boolean;
}

export function StaffClient({
  rows,
  teams,
  people,
  permissionsByProfile,
  canGrantPermissions,
}: StaffClientProps) {
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
      <AdminPageHeader
        title="Personal"
        description="Asignaciones del equipo y permisos para pasar lista."
        icon={<BadgeCheck className="h-6 w-6" aria-hidden="true" />}
        action={
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
        }
      />

      {canGrantPermissions ? (
        <PermissionsManager people={people} initialPermissions={permissionsByProfile} />
      ) : null}

      <div className="relative">
        <MdSearch
          className="text-ink-600 pointer-events-none absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2"
          aria-hidden="true"
        />
        <Input
          type="search"
          name="staff-search"
          autoComplete="off"
          placeholder="Buscar por nombre o equipo…"
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

const GRANTABLE_PERMISSIONS = ADMIN_PERMISSIONS.filter(
  (permission): permission is Exclude<AdminPermission, "manage_attendance"> =>
    permission !== "manage_attendance",
);

function PermissionsManager({
  people,
  initialPermissions,
}: {
  people: PersonOption[];
  initialPermissions: Record<string, AdminPermission[]>;
}) {
  const [profileId, setProfileId] = useState(people[0]?.id ?? "");
  const [permissions, setPermissions] = useState(initialPermissions);
  const [pendingPermission, setPendingPermission] = useState<AdminPermission | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const selected = new Set(permissions[profileId] ?? []);

  function toggle(permission: Exclude<AdminPermission, "manage_attendance">) {
    if (!profileId) return;
    const enabled = !selected.has(permission);
    setError(null);
    setPendingPermission(permission);
    setPermissions((current) => ({
      ...current,
      [profileId]: enabled
        ? Array.from(new Set([...(current[profileId] ?? []), permission]))
        : (current[profileId] ?? []).filter((item) => item !== permission),
    }));
    startTransition(async () => {
      try {
        await setProfileAdminPermission({ profile_id: profileId, permission, enabled });
      } catch (caught) {
        setPermissions((current) => ({
          ...current,
          [profileId]: enabled
            ? (current[profileId] ?? []).filter((item) => item !== permission)
            : Array.from(new Set([...(current[profileId] ?? []), permission])),
        }));
        setError(caught instanceof Error ? caught.message : "No pudimos cambiar el permiso.");
      } finally {
        setPendingPermission(null);
      }
    });
  }

  return (
    <section
      aria-labelledby="staff-permissions-title"
      className="border-pool-blue/20 bg-pool-foam/45 shadow-elev-1 rounded-2xl border p-4"
    >
      <div className="flex items-start gap-3">
        <span className="bg-pool-deep text-paper flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
          <ShieldCheck className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h2
            id="staff-permissions-title"
            className="font-display text-pool-deep text-lg font-extrabold"
          >
            Permisos de gestión
          </h2>
          <p className="text-ink-600 mt-0.5 text-sm leading-relaxed">
            Elige una persona y activa únicamente lo que necesita gestionar.
          </p>
        </div>
      </div>

      <label htmlFor="permission-profile" className="text-ink-700 mt-4 block text-sm font-bold">
        Persona
      </label>
      <Select
        id="permission-profile"
        value={profileId}
        onChange={(event) => setProfileId(event.target.value)}
        className="mt-1 w-full"
      >
        {people.map((person) => (
          <option key={person.id} value={person.id}>
            {person.full_name}
          </option>
        ))}
      </Select>

      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {GRANTABLE_PERMISSIONS.map((permission) => {
          const enabled = selected.has(permission);
          const pending = pendingPermission === permission;
          return (
            <button
              key={permission}
              type="button"
              aria-pressed={enabled}
              disabled={pendingPermission !== null}
              onClick={() => toggle(permission)}
              className={cn(
                "focus-visible:ring-pool-blue flex min-h-14 touch-manipulation items-center gap-3 rounded-xl border px-3 text-left transition-[background-color,border-color,transform] focus-visible:ring-2 focus-visible:outline-none active:scale-[0.99] motion-reduce:transition-none",
                enabled
                  ? "border-pool-blue bg-paper-card text-pool-deep"
                  : "border-ink-300 bg-paper/70 text-ink-700",
              )}
            >
              <span
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border",
                  enabled ? "border-pool-blue bg-pool-blue text-paper" : "border-ink-300 bg-paper",
                )}
              >
                {pending ? (
                  <Loader2
                    className="h-4 w-4 animate-spin motion-reduce:animate-none"
                    aria-hidden="true"
                  />
                ) : enabled ? (
                  <Check className="h-4 w-4" aria-hidden="true" />
                ) : null}
              </span>
              <span className="text-sm font-extrabold">{PERMISSION_LABELS[permission]}</span>
            </button>
          );
        })}
      </div>
      {error ? (
        <p role="alert" className="text-goggle-red mt-3 text-sm font-bold">
          {error}
        </p>
      ) : null}
      <p className="text-ink-500 mt-3 text-xs leading-relaxed">
        El pase de lista se activa en la asignación de entrenador porque nadie más puede registrar
        asistencia.
      </p>
    </section>
  );
}
