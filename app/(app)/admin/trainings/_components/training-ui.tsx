"use client";
import { cn } from "@/lib/utils/cn";

import { Check, Waves, Dumbbell, UsersRound } from "lucide-react";
import { ShopField, shopControl, shopPrimary, shopSecondary } from "@/components/shop/shop-ui";
import { TRAINING_TYPES, type TrainingTeam } from "@/lib/domain/training-management";
export {
  ShopField as TrainingField,
  shopControl as trainingControl,
  shopPrimary as trainingPrimary,
  shopSecondary as trainingSecondary,
};
export function TrainingTeams({
  teams,
  selected,
  onChange,
}: {
  teams: TrainingTeam[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-base font-extrabold">Equipos</legend>
      <div className="grid grid-cols-2 gap-2">
        {teams.map((team) => {
          const active = selected.includes(team.id);
          return (
            <button
              key={team.id}
              type="button"
              aria-pressed={active}
              onClick={() =>
                onChange(active ? selected.filter((id) => id !== team.id) : [...selected, team.id])
              }
              className={cn(
                `${shopSecondary} justify-start px-3 text-sm ${active ? "border-pool-deep bg-blue-100" : "bg-white"}`,
              )}
            >
              <span
                className="border-pool-deep h-3 w-3 shrink-0 rounded-full border"
                style={{ backgroundColor: team.color }}
              />
              <span className="min-w-0 flex-1">{team.label}</span>
              {active && <Check className="h-4 w-4 shrink-0" aria-hidden="true" />}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
export function TrainingTypePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: "water" | "dry" | "meeting") => void;
}) {
  const icons = [Waves, Dumbbell, UsersRound];
  return (
    <fieldset>
      <legend className="mb-2 text-base font-extrabold">Tipo</legend>
      <div className="grid grid-cols-3 gap-2">
        {TRAINING_TYPES.map((type, index) => {
          const Icon = icons[index];
          return (
            <button
              key={type.value}
              type="button"
              aria-pressed={value === type.value}
              onClick={() => onChange(type.value)}
              className={cn(
                `${shopSecondary} flex-col gap-1 px-1 py-2 text-sm whitespace-nowrap ${value === type.value ? "border-pool-deep bg-blue-100" : "bg-white"}`,
              )}
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
              {type.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
export function TrainingTeamLabels({ teams, ids }: { teams: TrainingTeam[]; ids: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {[...new Set(ids)]
        .sort((a, b) => teams.findIndex((t) => t.id === a) - teams.findIndex((t) => t.id === b))
        .map((id) => {
          const team = teams.find((item) => item.id === id);
          return (
            team && (
              <span
                key={id}
                className="border-pool-deep/70 inline-flex items-center gap-1.5 rounded-lg border bg-white px-2 py-1 text-sm font-bold"
              >
                <span
                  className="border-pool-deep h-2.5 w-2.5 rounded-full border"
                  style={{ backgroundColor: team.color }}
                />
                {team.label}
              </span>
            )
          );
        })}
    </div>
  );
}
