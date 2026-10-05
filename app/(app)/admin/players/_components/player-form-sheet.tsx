"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, ChevronDown, Plus, UserRound } from "lucide-react";
import { ActaGuardSheet } from "@/components/matches/acta-guard-sheet";
import { CapNumberOptions } from "@/components/matches/cap-number-picker";
import { CategoryBadge } from "@/components/team/category-badge";
import { Avatar } from "@/components/ui/avatar";
import { AdaptivePlayerName } from "@/components/ui/adaptive-player-name";
import { teamControl, teamPrimary, teamSecondary, TeamField } from "@/components/team/team-ui";
import { playerCategory } from "@/lib/domain/admin-players";
import { canRosterPlayer } from "@/lib/domain/teams";
import { calendarSeasonStartYear, type CategoryCode } from "@/lib/domain/categories";
import {
  changedPlayerFields,
  playerEditorPayload,
  playerEditorSchema,
  type PlayerEditorValues,
} from "@/lib/domain/player-editor";
import { savePlayerWithPhoto } from "@/server/actions/admin/player-editor";

export interface PlayerTeam {
  id: string;
  label: string;
  category_code?: string;
  occupiedCaps?: number[];
}
export interface PlayerFormSheetProps {
  teams?: PlayerTeam[];
  seasonYear?: number;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  player?: {
    id: string;
    full_name: string;
    birth_year: number | null;
    cap_number: number | null;
    phone_e164: string | null;
    email_contact: string | null;
    photo_url: string | null;
    school_enrolled: boolean;
    school_payment_paid: boolean;
  };
}

