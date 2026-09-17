"use client";

import Link from "next/link";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { Edit3, EyeOff, Power, PowerOff, Search, UsersRound } from "lucide-react";
import { useState, useTransition } from "react";

import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
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
  school_enrolled: boolean;
  school_payment_paid: boolean;
  is_active: boolean;
  currentTeam: string | null;
  categoryLabel: string;
}

type PlayersTableProps = {
  players: PlayerRow[];
  teams: Array<{ id: string; label: string }>;
  total: number;
  totalPages: number;
  filters: {
    page: number;
    query: string;
    status: "active" | "inactive" | "all";
    teamId: string;
  };
};

function queryForPage(filters: PlayersTableProps["filters"], page: number): string {
  const params = new URLSearchParams();
  if (filters.query) params.set("query", filters.query);
  if (filters.status !== "active") params.set("status", filters.status);
  if (filters.teamId) params.set("team", filters.teamId);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/admin/players?${query}` : "/admin/players";
}

function playerMeta(player: PlayerRow): string {
  return [player.categoryLabel, player.birth_year?.toString()].filter(Boolean).join(" · ");
}

export function PlayersTable({ players, teams, total, totalPages, filters }: PlayersTableProps) {
  const router = useRouter();
  const [editingPlayer, setEditingPlayer] = useState<PlayerRow | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const firstResult = total === 0 ? 0 : (filters.page - 1) * 24 + 1;
  const lastResult = Math.min(filters.page * 24, total);

  function toggleActive(player: PlayerRow) {
    setPendingId(player.id);
    startTransition(async () => {
      try {
        await setPlayerActive({ profile_id: player.id, active: !player.is_active });
        router.refresh();
      } finally {
        setPendingId(null);
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <section className="border-ink-200 bg-paper-card shadow-elev-1 rounded-2xl border p-3 sm:p-4">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <div>
            <h2 className="text-pool-deep font-extrabold">Plantilla</h2>
            <p className="text-ink-600 text-sm">
              Busca y gestiona sin cargar toda la base de jugadores.
            </p>
          </div>
          <p className="text-pool-blue font-mono text-sm font-extrabold tabular-nums">
            {total} {total === 1 ? "jugador" : "jugadores"}
          </p>
        </div>
        <form
          action="/admin/players"
          className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_11rem_11rem_auto]"
        >
          <div className="relative">
            <Search
              className="text-ink-500 pointer-events-none absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2"
              aria-hidden="true"
            />
            <Input
              type="search"
              name="query"
              defaultValue={filters.query}
              placeholder="Buscar por nombre"
              className="pl-10"
            />
          </div>
          <Select name="team" defaultValue={filters.teamId} aria-label="Filtrar por equipo">
            <option value="">Todos los equipos</option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.label}
              </option>
            ))}
          </Select>
          <Select name="status" defaultValue={filters.status} aria-label="Filtrar por estado">
            <option value="active">Activos</option>
            <option value="inactive">Desactivados</option>
            <option value="all">Todos</option>
          </Select>
          <Button type="submit" variant="secondary" className="w-full sm:w-auto">
            Aplicar
          </Button>
        </form>
        {filters.query || filters.teamId || filters.status !== "active" ? (
          <Link
            href="/admin/players"
            className="text-pool-blue hover:text-pool-deep focus-visible:ring-pool-blue mt-3 inline-flex min-h-10 items-center rounded-lg px-1 text-sm font-extrabold focus-visible:ring-2 focus-visible:outline-none"
          >
            Limpiar filtros
          </Link>
        ) : null}
      </section>

      {players.length === 0 ? (
        <EmptyState
          icon={<UsersRound className="h-6 w-6" aria-hidden="true" />}
          title="No hay jugadores con estos filtros"
          description="Cambia los filtros o da de alta a un jugador para continuar."
        />
      ) : (
        <>
          <ul className="grid grid-cols-1 gap-3 md:hidden">
            {players.map((player) => (
              <li key={player.id}>
                <Card className={cn("p-3", !player.is_active && "opacity-70")}>
                  <div className="flex items-center gap-3">
                    <Avatar
                      name={player.full_name}
                      src={player.photo_url}
                      size={48}
                      teamColor="var(--pool-blue)"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-display text-pool-deep truncate text-base font-extrabold">
                          {player.full_name}
                        </h3>
                        {!player.is_active ? (
                          <EyeOff
                            className="text-ink-500 h-4 w-4 shrink-0"
                            aria-label="Desactivado"
                          />
                        ) : null}
                      </div>
                      <p className="text-ink-600 text-xs">{playerMeta(player)}</p>
                      <p className="text-pool-blue mt-1 truncate text-xs font-bold">
                        {player.currentTeam ?? "Sin equipo"}
                      </p>
                    </div>
                  </div>
                  <div className="border-ink-200 mt-3 grid grid-cols-2 gap-2 border-t pt-3">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => setEditingPlayer(player)}
                    >
                      <Edit3 className="h-4 w-4" aria-hidden="true" />
                      Editar ficha
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={player.is_active ? "ghost" : "success"}
                      className={player.is_active ? "text-goggle-red" : undefined}
                      disabled={pendingId === player.id}
                      onClick={() => toggleActive(player)}
                    >
                      {player.is_active ? (
                        <PowerOff className="h-4 w-4" aria-hidden="true" />
                      ) : (
                        <Power className="h-4 w-4" aria-hidden="true" />
                      )}
                      {player.is_active ? "Desactivar" : "Activar"}
                    </Button>
                  </div>
                </Card>
              </li>
            ))}
          </ul>

          <div className="border-ink-200 bg-paper-card shadow-elev-1 hidden overflow-hidden rounded-2xl border md:block">
            <table className="w-full text-left">
              <thead className="bg-pool-foam/70 text-pool-deep text-xs tracking-wide uppercase">
                <tr>
                  <th className="px-4 py-3 font-extrabold">Jugador</th>
                  <th className="px-4 py-3 font-extrabold">Categoría</th>
                  <th className="px-4 py-3 font-extrabold">Equipo actual</th>
                  <th className="px-4 py-3 text-right font-extrabold">
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {players.map((player) => (
                  <tr
                    key={player.id}
                    className={cn(
                      "border-ink-200 border-t",
                      !player.is_active && "bg-ink-100/40 text-ink-600",
                    )}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar
                          name={player.full_name}
                          src={player.photo_url}
                          size={40}
                          teamColor="var(--pool-blue)"
                        />
                        <div>
                          <p className="font-display text-pool-deep font-extrabold">
                            {player.full_name}
                          </p>
                          <p className="text-ink-600 text-xs">
                            {player.cap_number != null ? `Dorsal ${player.cap_number} · ` : ""}
                            {player.birth_year ?? "Sin año"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="text-ink-700 px-4 py-3 text-sm">{player.categoryLabel}</td>
                    <td className="text-ink-700 px-4 py-3 text-sm">
                      {player.currentTeam ?? "Sin equipo"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={() => setEditingPlayer(player)}
                        >
                          <Edit3 className="h-4 w-4" aria-hidden="true" />
                          Editar
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className={player.is_active ? "text-goggle-red" : "text-success"}
                          disabled={pendingId === player.id}
                          onClick={() => toggleActive(player)}
                          aria-label={
                            player.is_active
                              ? `Desactivar a ${player.full_name}`
                              : `Activar a ${player.full_name}`
                          }
                        >
                          {player.is_active ? (
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
        </>
      )}

      {total > 0 ? (
        <nav
          aria-label="Paginación de jugadores"
          className="border-ink-200 bg-paper-card shadow-elev-1 flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-3"
        >
          <p className="text-ink-600 text-sm">
            Mostrando {firstResult}–{lastResult} de {total}
          </p>
          <div className="flex gap-2">
            <Button asChild variant="secondary" size="sm" disabled={filters.page <= 1}>
              <Link
                href={queryForPage(filters, filters.page - 1) as Route}
                aria-disabled={filters.page <= 1}
              >
                Anterior
              </Link>
            </Button>
            <span className="text-pool-deep inline-flex min-h-12 items-center px-2 text-sm font-extrabold">
              Página {filters.page} de {totalPages}
            </span>
            <Button asChild variant="secondary" size="sm" disabled={filters.page >= totalPages}>
              <Link
                href={queryForPage(filters, filters.page + 1) as Route}
                aria-disabled={filters.page >= totalPages}
              >
                Siguiente
              </Link>
            </Button>
          </div>
        </nav>
      ) : null}

      {editingPlayer ? (
        <PlayerFormSheet
          key={editingPlayer.id}
          player={editingPlayer}
          open
          onOpenChange={(open) => {
            if (!open) setEditingPlayer(null);
          }}
        />
      ) : null}
    </div>
  );
}
