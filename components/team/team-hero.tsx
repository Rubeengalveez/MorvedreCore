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
    Boolean,
  );

  return (
    <header className="border-ink-200 bg-paper-card shadow-elev-2 relative overflow-hidden rounded-[1.75rem] border">
      <div className="bg-pool-deep text-paper px-5 py-6 sm:px-7 sm:py-7">
        <div className="text-paper/65 flex items-center gap-2 text-xs font-extrabold tracking-[0.12em] uppercase">
          <span
            aria-hidden="true"
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: team.color }}
          />
          {meta.join(" · ")}
        </div>
        <h1 className="font-display mt-3 text-3xl leading-[0.98] font-extrabold tracking-tight text-balance sm:text-4xl">
          {team.label}
        </h1>
        {homePool ? (
          <p className="text-paper/75 mt-3 flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="truncate">{homePool}</span>
          </p>
        ) : null}
      </div>

      <dl className="divide-ink-200 grid grid-cols-2 divide-x">
        <div className="flex min-w-0 items-center gap-3 px-4 py-4 sm:px-6">
          <UsersRound className="text-pool-blue h-5 w-5 shrink-0" aria-hidden="true" />
          <div className="min-w-0">
            <dt className="text-ink-500 text-xs font-extrabold tracking-wide uppercase">
              Plantilla
            </dt>
            <dd className="text-pool-deep mt-0.5 text-sm font-extrabold tabular-nums">
              {playerCount} {playerCount === 1 ? "jugador" : "jugadores"}
            </dd>
          </div>
        </div>
        <div className="flex min-w-0 items-center gap-3 px-4 py-4 sm:px-6">
          <UserRoundCog className="text-pool-blue h-5 w-5 shrink-0" aria-hidden="true" />
          <div className="min-w-0">
            <dt className="text-ink-500 text-xs font-extrabold tracking-wide uppercase">
              Cuerpo técnico
            </dt>
            <dd className="text-pool-deep mt-0.5 text-sm font-extrabold tabular-nums">
              {staffCount} {staffCount === 1 ? "persona" : "personas"}
            </dd>
          </div>
        </div>
      </dl>
    </header>
  );
}
