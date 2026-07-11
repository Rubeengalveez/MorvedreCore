"use client";

import { useMemo, useState } from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils/cn";

export interface PlayerRow {
  id: string;
  full_name: string;
  birth_year: number | null;
  license_active: boolean;
  photo_url: string | null;
  cap_number: number | null;
  currentTeam: string | null;
  categoryLabel: string;
}

export interface PlayersTableProps {
  players: PlayerRow[];
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function Avatar({ name, url, size = 40 }: { name: string; url: string | null; size?: number }) {
  if (url) {
    return (
      <span
        aria-hidden="true"
        className="inline-block shrink-0 rounded-full bg-cover bg-center"
        style={{ width: size, height: size, backgroundImage: `url(${url})` }}
      />
    );
  }
  const fontSize = Math.max(11, Math.round(size * 0.4));
  return (
    <span
      aria-hidden="true"
      className="bg-pool-blue font-display text-paper inline-flex shrink-0 items-center justify-center rounded-full leading-none font-extrabold"
      style={{ width: size, height: size, fontSize: `${fontSize}px` }}
    >
      {getInitials(name) || "?"}
    </span>
  );
}

export function PlayersTable({ players }: PlayersTableProps) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return players;
    return players.filter(
      (p) => p.full_name.toLowerCase().includes(q) || p.currentTeam?.toLowerCase().includes(q),
    );
  }, [players, search]);

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
      <Input
        type="search"
        placeholder="Buscar por nombre o equipo"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <div className="sm:hidden">
        <ul className="flex flex-col gap-2">
          {filtered.map((p) => (
            <li
              key={p.id}
              className="border-ink-300 bg-paper-card shadow-elev-1 flex items-center gap-3 rounded-md border p-3"
            >
              <Avatar name={p.full_name} url={p.photo_url} size={48} />
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
              <span
                className={cn(
                  "inline-flex h-7 shrink-0 items-center rounded-full px-2 text-xs font-semibold",
                  p.license_active
                    ? "bg-success/15 text-success"
                    : "border-ink-300 text-ink-600 border",
                )}
              >
                {p.license_active ? "OK" : "Sin lic."}
              </span>
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
                <span className="sr-only">Licencia</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.id} className="text-base">
                <td className="border-ink-300 border-b px-3 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar name={p.full_name} url={p.photo_url} />
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
                  <span
                    className={cn(
                      "inline-flex h-6 items-center rounded-full px-2 text-xs font-semibold",
                      p.license_active
                        ? "bg-success/15 text-success"
                        : "border-ink-300 text-ink-600 border",
                    )}
                  >
                    {p.license_active ? "Licencia OK" : "Sin licencia"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-ink-600 text-xs">
        {filtered.length} de {players.length} jugadores
      </p>
    </div>
  );
}
