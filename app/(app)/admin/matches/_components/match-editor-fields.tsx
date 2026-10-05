"use client";

import { useId, type ReactNode } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { CalendarDays, ChevronDown, MapPin, UsersRound } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  matchCompetitionLabels,
  matchStatusLabels,
  type MatchEditorValues,
} from "@/lib/domain/admin-matches";
import { formatLongDate, formatTime } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import type { Team } from "@/server/actions/admin";

export const matchControlClass =
  "min-h-14 rounded-xl border-2 border-pool-deep/60 bg-white text-pool-deep placeholder:text-slate-600 focus-visible:border-pool-blue";
export const matchActionClass =
  "inline-flex min-h-14 items-center justify-center gap-2 rounded-xl border-2 border-pool-deep bg-pool-deep px-4 py-3 text-base font-extrabold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pool-blue disabled:opacity-50";
export const matchSecondaryClass =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border-2 border-pool-deep/70 bg-white px-3 py-2 text-base font-bold text-pool-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pool-blue disabled:opacity-50";

export function MatchSection({
  title,
  icon,
  children,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="border-pool-deep/60 rounded-2xl border-2 bg-white p-4">
      <h2 className="text-pool-deep mb-4 flex items-center gap-2 text-lg font-extrabold">
        {icon}
        {title}
      </h2>
      <div className="grid gap-4">{children}</div>
    </section>
  );
}

type TextName = "opponent" | "scheduled_at_local" | "location" | "maps_url" | "notes";

export function MatchTextField({
  name,
  label,
  helper,
  type = "text",
  placeholder,
}: {
  name: TextName;
  label: string;
  helper?: string;
  type?: string;
  placeholder?: string;
}) {
  const id = useId();
  const {
    register,
    formState: { errors },
  } = useFormContext<MatchEditorValues>();
  const error = errors[name]?.message;
  const describedBy =
    [helper ? `${id}-help` : null, error ? `${id}-error` : null].filter(Boolean).join(" ") ||
    undefined;
  const props = {
    ...register(name),
    id,
    "aria-invalid": !!error,
    "aria-describedby": describedBy,
    placeholder,
    className: matchControlClass,
  };
  return (
    <div className="grid min-w-0 gap-2">
      <label htmlFor={id} className="text-pool-deep text-base font-bold">
        {label}
      </label>
      {name === "notes" ? (
        <textarea
          {...props}
          rows={3}
          className={`${matchControlClass} w-full resize-y px-4 py-3 text-base`}
        />
      ) : (
        <Input
          {...props}
          type={type}
          maxLength={name === "opponent" ? 100 : name === "location" ? 200 : undefined}
          autoComplete="off"
          {...(name === "maps_url"
            ? { inputMode: "url", autoCapitalize: "none", autoCorrect: "off" }
            : {})}
        />
      )}
      {helper && (
        <p id={`${id}-help`} className="text-sm leading-snug text-slate-700">
          {helper}
        </p>
      )}
      {error && (
        <p
          id={`${id}-error`}
          role="alert"
          className="rounded-lg bg-red-50 px-3 py-2 text-sm font-bold text-red-900"
        >
          {error}
        </p>
      )}
    </div>
  );
}

export function MatchSelectField({
  name,
  label,
  options,
}: {
  name: "team_id" | "competition_type" | "status";
  label: string;
  options: { value: string; label: string }[];
}) {
  const id = useId();
  const {
    register,
    formState: { errors },
  } = useFormContext<MatchEditorValues>();
  const error = errors[name]?.message;
  return (
    <div className="grid gap-2">
      <label htmlFor={id} className="text-pool-deep text-base font-bold">
        {label}
      </label>
      <Select
        {...register(name)}
        id={id}
        className={matchControlClass}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
      {error && (
        <p
          id={`${id}-error`}
          role="alert"
          className="rounded-lg bg-red-50 px-3 py-2 text-sm font-bold text-red-900"
        >
          {error}
        </p>
      )}
    </div>
  );
}

