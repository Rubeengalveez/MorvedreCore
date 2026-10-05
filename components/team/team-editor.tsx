"use client";

import { useRef, useState } from "react";

import { useRouter } from "next/navigation";

import type { Route } from "next";

import { createTeam, updateTeam, type Team } from "@/server/actions/admin/teams";

import { createTeamSchema } from "@/lib/domain/admin-schemas";

import {
  CATEGORY_DEFAULT_GENDER,
  type CategoryCode,
  type TeamGender,
} from "@/lib/domain/categories";

import { defaultTeamColor } from "@/lib/domain/teams";

import { TEAM_CATEGORY_ORDER, teamCategoryLabel } from "@/lib/domain/team-presentation";

import { ActaGuardSheet } from "@/components/matches/acta-guard-sheet";

import { teamControl, teamPrimary, TeamField } from "./team-ui";

export function TeamEditor({
  team,

  defaultSeasonId = "",

  triggerLabel,
}: {
  team?: Team;

  defaultSeasonId?: string;

  triggerLabel?: string;
}) {
  const router = useRouter();

  const initial = () => ({
    season_id: team?.season_id ?? defaultSeasonId,

    label: team?.label ?? "",

    category_code: team?.category_code ?? ("benjamin" as CategoryCode),

    gender: team?.gender ?? ("mixed" as TeamGender),

    color: team?.color ?? defaultTeamColor("benjamin"),

    home_pool: team?.home_pool ?? "",
  });

  const [values, setValues] = useState(initial);

  const [open, setOpen] = useState(false),
    [discard, setDiscard] = useState(false),
    [pending, setPending] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const busy = useRef(false);

  const [baseline, setBaseline] = useState(() => JSON.stringify(initial()));

  const formId = `team-editor-${team?.id ?? "new"}`;

  function close(next: boolean) {
    if (pending) return;

    if (!next && JSON.stringify(values) !== baseline) {
      setDiscard(true);

      return;
    }

    setOpen(next);
  }

  function change<K extends keyof typeof values>(key: K, value: (typeof values)[K]) {
    setValues((previous) => ({ ...previous, [key]: value }));

    setError(null);
  }

  async function save() {
    if (busy.current) return;

    const result = createTeamSchema.safeParse(values);

    if (!result.success) {
      setError(result.error.issues[0]?.message ?? "Revisa los datos del equipo.");

      return;
    }

    busy.current = true;

    setPending(true);

    setError(null);

    try {
      if (team) {
        await updateTeam(team.id, {
          ...result.data,

          home_pool: values.home_pool.trim() || null,

          team_type: values.category_code === "escuela" ? "school" : "competitive",
        });

        setOpen(false);

        router.refresh();
      } else {
        const created = await createTeam(result.data);

        setOpen(false);

        router.push(`/admin/teams/${created.id}` as Route);

        router.refresh();
      }
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "No pudimos guardar el equipo. Vuelve a intentarlo.",
      );
    } finally {
      busy.current = false;

      setPending(false);
    }
  }

  function openEditor() {
    const next = initial();

    setValues(next);

    setBaseline(JSON.stringify(next));

    setError(null);

    setOpen(true);
  }

  return (
    <>
      <button type="button" className={`${teamPrimary} w-full sm:w-auto`} onClick={openEditor}>
        {triggerLabel ?? (team ? "Editar datos" : "Nuevo equipo")}
      </button>

      <ActaGuardSheet
        open={open}

        onOpenChange={close}

        context="EQUIPOS"

        title={team ? "Editar equipo" : "Nuevo equipo"}

        icon="saved"

        pending={pending}

        error={error}

        stickyActions

        tall

        description="Completa los datos del equipo y guarda los cambios."

        actions={[
          {
            label: team ? "Guardar cambios" : "Crear equipo",

            tone: "primary",

            onClick: () => {
              const form = document.getElementById(formId) as HTMLFormElement | null;

              form?.requestSubmit();
            },
          },

          { label: "Cancelar", tone: "secondary", onClick: () => close(false) },
        ]}

        body={
          <form
            id={formId}

            className="space-y-4"

            onSubmit={(event) => {
              event.preventDefault();

              void save();
            }}
          >
            <TeamField htmlFor={`${formId}-category`} label="Categoría">
              <select
                id={`${formId}-category`}

                className={teamControl}

                value={values.category_code}

                disabled={pending}

                onChange={(e) => {
                  const code = e.target.value as CategoryCode;

                  setValues((previous) => ({
                    ...previous,

                    category_code: code,

                    ...(!team
                      ? {
                          gender: CATEGORY_DEFAULT_GENDER[code],

                          color: defaultTeamColor(code),

                          label:
                            previous.label === teamCategoryLabel(previous.category_code)
                              ? teamCategoryLabel(code)
                              : previous.label,
                        }
                      : {}),
                  }));

                  setError(null);
                }}
              >
                {TEAM_CATEGORY_ORDER.map((code) => (
                  <option key={code} value={code}>
                    {teamCategoryLabel(code)}
                  </option>
                ))}
              </select>
            </TeamField>

            <TeamField htmlFor={`${formId}-label`} label="Nombre del equipo">
              <input
                id={`${formId}-label`}

                className={teamControl}

                maxLength={50}

                required

                value={values.label}

                disabled={pending}

                placeholder="Por ejemplo, Cadete B"

                onChange={(e) => change("label", e.target.value)}
              />
            </TeamField>

            <TeamField htmlFor={`${formId}-pool`} label="Piscina habitual (opcional)">
              <input
                id={`${formId}-pool`}

                className={teamControl}

                value={values.home_pool}

                disabled={pending}

                maxLength={100}

                onChange={(e) => change("home_pool", e.target.value)}
              />
            </TeamField>

            <TeamField htmlFor={`${formId}-color`} label="Color del equipo">
              <input
                id={`${formId}-color`}
                type="color"
                className="border-pool-deep/65 h-14 w-full rounded-xl border-2 bg-white p-2"
                value={values.color}
                disabled={pending}
                onChange={(e) => change("color", e.target.value)}
              />
            </TeamField>
          </form>
        }
      />

      <ActaGuardSheet
        open={discard}

        onOpenChange={setDiscard}

        context="EQUIPOS"

        title="¿Salir sin guardar?"

        icon="warning"

        summary="Tienes cambios pendientes"

        description="Si sales, se perderán los cambios de este formulario."

        actions={[
          { label: "Seguir editando", tone: "primary", onClick: () => setDiscard(false) },

          {
            label: "Salir sin guardar",

            tone: "subtle",

            onClick: () => {
              setDiscard(false);

              setOpen(false);
            },
          },
        ]}
      />
    </>
  );
}
