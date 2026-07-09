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

export function TeamRosterList({ players, teamColor, currentYear }: TeamRosterListProps) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center gap-2 px-1">
        <Gorro className="h-5 w-5" accent={teamColor} />
        <h2 className="font-display text-pool-deep text-lg font-bold">Plantilla</h2>
        <span className="text-ink-600 font-mono text-sm font-semibold">{players.length}</span>
      </div>
      {players.length === 0 ? (
        <div className="border-ink-300 bg-paper text-ink-600 rounded-md border border-dashed p-5 text-center text-sm leading-relaxed">
          Aún no hay jugadores en este equipo. Cuando el admin los dé de alta, aparecerán aquí.
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {players.map((player) => (
            <RosterRow key={player.player_id} player={player} currentYear={currentYear} />
          ))}
        </ul>
      )}
    </section>
  );
}

function RosterRow({ player, currentYear }: { player: RosterPlayer; currentYear: number }) {
  const age = player.birth_year != null ? ageIndex(player.birth_year, currentYear) : null;
  const category: CategoryCode | null =
    player.birth_year != null ? inferCategory(player.birth_year, currentYear) : null;
  const categoryLabel = category ? CATEGORY_LABELS[category] : null;

  return (
    <li className="border-ink-300 bg-paper flex items-center gap-3 rounded-md border p-3">
      <Avatar src={player.photo_url} name={player.full_name} size={48} />
      <div className="flex flex-1 flex-col">
        <span className="font-display text-pool-deep text-base leading-tight font-bold">
          {player.full_name}
        </span>
        <span className="text-ink-600 text-sm">
          {age != null && categoryLabel ? `${age} años · ${categoryLabel}` : "—"}
        </span>
      </div>
      {player.squad_number != null ? (
        <span
          className="font-mono text-2xl leading-none font-bold"
          style={{ color: "var(--pool-deep)" }}
        >
          #{player.squad_number}
        </span>
      ) : (
        <span className="text-ink-300 font-mono text-sm">—</span>
      )}
    </li>
  );
}