export function MatchVenueChoice() {
  const { control, setValue } = useFormContext<MatchEditorValues>();
  const value = useWatch({ control, name: "is_home" });
  const id = useId();
  return (
    <fieldset>
      <legend className="text-pool-deep mb-2 text-base font-bold">¿Dónde jugáis?</legend>
      <div className="grid grid-cols-2 gap-2">
        {[
          { home: true, label: "Local" },
          { home: false, label: "Visitante" },
        ].map((option) => (
          <label key={option.label} className="cursor-pointer">
            <input
              type="radio"
              name={`${id}-venue`}
              checked={value === option.home}
              onChange={() => setValue("is_home", option.home, { shouldDirty: true })}
              className="peer sr-only"
            />
            <span className="border-pool-deep/60 text-pool-deep peer-checked:border-pool-deep peer-checked:bg-pool-deep peer-focus-visible:outline-pool-blue flex min-h-16 flex-col items-center justify-center rounded-xl border-2 bg-white px-2 py-2 peer-checked:text-white peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2">
              <span className="text-base font-extrabold">{option.label}</span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function MatchIdentityFields({
  teams,
  editableStatus = false,
}: {
  teams?: Team[];
  editableStatus?: boolean;
}) {
  return (
    <MatchSection
      title="Equipo y rival"
      icon={<UsersRound className="h-5 w-5" aria-hidden="true" />}
    >
      {teams && (
        <MatchSelectField
          name="team_id"
          label="Nuestro equipo"
          options={teams.map((team) => ({ value: team.id, label: team.label }))}
        />
      )}
      <MatchTextField name="opponent" label="Rival" placeholder="Nombre del equipo rival" />
      <MatchSelectField
        name="competition_type"
        label="Competición"
        options={Object.entries(matchCompetitionLabels).map(([value, label]) => ({ value, label }))}
      />
      <MatchVenueChoice />
      {editableStatus && (
        <MatchSelectField
          name="status"
          label="Estado del partido"
          options={Object.entries(matchStatusLabels).map(([value, label]) => ({ value, label }))}
        />
      )}
    </MatchSection>
  );
}

export function MatchScheduleFields() {
  return (
    <MatchSection
      title="Fecha del partido"
      icon={<CalendarDays className="h-5 w-5" aria-hidden="true" />}
    >
      <MatchTextField name="scheduled_at_local" label="Fecha y hora" type="datetime-local" />
    </MatchSection>
  );
}

export function MatchLocationFields() {
  const {
    formState: { errors },
  } = useFormContext<MatchEditorValues>();
  return (
    <MatchSection title="Piscina" icon={<MapPin className="h-5 w-5" aria-hidden="true" />}>
      <MatchTextField
        name="location"
        label="Nombre de la piscina"
        placeholder="¿En qué piscina jugáis?"
      />
      <details
        open={errors.maps_url ? true : undefined}
        className="group rounded-xl bg-slate-100 px-3"
      >
        <summary className="text-pool-deep focus-visible:outline-pool-blue flex min-h-12 cursor-pointer list-none items-center justify-between gap-2 rounded-lg text-sm font-bold focus-visible:outline-2">
          Añadir enlace del mapa (opcional)
          <ChevronDown className="h-5 w-5 group-open:rotate-180" aria-hidden="true" />
        </summary>
        <div className="pb-3">
          <MatchTextField
            name="maps_url"
            label="Enlace de Google Maps"
            type="url"
            helper="En Google Maps, toca Compartir y copia el enlace de la piscina."
            placeholder="https://maps.app.goo.gl/…"
          />
        </div>
      </details>
    </MatchSection>
  );
}

export function MatchReview({
  teamLabel,
  onEdit,
}: {
  teamLabel: string;
  onEdit: (step: number) => void;
}) {
  const values = useWatch<MatchEditorValues>();
  return (
    <section
      className="border-pool-deep/70 text-pool-deep overflow-hidden rounded-2xl border-2 bg-white"
      aria-label="Resumen del partido"
    >
      <div className="bg-pool-deep px-4 py-3 text-white">
        <p className="text-sm font-bold text-blue-100">
          {teamLabel} · {values.competition_type && matchCompetitionLabels[values.competition_type]}
        </p>
        <h2 className="mt-1 text-xl font-extrabold break-words">
          Morvedre <span className="text-blue-200">vs</span> {values.opponent}
        </h2>
      </div>
      <dl className="grid gap-3 p-4">
        <div>
          <dt className="text-sm font-bold text-slate-600">Fecha y hora</dt>
          <dd className="mt-0.5 font-bold">
            {values.scheduled_at_local
              ? `${formatLongDate(values.scheduled_at_local)} · ${formatTime(values.scheduled_at_local)}`
              : "Sin elegir"}
          </dd>
        </div>
        <div>
          <dt className="text-sm font-bold text-slate-600">
            {values.is_home ? "Como local" : "Como visitante"}
          </dt>
          <dd className="mt-0.5 font-bold break-words">
            {values.location || "Piscina pendiente de indicar"}
          </dd>
        </div>
      </dl>
      <div className="grid grid-cols-2 gap-2 px-4 pb-4">
        <button
          type="button"
          className={cn(matchSecondaryClass, "px-2 text-sm whitespace-nowrap")}
          onClick={() => onEdit(0)}
        >
          Editar equipos
        </button>
        <button
          type="button"
          className={cn(matchSecondaryClass, "px-2 text-sm whitespace-nowrap")}
          onClick={() => onEdit(1)}
        >
          Editar fecha
        </button>
      </div>
    </section>
  );
}