export function PlayerFormSheet({
  player,
  teams = [],
  seasonYear = calendarSeasonStartYear(),
  open,
  onOpenChange,
}: PlayerFormSheetProps) {
  const router = useRouter();
  const initial = (): PlayerEditorValues => ({
    full_name: player?.full_name ?? "",
    birth_year: String(player?.birth_year ?? ""),
    team_id: "",
    cap_number: player?.cap_number ?? null,
    phone_e164: player?.phone_e164 ?? "",
    email_contact: player?.email_contact ?? "",
    school_enrolled: player?.school_enrolled ?? false,
    school_payment_paid: player?.school_payment_paid ?? false,
  });
  const [values, setValues] = useState(initial);
  const [baseline, setBaseline] = useState(initial);
  const [localOpen, setLocalOpen] = useState(false);
  const [stage, setStage] = useState<"edit" | "review" | "discard">("edit");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const busy = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);
  const shown = open ?? localOpen;
  const dirty =
    (player
      ? Object.keys(changedPlayerFields(values, baseline)).length > 0
      : JSON.stringify(values) !== JSON.stringify(baseline)) ||
    Boolean(file) ||
    removePhoto;
  const category = /^\d{4}$/.test(values.birth_year)
    ? playerCategory(Number(values.birth_year), seasonYear, values.school_enrolled)
    : null;
  const photo = removePhoto ? null : (preview ?? player?.photo_url);
  useEffect(() => {
    if (!preview) return;
    return () => URL.revokeObjectURL(preview);
  }, [preview]);

  function change<K extends keyof PlayerEditorValues>(key: K, value: PlayerEditorValues[K]) {
    setValues((previous) => ({ ...previous, [key]: value }));
    setFieldErrors((previous) => ({ ...previous, [key]: "" }));
    setError(null);
  }
  function setOpen(next: boolean) {
    if (pending) return;
    if (!next && stage === "discard") {
      setStage("edit");
      return;
    }
    if (!next && stage === "review") {
      setStage("edit");
      return;
    }
    if (!next && dirty) {
      setStage("discard");
      return;
    }
    setLocalOpen(next);
    onOpenChange?.(next);
  }
  function finish() {
    setLocalOpen(false);
    onOpenChange?.(false);
  }
  function launch() {
    setValues(initial());
    setBaseline(initial());
    setFile(null);
    setPreview(null);
    setRemovePhoto(false);
    setFieldErrors({});
    setError(null);
    setStage("edit");
    setLocalOpen(true);
  }
  function review() {
    const parsed = playerEditorSchema.safeParse(values);
    const errors: Record<string, string> = {};
    if (!parsed.success)
      for (const issue of parsed.error.issues) errors[String(issue.path[0])] ??= issue.message;
    if (!player && !teams.some((team) => team.id === values.team_id))
      errors.team_id = "Elige el equipo principal.";
    const team = teams.find((item) => item.id === values.team_id);
    if (
      !player &&
      team?.category_code &&
      !errors.birth_year &&
      (Number(values.birth_year) > seasonYear ||
        !canRosterPlayer(Number(values.birth_year), team.category_code as CategoryCode, seasonYear))
    )
      errors.team_id = "Elige un equipo compatible con su año de nacimiento.";
    setFieldErrors(errors);
    if (Object.keys(errors).length) {
      setError("Revisa los campos marcados antes de continuar.");
      const invalid = formRef.current?.querySelector<HTMLElement>(
        `[name="${Object.keys(errors)[0]}"]`,
      );
      invalid?.focus();
      invalid?.scrollIntoView({ block: "nearest" });
      return;
    }
    setError(null);
    setStage("review");
  }
  async function save() {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setError(null);
    try {
      const payload = player
        ? changedPlayerFields(values, baseline)
        : { ...playerEditorPayload(values), team_id: values.team_id };
      const data = new FormData();
      data.set("input", JSON.stringify(payload));
      if (player) data.set("id", player.id);
      if (file) data.set("photo", file);
      data.set("remove_photo", String(removePhoto));
      await savePlayerWithPhoto(data);
      finish();
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
  function field(
    name: "full_name" | "birth_year" | "phone_e164" | "email_contact",
    label: string,
    type = "text",
  ) {
    const id = `player-${player?.id ?? "new"}-${name}`;
    return (
      <TeamField label={label} htmlFor={id}>
        <input
          id={id}
          name={name}
          type={type}
          value={values[name]}
          onChange={(event) => change(name, event.target.value)}
          className={teamControl}
          autoComplete={
            name === "full_name"
              ? "name"
              : name === "phone_e164"
                ? "tel"
                : name === "email_contact"
                  ? "email"
                  : "off"
          }
          inputMode={name === "birth_year" ? "numeric" : undefined}
          maxLength={name === "birth_year" ? 4 : name === "full_name" ? 100 : undefined}
          aria-invalid={Boolean(fieldErrors[name])}
          aria-describedby={fieldErrors[name] ? `${id}-error` : undefined}
        />
        {fieldErrors[name] && (
          <p id={`${id}-error`} className="font-semibold text-red-800">
            {fieldErrors[name]}
          </p>
        )}
      </TeamField>
    );
  }
  const editBody = (
    <form
      ref={formRef}
      onSubmit={(event) => {
        event.preventDefault();
        review();
      }}
      noValidate
      className="space-y-4"
    >
      {!player && !teams.length && (
        <p
          role="status"
          className="border-pool-deep rounded-xl border-2 bg-amber-100 p-3 font-semibold"
        >
          Primero necesitas un equipo en la temporada actual para registrar jugadores.
        </p>
      )}
      <div className="border-pool-deep/65 space-y-4 rounded-2xl border-2 bg-white p-4">
        {field("full_name", "Nombre completo")}
        {field("birth_year", "Año de nacimiento")}
        {category && (
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-semibold">Categoría por edad</span>
            <CategoryBadge category={category} />
          </div>
        )}
        {!player && (
          <TeamField label="Equipo principal" htmlFor="player-team">
            <select
              id="player-team"
              name="team_id"
              value={values.team_id}
              onChange={(event) => {
                change("team_id", event.target.value);
                change("cap_number", null);
                const selected = teams.find((team) => team.id === event.target.value);
                if (selected) change("school_enrolled", selected.category_code === "escuela");
              }}
              className={teamControl}
              aria-invalid={Boolean(fieldErrors.team_id)}
              aria-describedby={fieldErrors.team_id ? "player-team-error" : undefined}
            >
              <option value="">Elegir equipo</option>
              {teams.map((team) => (
                <option
                  key={team.id}
                  value={team.id}
                  disabled={Boolean(
                    category &&
                    team.category_code &&
                    !canRosterPlayer(
                      Number(values.birth_year),
                      team.category_code as CategoryCode,
                      seasonYear,
                    ),
                  )}
                >
                  {team.label}
                </option>
              ))}
            </select>
            {fieldErrors.team_id && (
              <p id="player-team-error" className="font-semibold text-red-800">
                {fieldErrors.team_id}
              </p>
            )}
          </TeamField>
        )}
      </div>
      <details className="border-pool-deep/65 rounded-2xl border-2 bg-white">
        <summary className="focus-visible:outline-pool-blue flex min-h-14 cursor-pointer items-center justify-between gap-2 px-4 text-base font-extrabold">
          Foto y contacto <ChevronDown aria-hidden="true" className="h-5 w-5" />
        </summary>
        <div className="space-y-4 px-4 pb-4">
          <div className="flex items-center gap-3">
            <Avatar name={values.full_name || "Jugador"} src={photo} size={64} />
            <div className="flex-1 space-y-2">
              <label
                className={`${teamSecondary} focus-within:outline-pool-blue w-full cursor-pointer whitespace-nowrap focus-within:outline-2 focus-within:outline-offset-2`}
              >
                <Camera aria-hidden="true" className="h-5 w-5" />
                {photo ? "Cambiar foto" : "Añadir foto"}
                <input
                  aria-label="Elegir foto del jugador"
                  type="file"
                  accept="image/jpeg,image/png"
                  className="sr-only"
                  onChange={(event) => {
                    const selected = event.target.files?.[0];
                    if (!selected) return;
                    if (
                      selected.size > 5 * 1024 * 1024 ||
                      !["image/jpeg", "image/png"].includes(selected.type)
                    ) {
                      setError("Elige una foto JPG o PNG de hasta 5 MB.");
                      event.target.value = "";
                      return;
                    }
                    setFile(selected);
                    setPreview(URL.createObjectURL(selected));
                    setRemovePhoto(false);
                    setError(null);
                  }}
                />
              </label>
              {photo && (
                <button
                  type="button"
                  onClick={() => {
                    setFile(null);
                    setPreview(null);
                    setRemovePhoto(true);
                  }}
                  className={`${teamSecondary} w-full bg-slate-100`}
                >
                  Quitar foto
                </button>
              )}
            </div>
          </div>
          <p className="text-sm font-semibold">Foto JPG o PNG · hasta 5 MB</p>
          {field("phone_e164", "Teléfono (opcional)", "tel")}
          {field("email_contact", "Correo (opcional)", "email")}
        </div>
      </details>
      <details className="border-pool-deep/65 rounded-2xl border-2 bg-white">
        <summary className="focus-visible:outline-pool-blue flex min-h-14 cursor-pointer items-center justify-between gap-2 px-4 font-extrabold">
          Otros datos <ChevronDown aria-hidden="true" className="h-5 w-5" />
        </summary>
        <div className="space-y-4 px-4 pb-4">
          <div>
            <p className="mb-2 font-extrabold">{player ? "Gorro preferido" : "Gorro inicial"}</p>
            {player && (
              <p className="mb-2 text-sm font-semibold">
                La convocatoria por defecto se edita en Equipos.
              </p>
            )}
            <CapNumberOptions
              value={values.cap_number}
              occupied={new Set()}
              unavailable={
                new Set(
                  player
                    ? []
                    : (teams.find((team) => team.id === values.team_id)?.occupiedCaps ?? []),
                )
              }
              onChange={(value) => change("cap_number", value)}
            />
          </div>
          <label className="flex min-h-12 items-center gap-3 font-bold">
            <input
              type="checkbox"
              checked={values.school_enrolled}
              onChange={(event) => {
                change("school_enrolled", event.target.checked);
                if (!event.target.checked) change("school_payment_paid", false);
              }}
              className="accent-pool-deep h-6 w-6 shrink-0"
            />
            <span className="whitespace-nowrap">Inscrito en Escuela</span>
          </label>
          {values.school_enrolled && (
            <label className="flex min-h-12 items-center gap-3 font-bold">
              <input
                type="checkbox"
                checked={values.school_payment_paid}
                onChange={(event) => change("school_payment_paid", event.target.checked)}
                className="accent-pool-deep h-6 w-6 shrink-0"
              />
              <span className="whitespace-nowrap">Cuota pagada</span>
            </label>
          )}
        </div>
      </details>
    </form>
  );
  const reviewBody = (
    <div className="space-y-3">
      <div className="border-pool-deep/65 rounded-2xl border-2 bg-white p-4">
        <div className="flex items-center gap-3">
          <UserRound aria-hidden="true" className="h-7 w-7 shrink-0" />
          <div className="min-w-0 flex-1 text-lg font-extrabold">
            <AdaptivePlayerName name={values.full_name} />
          </div>
        </div>
        <dl className="mt-4 space-y-2 text-base">
          <div className="flex justify-between gap-3">
            <dt>Nacimiento</dt>
            <dd className="font-bold">{values.birth_year}</dd>
          </div>
          {!player && (
            <div className="flex justify-between gap-3">
              <dt>Equipo</dt>
              <dd
                className="min-w-0 truncate text-right font-bold"
                title={teams.find((team) => team.id === values.team_id)?.label}
              >
                {teams.find((team) => team.id === values.team_id)?.label}
              </dd>
            </div>
          )}
          {category && (
            <div className="flex justify-between gap-3">
              <dt>Categoría</dt>
              <dd>
                <CategoryBadge category={category} />
              </dd>
            </div>
          )}
        </dl>
        <dl className="mt-3 space-y-2 text-base">
          {Object.entries(
            player ? changedPlayerFields(values, baseline) : playerEditorPayload(values),
          )
            .filter(
              ([key, value]) =>
                !["full_name", "birth_year"].includes(key) &&
                (player || (value != null && value !== false)),
            )
            .map(([key, value]) => {
              const labels: Record<string, string> = {
                cap_number: player ? "Gorro preferido" : "Gorro inicial",
                phone_e164: "Teléfono",
                email_contact: "Correo",
                school_enrolled: "Escuela",
                school_payment_paid: "Cuota de Escuela",
              };
              const text =
                typeof value === "boolean"
                  ? value
                    ? "Sí"
                    : "No"
                  : value == null
                    ? key === "cap_number"
                      ? "Sin gorro"
                      : "Sin datos"
                    : String(value);
              return (
                <div
                  key={key}
                  className={
                    key === "email_contact"
                      ? "bg-pool-ice space-y-1 rounded-lg p-3"
                      : "flex items-center justify-between gap-3"
                  }
                >
                  <dt className="shrink-0 whitespace-nowrap">{labels[key]}</dt>
                  <dd
                    className={
                      key === "email_contact"
                        ? "font-bold wrap-anywhere"
                        : "text-right font-bold whitespace-nowrap"
                    }
                  >
                    {text}
                  </dd>
                </div>
              );
            })}
          {(file || removePhoto) && (
            <div className="flex items-center justify-between gap-3">
              <dt>Foto</dt>
              <dd>
                {file ? <Avatar src={preview} name={values.full_name} size={48} /> : "Sin foto"}
              </dd>
            </div>
          )}
        </dl>
      </div>
      <p className="border-pool-deep/65 bg-pool-ice rounded-xl border-2 p-3 text-base font-semibold">
        {player
          ? "Guardarás los cambios de esta ficha. Sus estadísticas e historial se mantienen."
          : "El jugador quedará registrado y añadido a su equipo."}
      </p>
    </div>
  );
  return (
    <>
      {open === undefined && (
        <button type="button" className={`${teamPrimary} w-full sm:w-auto`} onClick={launch}>
          <Plus aria-hidden="true" className="h-5 w-5" />
          Nuevo jugador
        </button>
      )}
      <ActaGuardSheet
        open={shown}
        onOpenChange={setOpen}
        context="Jugadores"
        title={
          stage === "discard"
            ? "¿Salir sin guardar?"
            : stage === "review"
              ? player
                ? "Confirmar cambios"
                : "Confirmar alta"
              : player
                ? "Editar jugador"
                : "Nuevo jugador"
        }
        icon="saved"
        description="Completa los datos del jugador y revísalos antes de guardar."
        pending={pending}
        error={error}
        tall={stage === "edit"}
        stickyActions={stage === "edit"}
        scrollKey={stage}
        body={
          stage === "edit" ? (
            editBody
          ) : stage === "review" ? (
            reviewBody
          ) : (
            <p className="border-pool-deep/65 rounded-xl border-2 bg-white p-4 font-semibold">
              Los cambios de esta ficha todavía no se han guardado.
            </p>
          )
        }
        actions={
          stage === "discard"
            ? [
                { label: "Seguir editando", tone: "primary", onClick: () => setStage("edit") },
                { label: "Salir sin guardar", tone: "subtle", onClick: finish },
              ]
            : stage === "review"
              ? [
                  {
                    label: player ? "Guardar cambios" : "Registrar jugador",
                    tone: "primary",
                    onClick: save,
                  },
                  {
                    label: "Volver a editar",
                    tone: "secondary",
                    onClick: () => {
                      setError(null);
                      setStage("edit");
                    },
                  },
                ]
              : [
                  {
                    label: "Revisar y guardar",
                    tone: "primary",
                    disabled: player ? !dirty : !teams.length,
                    onClick: review,
                  },
                  { label: "Cancelar", tone: "secondary", onClick: () => setOpen(false) },
                ]
        }
      />
    </>
  );
}
