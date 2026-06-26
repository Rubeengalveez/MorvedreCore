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
      className="inline-flex shrink-0 items-center justify-center rounded-full bg-brand-blue font-display font-extrabold leading-none text-paper"
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
      (p) =>
        p.full_name.toLowerCase().includes(q) ||
        p.currentTeam?.toLowerCase().includes(q),
    );
  }, [players, search]);

  if (players.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-ink-300 bg-paper p-6 text-center">
        <p className="text-base font-semibold text-brand-deep">
          Aún no has dado de alta a ningún jugador.
        </p>
        <p className="mt-1 text-sm text-ink-600">
          Crea el primero con el botón de arriba, o importa una lista desde Excel.
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
      <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <table className="w-full min-w-[520px] border-separate border-spacing-0 text-left">
          <thead>
            <tr className="text-xs uppercase tracking-wider text-ink-600">
              <th className="border-b border-ink-300 px-3 py-2 font-semibold">Jugador</th>
              <th className="border-b border-ink-300 px-3 py-2 font-semibold">Año</th>
              <th className="border-b border-ink-300 px-3 py-2 font-semibold">Categoría</th>
              <th className="border-b border-ink-300 px-3 py-2 font-semibold">Equipo</th>
              <th className="border-b border-ink-300 px-3 py-2 font-semibold text-right">
                <span className="sr-only">Licencia</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.id} className="text-base">
                <td className="border-b border-ink-300 px-3 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar name={p.full_name} url={p.photo_url} />
                    <div className="flex flex-col">
                      <span className="font-display font-bold text-brand-deep">
                        {p.full_name}
                      </span>
                      {p.cap_number != null ? (
                        <span className="font-mono text-xs text-ink-600">
                          Dorsal {p.cap_number}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </td>
                <td className="border-b border-ink-300 px-3 py-3 font-mono text-sm text-ink-600">
                  {p.birth_year ?? "—"}
                </td>
                <td className="border-b border-ink-300 px-3 py-3 text-sm text-ink-600">
                  {p.categoryLabel}
                </td>
                <td className="border-b border-ink-300 px-3 py-3 text-sm text-ink-600">
                  {p.currentTeam ?? (
                    <span className="italic text-ink-600/70">Sin equipo</span>
                  )}
                </td>
                <td className="border-b border-ink-300 px-3 py-3 text-right">
                  <span
                    className={cn(
                      "inline-flex h-6 items-center rounded-full px-2 text-xs font-semibold",
                      p.license_active
                        ? "bg-success/15 text-success"
                        : "border border-ink-300 text-ink-600",
                    )}
                  >
                    {p.license_active ? "Licencia OK" : "Sin licencia"}
                  </span>
                </td>
              </tr>
            ))}
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-3 py-6 text-center text-sm italic text-ink-600"
                >
                  No hay coincidencias.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-ink-600">
        {filtered.length} de {players.length} jugadores
      </p>
    </div>
  );
}
