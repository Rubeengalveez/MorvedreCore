import { MapPin, UsersRound, UserRoundCog } from "lucide-react";

import { CATEGORY_LABELS, type CategoryCode } from "@/lib/domain/categories";
import type { Team } from "@/server/queries/teams";

export interface TeamHeroProps {
  team: Team;
  seasonLabel?: string | null;
  homePool?: string | null;
  playerCount?: number;
  staffCount?: number;
}

const GENDER_LABELS: Record<string, string> = {
  male: "Masculino",
  female: "Femenino",
  mixed: "Mixto",
};

export function TeamHero({
  team,
  seasonLabel,
  homePool,
  playerCount = 0,
  staffCount = 0,
}: TeamHeroProps) {
  const categoryLabel = CATEGORY_LABELS[team.category_code as CategoryCode] ?? team.category_code;
  const meta = [categoryLabel, GENDER_LABELS[team.gender] ?? team.gender, seasonLabel].filter(
    (item): item is string => Boolean(item),
  );

  return (
    <header className="border-ink-200 bg-paper-card shadow-elev-1 relative overflow-hidden rounded-2xl border">
      <span
        aria-hidden="true"
        className="absolute inset-y-3 left-0 w-1 rounded-r-full"
        style={{ backgroundColor: team.color }}
      />

      <div className="flex items-start gap-3 px-4 py-4 pl-5">
        <span className="bg-pool-deep text-paper flex h-11 w-11 shrink-0 items-center justify-center rounded-xl shadow-sm">
          <UsersRound className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-pool-blue flex flex-wrap items-center gap-x-1.5 text-xs font-extrabold tracking-[0.07em] uppercase">
            {meta.map((item, index) => (
              <span key={item} className="inline-flex items-center gap-1.5">
                {index > 0 ? (
                  <span className="text-ink-300" aria-hidden="true">
                    ·
                  </span>
                ) : null}
                {item}
              </span>
            ))}
          </div>
          <h1 className="font-display text-pool-deep mt-1 text-2xl leading-tight font-extrabold tracking-tight text-balance">
            {team.label}
          </h1>
          {homePool ? (
            <p className="text-ink-600 mt-1.5 flex min-w-0 items-center gap-1.5 text-sm">
              <MapPin className="text-pool-blue h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="truncate">{homePool}</span>
            </p>
          ) : null}
        </div>
      </div>

      <dl className="border-ink-200 bg-paper-sunk/55 divide-ink-200 grid grid-cols-2 divide-x border-t">
        <div className="flex min-w-0 items-center gap-2.5 px-3.5 py-3 sm:px-5">
          <UsersRound className="text-pool-blue h-5 w-5 shrink-0" aria-hidden="true" />
          <div className="min-w-0">
            <dt className="text-ink-500 text-xs font-bold">Plantilla</dt>
            <dd className="text-pool-deep text-sm font-extrabold tabular-nums">
              {playerCount} {playerCount === 1 ? "jugador" : "jugadores"}
            </dd>
          </div>
        </div>
        <div className="flex min-w-0 items-center gap-2.5 px-3.5 py-3 sm:px-5">
          <UserRoundCog className="text-pool-blue h-5 w-5 shrink-0" aria-hidden="true" />
          <div className="min-w-0">
            <dt className="text-ink-500 text-xs font-bold">Técnicos</dt>
            <dd className="text-pool-deep text-sm font-extrabold tabular-nums">
              {staffCount} {staffCount === 1 ? "persona" : "personas"}
            </dd>
          </div>
        </div>
      </dl>
    </header>
  );
}
