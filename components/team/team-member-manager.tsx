"use client";

import { useRef, useState } from "react";

import { useRouter } from "next/navigation";

import { ChevronRight, Search, Trash2 } from "lucide-react";

import { ActaGuardSheet } from "@/components/matches/acta-guard-sheet";

import { AdaptivePlayerName } from "@/components/ui/adaptive-player-name";

import {
  rosterPlayer,
  unrosterPlayer,
  assignStaff,
  unassignStaff,
} from "@/server/actions/admin/teams";

import { matchesTeamSearch, TEAM_STAFF_LABELS } from "@/lib/domain/team-presentation";

import { teamControl, teamPrimary, teamSecondary, TeamEmpty } from "./team-ui";

import { CategoryBadge } from "./category-badge";
import type { CategoryCode } from "@/lib/domain/categories";
import { cn } from "@/lib/utils/cn";
import { CapNumberOptions } from "@/components/matches/cap-number-picker";

export type TeamStaffRole = "head_coach" | "assistant_coach" | "delegate" | "physical_trainer";

export interface MemberCandidate {
  id: string;

  full_name: string;

  birth_year?: number | null;

  categoryLabel?: string;
  category?: CategoryCode | null;
  categoryColor?: string;
}

export interface ManagedMember {
  id: string;

  full_name: string;

  categoryLabel?: string;
  category?: CategoryCode | null;
  categoryColor?: string;

  squad_number?: number | null;

  role?: TeamStaffRole;
}

