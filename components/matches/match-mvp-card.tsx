import { AdaptivePlayerName } from "@/components/ui/adaptive-player-name";
import type { MatchScorer } from "@/server/queries/matches";

export function MatchMvpCard({ players }: { players: MatchScorer[] }) {
  if (!players.length) return null;
  return (
    <section
      aria-label="MVP del partido"
      className="border-pool-deep/75 bg-paper-card overflow-hidden rounded-2xl border-2"
    >
      <h2 className="sr-only">{players.length > 1 ? "MVP compartido" : "MVP del partido"}</h2>
      <ul>
        {players.map((player) => (
          <li
            key={player.player_id}
            className="text-pool-deep flex min-h-12 items-center gap-1.5 px-2.5 py-2"
          >
            <span className="border-pool-deep flex h-8 shrink-0 items-center justify-center rounded-lg border bg-blue-100 px-1.5 text-xs font-black">
              MVP
            </span>
            <span
              aria-label={
                player.cap_number == null ? "Gorro no registrado" : `Gorro ${player.cap_number}`
              }
              className="bg-pool-deep text-paper grid h-8 w-8 shrink-0 place-items-center rounded-lg font-mono text-base font-black"
            >
              {player.cap_number ?? "—"}
            </span>
            <div className="min-w-0 flex-1 text-sm font-extrabold">
              <AdaptivePlayerName name={player.full_name} />
            </div>
            <div
              className="flex shrink-0 items-center gap-1 text-xs font-bold whitespace-nowrap"
              aria-label={`${player.goals} ${player.goals === 1 ? "gol" : "goles"}, ${player.assists ?? 0} ${player.assists === 1 ? "asistencia" : "asistencias"}`}
            >
              <span
                className="border-pool-deep/40 bg-pool-foam rounded-lg border px-1.5 py-1.5"
                aria-hidden="true"
              >
                {player.goals} {player.goals === 1 ? "gol" : "goles"}
              </span>
              <span
                className="border-pool-deep/40 bg-pool-foam rounded-lg border px-1.5 py-1.5"
                aria-hidden="true"
              >
                {player.assists ?? 0} asis.
              </span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
