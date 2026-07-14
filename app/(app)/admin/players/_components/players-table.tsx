"use client";

import { useMemo, useState, useTransition } from "react";
import { EyeOff, Pencil, Power, PowerOff } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils/cn";
import { setPlayerActive } from "@/server/actions/admin/players";
import { PlayerFormSheet } from "./player-form-sheet";

export interface PlayerRow {
  id: string;
  full_name: string;
  birth_year: number | null;
  photo_url: string | null;
  cap_number: number | null;
  gender: string | null;
  phone_e164: string | null;
  email_contact: string | null;
  notes: string | null;
  is_active: boolean;
  currentTeam: string | null;
  categoryLabel: string;
}

export interface PlayersTableProps {
  players: PlayerRow[];
}

export function PlayersTable({ players }: PlayersTableProps) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"active" | "inactive" | "all">("active");
  const [localPlayers, setLocalPlayers] = useState(players);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    const byStatus = localPlayers.filter((player) =>
      status === "all" ? true : status === "active" ? player.is_active : !player.is_active,
    );
    if (!q) return byStatus;
    return byStatus.filter(
      (p) => p.full_name.toLowerCase().includes(q) || p.currentTeam?.toLowerCase().includes(q),
    );
  }, [localPlayers, search, status]);

  function toggleActive(player: PlayerRow) {
    const active = !player.is_active;
    setPendingId(player.id);
    setLocalPlayers((current) =>
      current.map((item) => (item.id === player.id ? { ...item, is_active: active } : item)),
    );
    startTransition(async () => {
      try {
        await setPlayerActive({ profile_id: player.id, active });
      } catch {
        setLocalPlayers((current) =>
          current.map((item) =>
            item.id === player.id ? { ...item, is_active: player.is_active } : item,
          ),
        );
      } finally {
        setPendingId(null);
      }
    });
  }

  if (players.length === 0) {
    return (
      <div className="border-ink-300 bg-paper rounded-md border border-dashed p-6 text-center">
        <p className="text-pool-deep text-base font-semibold">Plantilla vacía.</p>
        <p className="text-ink-600 mt-1 text-sm">
          Crea el primer jugador o importa el Excel que tenías en el Drive.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_12rem]">
        <Input
          type="search"
          placeholder="Buscar por nombre o equipo…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select
          aria-label="Filtrar jugadores por estado"
          value={status}
          onChange={(event) => setStatus(event.target.value as typeof status)}
        >
          <option value="active">Activos</option>
          <option value="inactive">Desactivados</option>
          <option value="all">Todos</option>
        </Select>
      </div>
      <div className="sm:hidden">
        <ul className="flex flex-col gap-2">
          {filtered.map((p) => (
            <li
              key={p.id}
              className={cn(
                "border-ink-200 bg-paper-card shadow-elev-1 rounded-2xl border p-3",
                !p.is_active && "opacity-75",
              )}
            >
              <div className="flex items-center gap-3">
                <Avatar
                  name={p.full_name}
                  src={p.photo_url}
                  size={52}
                  teamColor="var(--pool-blue)"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-display text-pool-deep truncate text-sm font-bold">
                    {p.full_name}
                  </p>
                  <p className="text-ink-600 text-xs">
                    {p.cap_number != null ? `Dorsal ${p.cap_number} · ` : null}
                    {p.categoryLabel}
                    {p.birth_year ? ` · ${p.birth_year}` : null}
                  </p>
                  <p className="text-ink-600 truncate text-xs">
                    {p.currentTeam ?? <span className="text-ink-600/70 italic">Sin equipo</span>}
                  </p>
                </div>
                {!p.is_active ? (
                  <EyeOff
                    className="text-ink-500 h-5 w-5 shrink-0"
                    aria-label="Jugador desactivado"
                  />
                ) : null}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <PlayerFormSheet
                  player={p}
                  trigger={
                    <Button type="button" variant="secondary" size="sm">
                      <Pencil className="h-4 w-4" aria-hidden="true" />
                      Editar
                    </Button>
                  }
                />
                <Button
                  type="button"
                  variant={p.is_active ? "ghost" : "success"}
                  size="sm"
                  className={p.is_active ? "text-goggle-red" : undefined}
                  disabled={pendingId === p.id}
                  onClick={() => toggleActive(p)}
                >
                  {p.is_active ? (
                    <PowerOff className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Power className="h-4 w-4" aria-hidden="true" />
                  )}
                  {p.is_active ? "Desactivar" : "Activar"}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {filtered.length === 0 ? (
        <div className="border-ink-300 bg-paper text-ink-600 rounded-md border border-dashed p-6 text-center text-sm italic">
          No hay coincidencias.
        </div>
      ) : null}

      <div className="hidden sm:block">
        <table className="w-full border-separate border-spacing-0 text-left">
          <thead>
            <tr className="text-ink-600 text-xs tracking-wider uppercase">
              <th className="border-ink-300 border-b px-3 py-2 font-semibold">Jugador</th>
              <th className="border-ink-300 border-b px-3 py-2 font-semibold">Año</th>
              <th className="border-ink-300 border-b px-3 py-2 font-semibold">Categoría</th>
              <th className="border-ink-300 border-b px-3 py-2 font-semibold">Equipo</th>
              <th className="border-ink-300 border-b px-3 py-2 text-right font-semibold">
                <span className="sr-only">Acciones</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.id} className="text-base">
                <td className="border-ink-300 border-b px-3 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar name={p.full_name} src={p.photo_url} />
                    <div className="flex flex-col">
                      <span className="font-display text-pool-deep font-bold">{p.full_name}</span>
                      {p.cap_number != null ? (
                        <span className="text-ink-600 font-mono text-xs">
                          Dorsal {p.cap_number}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </td>
                <td className="border-ink-300 text-ink-600 border-b px-3 py-3 font-mono text-sm">
                  {p.birth_year ?? "—"}
                </td>
                <td className="border-ink-300 text-ink-600 border-b px-3 py-3 text-sm">
                  {p.categoryLabel}
                </td>
                <td className="border-ink-300 text-ink-600 border-b px-3 py-3 text-sm">
                  {p.currentTeam ?? <span className="text-ink-600/70 italic">Sin equipo</span>}
                </td>
                <td className="border-ink-300 border-b px-3 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    <PlayerFormSheet
                      player={p}
                      trigger={
                        <Button type="button" variant="secondary" size="sm">
                          <Pencil className="h-4 w-4" aria-hidden="true" />
                          Editar
                        </Button>
                      }
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className={p.is_active ? "text-goggle-red" : "text-success"}
                      disabled={pendingId === p.id}
                      onClick={() => toggleActive(p)}
                      aria-label={
                        p.is_active ? `Desactivar a ${p.full_name}` : `Activar a ${p.full_name}`
                      }
                    >
                      {p.is_active ? (
                        <PowerOff className="h-4 w-4" aria-hidden="true" />
                      ) : (
                        <Power className="h-4 w-4" aria-hidden="true" />
                      )}
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-ink-600 text-xs">
        {filtered.length} de {localPlayers.length} jugadores
      </p>
    </div>
  );
}