export function TeamMemberPicker({
  teamId,

  kind,

  candidates,

  triggerLabel,

  assigned = [],
  usedCaps = [],
}: {
  teamId: string;

  kind: "player" | "staff";

  candidates: MemberCandidate[];

  triggerLabel?: string;

  assigned?: Array<{ profile_id: string; role: string }>;
  usedCaps?: number[];
}) {
  const router = useRouter();

  const [open, setOpen] = useState(false),
    [query, setQuery] = useState(""),
    [selected, setSelected] = useState("");

  const [role, setRole] = useState<TeamStaffRole>("head_coach"),
    [cap, setCap] = useState("");

  const [pending, setPending] = useState(false),
    [error, setError] = useState<string | null>(null);

  const busy = useRef(false);

  const allowed = candidates.filter(
    (c) =>
      kind === "player" || !assigned.some((item) => item.profile_id === c.id && item.role === role),
  );

  const visible = allowed.filter((c) =>
    matchesTeamSearch(`${c.full_name} ${c.categoryLabel ?? ""}`, query),
  );

  const person = allowed.find((c) => c.id === selected);

  async function save() {
    if (busy.current) return;

    if (!person) {
      setError(
        kind === "player"
          ? "Elige el jugador que quieres añadir."
          : "Elige la persona que quieres asignar.",
      );

      return;
    }

    if (
      kind === "player" &&
      cap &&
      (!/^\d{1,2}$/.test(cap) || Number(cap) < 1 || Number(cap) > 14)
    ) {
      setError("El gorro debe ser un número entre 1 y 14. También puedes dejarlo vacío.");

      return;
    }

    busy.current = true;

    setPending(true);

    setError(null);

    try {
      if (kind === "player")
        await rosterPlayer({
          team_id: teamId,

          player_id: person.id,

          squad_number: cap ? Number(cap) : undefined,
        });
      else await assignStaff({ team_id: teamId, profile_id: person.id, role });

      setOpen(false);

      router.refresh();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "No pudimos guardar. Vuelve a intentarlo.",
      );
    } finally {
      busy.current = false;

      setPending(false);
    }
  }

  return (
    <>
      <button
        type="button"
        className={`${teamPrimary} w-full`}

        onClick={() => {
          setSelected("");

          setQuery("");

          setCap("");

          setRole("head_coach");

          setError(null);

          setOpen(true);
        }}
      >
        {triggerLabel ?? (kind === "player" ? "Añadir jugador" : "Añadir persona")}
      </button>

      <ActaGuardSheet
        open={open}

        onOpenChange={setOpen}

        context="EQUIPOS"

        title={kind === "player" ? "Añadir jugador" : "Añadir al cuerpo técnico"}

        icon="saved"

        pending={pending}

        error={error}

        stickyActions

        tall

        description="Elige una persona y confirma para incorporarla al equipo."

        actions={[
          {
            label: kind === "player" ? "Añadir a la plantilla" : "Asignar al equipo",

            tone: "primary",

            onClick: save,
          },

          { label: "Cancelar", tone: "secondary", onClick: () => setOpen(false) },
        ]}

        body={
          <div className="space-y-4">
            {kind === "staff" ? (
              <fieldset>
                <legend className="text-pool-deep mb-2 font-bold">Función en el equipo</legend>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      ["head_coach", "Entrenador"],
                      ["delegate", "Delegado"],
                    ] as const
                  ).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={role === value}
                      disabled={pending}
                      className={cn(
                        teamSecondary,
                        role === value ? "bg-pool-deep text-white" : "bg-white",
                      )}
                      onClick={() => {
                        setRole(value);
                        setSelected("");
                        setError(null);
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </fieldset>
            ) : null}

            {person ? (
              <div className="border-pool-deep/65 space-y-2 rounded-xl border-2 bg-blue-50 p-3">
                <div className="flex items-center gap-2">
                  <p className="text-pool-deep min-w-0 flex-1 text-lg font-extrabold">
                    <AdaptivePlayerName name={person.full_name} />
                  </p>
                  {kind === "player" ? (
                    <CategoryBadge
                      category={person.category}
                      label={person.categoryLabel}
                      color={person.categoryColor}
                    />
                  ) : null}
                </div>
                <button
                  type="button"
                  disabled={pending}
                  className={`${teamSecondary} w-full`}
                  onClick={() => setSelected("")}
                >
                  Cambiar persona
                </button>
              </div>
            ) : (
              <>
                <label className="relative block">
                  <span className="sr-only">
                    {kind === "player" ? "Buscar jugador" : "Buscar persona"}
                  </span>

                  <Search
                    className="text-pool-deep pointer-events-none absolute top-4 left-3 h-5 w-5"

                    aria-hidden="true"
                  />

                  <input
                    type="search"

                    placeholder="Buscar por nombre…"

                    value={query}

                    onChange={(e) => setQuery(e.target.value)}

                    className={`${teamControl} pl-10`}
                  />
                </label>

                <p role="status" className="text-pool-deep text-sm font-bold">
                  {visible.length}{" "}
                  {kind === "player"
                    ? visible.length === 1
                      ? "jugador disponible"
                      : "jugadores disponibles"
                    : visible.length === 1
                      ? "persona disponible"
                      : "personas disponibles"}
                </p>

                <ul className="space-y-2">
                  {visible.map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"

                        disabled={pending}

                        className="border-pool-deep/65 text-pool-deep focus-visible:outline-pool-blue flex min-h-16 w-full items-center gap-3 rounded-xl border-2 bg-white px-3 py-3 text-left focus-visible:outline-2 focus-visible:outline-offset-2"

                        onClick={() => {
                          setSelected(c.id);

                          setError(null);
                        }}
                      >
                        <span className="min-w-0 flex-1 font-extrabold">
                          <AdaptivePlayerName name={c.full_name} />

                          {c.categoryLabel ? (
                            <span className="mt-1 block">
                              <CategoryBadge
                                category={c.category}
                                label={c.categoryLabel}
                                color={c.categoryColor}
                              />
                            </span>
                          ) : null}
                        </span>

                        <ChevronRight
                          className="text-pool-blue h-5 w-5 shrink-0"

                          aria-hidden="true"
                        />
                      </button>
                    </li>
                  ))}
                </ul>

                {!visible.length ? (
                  <TeamEmpty
                    title="No hay personas disponibles"

                    description={
                      query
                        ? "Prueba otro nombre."
                        : "Todas las personas disponibles ya están asignadas o no cumplen la categoría."
                    }
                  />
                ) : null}
              </>
            )}

            {kind === "player" && person ? (
              <fieldset className="border-pool-deep/65 rounded-xl border-2 bg-white p-3">
                <legend className="text-pool-deep px-2 font-extrabold">Gorro en este equipo</legend>
                <CapNumberOptions
                  value={cap ? Number(cap) : null}
                  occupied={new Set(usedCaps)}
                  unavailable={new Set(usedCaps)}
                  disabled={pending}
                  onChange={(value) => {
                    setCap(value == null ? "" : String(value));
                    setError(null);
                  }}
                />
                <p className="mt-3 text-sm font-semibold text-slate-700">
                  1 y 13: porteros. Los gorros ocupados no se pueden elegir.
                </p>
              </fieldset>
            ) : null}
          </div>
        }
      />
    </>
  );
}

