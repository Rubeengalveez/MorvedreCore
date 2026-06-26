import { Gorro } from "@/components/brand/pictograms";
import { Avatar } from "@/components/ui/avatar";
import {
  CATEGORY_LABELS,
  ageIndex,
  inferCategory,
  type CategoryCode,
} from "@/lib/domain/categories";
import type { RosterPlayer } from "@/server/queries/teams";

export interface TeamRosterListProps {
  players: RosterPlayer[];
  teamColor: string;
  currentYear: number;
}

export function TeamRosterList({
  players,
  teamColor,
  currentYear,
}: TeamRosterListProps) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center gap-2 px-1">
        <Gorro className="h-5 w-5" accent={teamColor} />
        <h2 className="font-display text-lg font-bold text-brand-deep">
          Plantilla
        </h2>
        <span className="font-mono text-sm font-semibold text-ink-600">
          {players.length}
        </span>
      </div>
      {players.length === 0 ? (
        <div className="rounded-md border border-dashed border-ink-300 bg-paper p-5 text-center text-sm leading-relaxed text-ink-600">
          Aún no hay jugadores en este equipo. Cuando el admin los dé de alta,
          aparecerán aquí.
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {players.map((player) => (
            <RosterRow
              key={player.player_id}
              player={player}
              currentYear={currentYear}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function RosterRow({
  player,
  currentYear,
}: {
  player: RosterPlayer;
  currentYear: number;
}) {
  const age = player.birth_year != null ? ageIndex(player.birth_year, currentYear) : null;
  const category: CategoryCode | null =
    player.birth_year != null
      ? inferCategory(player.birth_year, currentYear)
      : null;
  const categoryLabel = category ? CATEGORY_LABELS[category] : null;

  return (
    <li className="flex items-center gap-3 rounded-md border border-ink-300 bg-paper p-3">
      <Avatar
        src={player.photo_url}
        name={player.full_name}
        size={48}
      />
      <div className="flex flex-1 flex-col">
        <span className="font-display text-base font-bold leading-tight text-brand-deep">
          {player.full_name}
        </span>
        <span className="text-sm text-ink-600">
          {age != null && categoryLabel ? `${age} años · ${categoryLabel}` : "—"}
        </span>
      </div>
      {player.squad_number != null ? (
        <span
          className="font-mono text-2xl font-bold leading-none"
          style={{ color: "var(--brand-deep)" }}
        >
          #{player.squad_number}
        </span>
      ) : (
        <span className="font-mono text-sm text-ink-300">—</span>
      )}
    </li>
  );
}
