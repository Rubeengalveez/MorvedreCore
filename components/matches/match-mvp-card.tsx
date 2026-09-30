import { Trophy } from "lucide-react";
import { AdaptivePlayerName } from "@/components/ui/adaptive-player-name";
import type { MatchScorer } from "@/server/queries/matches";

export function MatchMvpCard({ players }: { players: MatchScorer[] }) {
  if (!players.length) return null;
  return (
    <section
      aria-label="MVP del partido"
      className="border-pool-deep/75 bg-paper-card overflow-hidden rounded-2xl border-2"
    >
      <div className="bg-pool-deep text-paper flex min-h-14 items-center gap-2.5 px-4 py-2.5">
        <Trophy className="text-ball-gold h-5 w-5 shrink-0" aria-hidden="true" />
        <h2 className="text-lg font-extrabold">
          {players.length > 1 ? "MVP compartido" : "MVP del partido"}
        </h2>
      </div>
      <ul className="space-y-4 p-4">
        {players.map((player) => (
          <li key={player.player_id} className="flex items-center gap-3">
            <span
              aria-label={
                player.cap_number == null ? "Gorro no registrado" : `Gorro ${player.cap_number}`
              }
              className="bg-pool-deep text-paper grid h-12 w-12 shrink-0 place-items-center rounded-xl font-mono text-2xl font-black"
            >
              {player.cap_number ?? "—"}
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-pool-deep text-lg font-extrabold">
                <AdaptivePlayerName name={player.full_name} />
              </div>
              <div className="text-pool-deep mt-2 flex flex-wrap gap-2 text-base font-bold">
                <span className="bg-pool-foam rounded-lg px-2.5 py-1">
                  {player.goals} {player.goals === 1 ? "gol" : "goles"}
                </span>
                <span className="bg-pool-foam rounded-lg px-2.5 py-1">
                  {player.assists ?? 0} {player.assists === 1 ? "asistencia" : "asistencias"}
                </span>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