export function TeamMembersList({
  teamId,

  kind,

  members,

  editable = true,
}: {
  teamId: string;

  kind: "player" | "staff";

  members: ManagedMember[];

  editable?: boolean;
}) {
  const router = useRouter();

  const [remove, setRemove] = useState<ManagedMember | null>(null),
    [pending, setPending] = useState(false),
    [error, setError] = useState<string | null>(null);

  const busy = useRef(false);

  async function confirm() {
    if (!remove || busy.current) return;

    busy.current = true;

    setPending(true);

    setError(null);

    try {
      if (kind === "player") await unrosterPlayer({ team_id: teamId, player_id: remove.id });
      else if (remove.role)
        await unassignStaff({ team_id: teamId, profile_id: remove.id, role: remove.role });

      setRemove(null);

      router.refresh();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "No pudimos quitar a esta persona del equipo.",
      );
    } finally {
      busy.current = false;

      setPending(false);
    }
  }

  if (!members.length)
    return (
      <TeamEmpty title={kind === "player" ? "Plantilla sin jugadores" : "Sin cuerpo técnico"} />
    );

  return (
    <>
      <ul className="space-y-2">
        {members.map((member) => (
          <li
            key={`${member.id}-${member.role ?? "player"}`}

            className="border-pool-deep/65 text-pool-deep flex min-h-20 items-center gap-3 rounded-xl border-2 bg-white px-3 py-3"
          >
            {kind === "player" ? (
              <span
                className={cn(
                  "border-pool-deep grid h-12 w-12 shrink-0 place-items-center rounded-xl border text-xl font-extrabold tabular-nums",

                  member.squad_number ? "bg-pool-deep text-white" : "text-pool-deep bg-slate-100",
                )}
              >
                <span className="sr-only">Gorro </span>

                {member.squad_number ?? "—"}
              </span>
            ) : null}

            <div className="min-w-0 flex-1">
              <p className="font-extrabold">
                <AdaptivePlayerName name={member.full_name} />
              </p>

              <p className="mt-1 text-sm font-semibold">
                {member.role ? (
                  TEAM_STAFF_LABELS[member.role]
                ) : (
                  <CategoryBadge
                    category={member.category}
                    label={member.categoryLabel}
                    color={member.categoryColor}
                  />
                )}
              </p>
            </div>

            {editable ? (
              <button
                type="button"

                onClick={() => {
                  setError(null);

                  setRemove(member);
                }}

                aria-label={`Quitar a ${member.full_name} del equipo${member.role ? ` como ${TEAM_STAFF_LABELS[member.role]}` : ""}`}

                className="focus-visible:outline-pool-blue grid h-12 w-12 shrink-0 place-items-center rounded-xl border-2 border-red-800 bg-red-50 text-red-900 focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                <Trash2 className="h-5 w-5" aria-hidden="true" />
              </button>
            ) : null}
          </li>
        ))}
      </ul>

      <ActaGuardSheet
        open={Boolean(remove)}

        onOpenChange={(open) => {
          if (!open) setRemove(null);
        }}

        context="EQUIPOS"

        title={kind === "player" ? "¿Quitar jugador del equipo?" : "¿Quitar esta función?"}

        summary={remove?.full_name}

        description={
          kind === "player"
            ? "Dejará de estar en esta plantilla. Su ficha y el historial se conservan."
            : `Se retirará la función ${remove?.role ? TEAM_STAFF_LABELS[remove.role] : ""} en este equipo.`
        }

        icon="warning"

        pending={pending}

        error={error}

        actions={[
          { label: "Mantener en el equipo", tone: "primary", onClick: () => setRemove(null) },

          { label: pending ? "Quitando…" : "Quitar del equipo", tone: "danger", onClick: confirm },
        ]}
      />
    </>
  );
}
